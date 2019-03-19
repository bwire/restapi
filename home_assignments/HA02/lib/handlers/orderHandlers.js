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
  const cartData = _data.read('carts', tokenData.eMail)
  if (!cartData) {
    return _helpers.resultify(_rCodes.OK, {'Message': 'Your cart is empty! Nothing to order!'})
  }

  // TODO Is all these data really needed?
  let orderData = {
    token: input.stripeToken,
    date: Date.now(),
    eMail: tokenData.eMail,
    items: cartData,
    sum: cartData.reduce((acc, val) => acc + val.qty * val.price, 0)
  }
  // try to pay
  payOrder(orderData, (error, paymentData) => {
    const res = !error && paymentData ? 200 : _rCodes.serverError
    return res
  })
}

// service
async function payOrder (orderData, callback) {
  let payload = {
    'amount': orderData.sum,
    'currency': 'usd',
    'source': 'sk_test_4eC39HqLyjWDarjtT1zdp7dc',
    'description': `Order # ${orderData.date} for ${orderData.eMail}`
  }
  const payloadString = JSON.stringify(payload)

  let options = {
    'protocol': 'https:',
    'host': 'api.stripe.com',
    'path': 'v1/charges',
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/json',
      'Autorization': 'Bearer MY_TEST_KEY'
    }
  }

  let req = _https.request(options, (resp) => {
    if (resp.statusCode === _rCodes.OK) {
      const decoder = new StringDecoder('utf-8')
      var buffer = ''

      resp.on('data', (data) => {
        buffer += decoder.write(data)
      })

      resp.on('end', () => {
        buffer += decoder.end()
        callback(false, buffer)
      })
    } else {
      callback(true)
    }
  })

  req.on('error', function (e) {
    callback(true)
  })

  req.write(payloadString)
  req.end()
}

module.exports = orders
