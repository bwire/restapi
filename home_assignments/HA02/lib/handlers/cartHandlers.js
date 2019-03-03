// ----------------------------------------------------------------------------------------------------------------
// Shopping cart handlers
// ----------------------------------------------------------------------------------------------------------------
'use strict'

// dependencies
const _validator = require('../validator')
const _data = require('../data')
const _rCodes = require('../responseCodes')
const _helpers = require('../helpers')

const lib = {}

// main dispatcher function
async function cart (data) {
  // there is no support of the POST request
  if (_validator.acceptableMethods.indexOf(data.method) !== -1) {
    return await lib[data.method](data)
  }
}

// Cart - POST
// Replace all shopping cart data with the new
// Requested data: array of obects {id: number, qty: number, price: number}
// Optional data: none
lib.post = async (data) => {
  return await updateCart(data)
}

// Cart - GET
// Return all shopping cart items
// Required data: id
// Optional data: none
/* lib.get = async (data) => {
  const cartData = await getCart(data.handlers)
  if (resultCode === _rCodes.OK) {
    callback(resultCode, data.cart)
  } else {
    callback(resultCode, data)
  }
} */

// Cart - PUT
// Requested data: none
// Optional data: none
lib.put = function (data, callback) {
  getCart(data, (resultCode, cartData) => {
    if (resultCode === _rCodes.OK) {
      const input = _validator.validateCartItem(data.payload)
      if (!input.hasErrors()) {
        // data gets added to the existing position in the cart or new position will be created
        const cartItem = cartData.cart.find((elem, idx, arr) => {
          if (elem.menuItemID === input.menuItemID) return elem
        })
        if (cartItem !== undefined) {
          // there is already the item in the cart
          cartItem.qty += input.qty
        } else {
          cartData.cart.push(data.payload)
        }

        _data.update('carts', cartData.eMail, cartData.cart)
          .then(__ => {
            callback(_rCodes.OK, cartData.cart)
          })
          .catch(__ => {
            callback(_rCodes.serverError, {'Error': 'Could not update the shopping cart data'})
          })
      } else {
        callback(_rCodes.badRequest, {'Errors': input._errors})
      }
    } else {
      // pass the error forward
      callback(resultCode, cartData)
    }
  })
}

// Cart - DELETE
// Empty the shopping cart
// Requested data: array of obects {id: number, qty: number, price: number}
// Optional data: none
lib.delete = function (data, callback) {
  // just in case
  data.payload = []
  updateCart(data, callback)
}

// ----------------------------------------------------------------------------------------------------------------
// Service functions

// Create empty shopping cart for the user if it doesn't exist yet or get the existing one
async function getCart (data) {
  // check token for validity
  const tokenData = await _validator.validateToken(data.headers)
  if (!tokenData) {
    return _helpers.resultify(_rCodes.forbidden, {'Error': 'Missing required token in the header, or the token is not valid'})
  }

  // find the cart file by user email
  const cartData = await _data.read('carts', tokenData.eMail)
  if (cartData) {
    return _helpers.resultify(_rCodes.OK, { eMail: tokenData.eMail, cart: cartData })
  }

  // no cart found so create one
  const newData = await _data.create('carts', tokenData.eMail, [])
  return newData
    ? _helpers.resultify(_rCodes.OK, { eMail: tokenData.eMail, cart: cartData })
    : _helpers.resultify(_rCodes.serverError, {'Error': 'Could not save the shopping cart'})
}

// Rewrite all cart data with the payload data.
// If the payload is empty then just clear the cart
async function updateCart (data) {
  try {
    let result = await getCart(data)
    if (result.code !== _rCodes.OK) {
      return _helpers.resultify(result.resultCode, result.payload)
    }

    const items = data.payload
    if (!(typeof (items) === 'object' && items instanceof Array)) {
      return _helpers.resultify(_rCodes.badRequest, 'Invalid input data format')
    }

    if (_validator.valdateCartItems(items).hasErrors()) {
      return _helpers.resultify(_rCodes.badRequest, 'Invalid input data format')
    }

    await _data.update('carts', result.payload.eMail, items)
    return _helpers.resultify(_rCodes.OK, items)
  } catch (e) {
    return _helpers.resultify(_rCodes.serverError, {'Error': 'Could not update the shopping cart data'})
  }
}

module.exports = cart

