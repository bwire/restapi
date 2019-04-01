// ----------------------------------------------------------------------------------------------------------------
// Shopping cart handlers
// ----------------------------------------------------------------------------------------------------------------
'use strict'

// dependencies
const _config = require('../../config')
const _data = require('../data')
const _validator = require('../validator')
const _helpers = require('../helpers')
const _https = require('https')
const _rCodes = require('../responseCodes')

const _querystring = require('querystring')
const StringDecoder = require('string_decoder').StringDecoder

// main container
const lib = {}

// main dispatcher function
async function orders (data) {
  if (['post', 'get'].indexOf(data.method) !== -1) {
    return lib[data.method](data)
  }
}

// ORDERS - POST
// Requested data: stripeToken
// Optional data: none
lib.post = async (data) => {
  // validtate Stripe token (eMail provided via headers token)
  const input = _validator.validate('stripeToken', data.payload)

  if (input.hasErrors()) {
    return _helpers.resultify(_rCodes.badRequest, { 'Errors': input._errors })
  }
  // validate token
  const tokenData = await _validator.validateToken(data.headers)
  if (!tokenData) {
    return _helpers.resultify(_rCodes.forbidden, {'Error': 'Missing required token in the header, or the token is not valid'})
  }

  // find the cart file by user email
  const cartData = await _data.read('carts', tokenData.eMail)
  if (!cartData) {
    return _helpers.resultify(_rCodes.OK, {'Message': 'Your cart is empty! Nothing to order!'})
  }

  const orderData = {
    'date': _helpers.formatDate(new Date()),
    'eMail': tokenData.eMail,
    'sum': cartData.reduce((acc, val) => acc + val.qty * val.price * 100, 0),
    'items': cartData
  }

  // try to pay
  const payResult = await payOrder(orderData, input.stripeToken)
  if (payResult.code !== _rCodes.OK) {
    return payResult
  }

  // save order information
  // TODO Clear cart!!
  try {
    await _data.create('orders', orderData.eMail + '-' + orderData.date, orderData)
    return orderData
  } catch (e) {
    console.log(e)
    return e
  }
}

// service
async function payOrder (orderData, token) {
  const payloadString = _querystring.stringify({
    'amount': orderData.sum,
    'currency': 'usd',
    'source': token,
    'description': `Order # ${orderData.date} for ${orderData.eMail}`
  })
  const options = {
    'hostname': 'api.stripe.com',
    'path': '/v1/charges',
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-length': Buffer.byteLength(payloadString),
      'Authorization': `Bearer ${_config.stripeKey}`
    }
  }

  try {
    return await asyncRequest(payloadString, options) 
  } catch (e) {
    return e
  }
}

function asyncRequest (payloadString, options) {
  return new Promise((resolve, reject) => {
    const req = _https.request(options, (resp) => {
      const decoder = new StringDecoder('utf-8')
      let buffer = ''

      resp.on('data', (data) => {
        buffer += decoder.write(data)
      })

      resp.on('end', () => {
        buffer += decoder.end()
        if (resp.statusCode === _rCodes.OK) {
          resolve(_helpers.resultify(resp.statusCode))
        } else {
          reject(_helpers.resultify(resp.statusCode, JSON.parse(buffer)))
        }
      })
    })

    req.on('error', function (e) {
      reject(e)
    })

    req.write(payloadString)
    req.end()
  })
}

module.exports = orders
