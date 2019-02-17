//----------------------------------------------------------------------------------------------------------------
// Shopping cart handlers
//----------------------------------------------------------------------------------------------------------------
'use strict';

// dependencies
const _data = require("../data");
const _validator = require("../validator");

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
      _data.read('carts', tokenData.eMail, (error, cartData) => {
        if (!error && cartData && cartData.length > 0) {
          let orderData = {
            date: Date.now(),
            eMail: tokenData.eMail,
            items: cartData,
            sum: cartData.reduce((acc, val) => acc + val.qty * val.price, 0)
          };
          payOrder(orderData, (error, paymentData) => {
            if (!error && paymentData) {
              callback(200);
            } else {
              callback(300);
            }
          });
        } else {
          callback(403, { "Error": "Your cart is empty! Nothing to order!"});   
        }
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
  console.log(orderData);
  callback(false);
}

module.exports = orders;
