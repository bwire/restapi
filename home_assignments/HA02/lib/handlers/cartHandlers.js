//----------------------------------------------------------------------------------------------------------------
// Shopping cart handlers
//----------------------------------------------------------------------------------------------------------------
'use strict';

// dependencies
const _validator = require("../validator");
const _data = require("../data");

const lib = {};

// main dispatcher function
function cart(data, callback) {
  // there is no support of the POST request
  if (_validator.acceptableMethods.indexOf(data.method) != -1) {
    lib[data.method](data, callback);
  }
}

// Cart - POST
// Replace all shopping cart data with the new
// Requested data: array of obects {id: number, qty: number, price: number}
// Optional data: none
lib.post = function (data, callback) {   
  updateCart(data, callback);
};

// Cart - GET
// Return all shopping cart items
// Requested data: none
// Optional data: none
lib.get = function (data, callback) { 
  getCart(data, (resultCode, data) => {
    if (resultCode == 200) {
      callback(resultCode, data.cart);
    } else {
      callback(resultCode, data);
    }
  });
};

// Cart - PUT
// Requested data: none
// Optional data: none
lib.put = function (data, callback) {   
  getCart(data, (resultCode, cartData) => {
    if (resultCode == 200) {
      const input = _validator.validate("menuItemID, qty, price", data.payload);
      if (!input.hasErrors()) {
        // data gets added to the existing position in the cart or new position will be created
        const cartItem = cartData.cart.find((elem, idx, arr) => {
          if (elem.menuItemID == input.menuItemID) return elem;
        });
        if (cartItem !== undefined) {
          // there is already the item in the cart
          cartItem.qty += input.qty;
        } else {
          cartData.cart.push(data.payload);
        }

        _data.update('carts', cartData.eMail, cartData.cart, (error) => {
          if (!error) {
            callback(200, cartData.cart);
          } else {
            callback(500, { 'Error': 'Could not update the shopping cart data'});
          }
        });
      } else {
        callback(400, {"Errors": input._errors});
      }
    } else {
      // pass the error forward
      callback(resultCode, data);
    }
  });     
};

// Cart - DELETE
// Empty the shopping cart
// Requested data: array of obects {id: number, qty: number, price: number}
// Optional data: none
lib.delete = function (data, callback) { 
  // just in case 
  data.payload = []; 
  updateCart(data, callback);
};


// service functions

// Create empty shopping cart for the user if it doesn't exist yet or get the existing one
function getCart(data, callback) {
  // check token for validity
  _validator.validateToken(data.headers, (tokenData) => {
    if (tokenData) {
      // find the cart file by user e0mail
      _data.read('carts', tokenData.eMail, (error, cartData) => {
        // no cart found so create one
        if (error) {
          emptyCart = [];
          _data.create('carts', tokenData.eMail, emptyCart, (error) => {
            if (error) {
              callback(500, { 'Error': 'Could not save the shopping cart' });
            } else {
              callback(200, { eMail: tokenData.eMail, cart: emptyCart });
            }
          });
        } else {
          callback(200, { eMail: tokenData.eMail, cart: cartData });
        }
      });
    } else {
      callback(403, { "Error": "Missing required token in the header, or the token is not valid"});
    }
  });
}

// Reqrite all cart data with the payload data.
// If the payload is empty then just clear the cart
function updateCart(data, callback) {
  getCart(data, (resultCode, cartData) => {
    if (resultCode == 200) {
      _validator.validateOrder(data.payload, (isValid, errors) => {
        _data.update('carts', cartData.eMail, data.payload, (error) => {
          if (!error) {
            callback(200, data.payload);
          } else {
            callback(500, { 'Error': 'Could not update the shopping cart data'});
          }
        });
      });
    } else {
      // pass the error forward
      callback(resultCode, data);
    }
  });     
}

module.exports = cart;

