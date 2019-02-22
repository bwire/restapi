//----------------------------------------------------------------------------------------------------------------
// Shopping cart handlers
//----------------------------------------------------------------------------------------------------------------
'use strict';

// dependencies
const _data = require("../data");
const _validator = require("../validator");
const _config = require("../../config");
const _https = require("https");
const _rCodes = require("../responseCodes");
const StringDecoder = require('string_decoder').StringDecoder;

// main container
const lib = {};

// main dispatcher function
function orders(data, callback) {
  if (['post', 'get'].indexOf(data.method) != -1) {
    lib[data.method](data, callback);
  }
}

// ORDERS - POST
// Requested data: stripeToken 
// Optional data: none
lib.post = function(data, callback) {
  // validtate Stripe token (eMail provided via headers token)
  const input = _validator.validate("stripeToken", data.payload);
  if (!input.hasErrors()) {
    // validate token
    _validator.validateToken(data.headers, (tokenData) => {
    if (tokenData) {
      // find the cart file by user email
      _data.read('carts', tokenData.eMail)
        .then(cartData => {
          if (cartData && cartData.length > 0) {
            // TODO Is all these data really needed?
            let orderData = {
              token: input.stripeToken,
              date: Date.now(),
              eMail: tokenData.eMail,
              items: cartData,
              sum: cartData.reduce((acc, val) => acc + val.qty * val.price, 0)
            };

            // try to pay 
            payOrder(orderData, (error, paymentData) => {
              const res = !error && paymentData ? 200 : _rCodes.serverError;
              callback(res);
            });
          } else {
            return Promise.reject('');
          }
        })
        .catch(e => {
          callback(403, { "Error": "Your cart is empty! Nothing to order!"}); 
        });
    } else {
      callback(403, { "Error": "Missing required token in the header, or the token is not valid"});
    } 
   });
  } else {
    callback(400, { "Errors": input._errors});
  };     
};

// service
function payOrder(orderData, callback) {

  let payload = {
    'amount': orderData.sum,
    'currency': 'usd',
    'source': 'sk_test_4eC39HqLyjWDarjtT1zdp7dc',
    'description': `Order # ${orderData.date} for ${orderData.eMail}`
  };
  const payloadString = JSON.stringify(payload);

  let options = {
    'protocol': 'https:',
    'host': 'api.stripe.com',
    'path': "v1/charges",
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/json',     
      'Autorization': 'Bearer MY_TEST_KEY' 
    } 
  };

  let req = _https.request(options, (resp) => {
    if (resp.statusCode = _rCodes.OK) {

      const decoder = new StringDecoder('utf-8');
      var buffer = '';

      resp.on('data', (data) => {
        buffer += decoder.write(data);
      });

      resp.on('end', () => {
        buffer += decoder.end();
        callback(false, buffer);
      });

    } else {
      callback(true);
    }
  });

  req.on('error', function (e) {
    callback(true);
  });

  req.write(payloadString);
  req.end();
}

module.exports = orders;