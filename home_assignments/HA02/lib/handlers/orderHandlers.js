// ----------------------------------------------------------------------------------------------------------------
// Shopping cart handlers
// ----------------------------------------------------------------------------------------------------------------
'use strict'

// dependencies
const _data = require('../data')
const _validator = require('../validator')
const _helpers = require('../helpers')
const _https = require('https')
const _rCodes = require('../responseCodes')
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

  let orderData = {
    token: input.stripeToken,
    eMail: tokenData.eMail,
    sum: cartData.reduce((acc, val) => acc + val.qty * val.price, 0)
  }
  // try to pay
  return await payOrder(orderData)
}

// service
async function payOrder (orderData) {
  const payloadString = JSON.stringify({
    'amount': orderData.sum,
    'currency': 'usd',
    'source': 'sk_test_4eC39HqLyjWDarjtT1zdp7dc',
    'description': `Order # ${orderData.date} for ${orderData.eMail}`
  })

  let options = {
    'protocol': 'https:',
    'host': 'api.stripe.com',
    'path': 'v1/charges',
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/json',
      'Autorization': 'Bearer sk_test_4eC39HqLyjWDarjtT1zdp7dc'
    }
  }

  try {
    let result = await httpRequest(payloadString, options)
    return _helpers.resultify(_rCodes.OK, result)
  } catch (e) {
    return _helpers.resultify(_rCodes.serverError, e)
  }
}

function httpRequest (payloadString, options) {
  return new Promise((resolve, reject) => {
    const req = _https.request(options, (resp) => {
      if (resp.statusCode === _rCodes.OK) {
        const decoder = new StringDecoder('utf-8')
        let buffer = ''

        resp.on('data', (data) => {
          buffer += decoder.write(data)
        })

        resp.on('end', () => {
          buffer += decoder.end()
          resolve(buffer)
        })
      } else {
        reject(new Error('statusCode=' + resp.statusCode))
      }
    })

    req.on('error', function (e) {
      reject(e)
    })

    req.write(payloadString)
    req.end()
  })
}

module.exports = orders
