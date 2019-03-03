// ----------------------------------------------------------------------------------------------------
// Request handlers
// ----------------------------------------------------------------------------------------------------
'use strict'

// dependencies
const _userHandlers = require('./handlers/userHandlers')
const _tokenHadlers = require('./handlers/tokenHandlers')
const _menuHadlers = require('./handlers/menuHandlers')
const _cartHadlers = require('./handlers/cartHandlers')
const _orderHadlers = require('./handlers/orderHandlers')

const _helpers = require('./helpers')
const _rCodes = require('./responseCodes')

const lib = {}

// main dispatchers
lib.users = _userHandlers
lib.tokens = _tokenHadlers
lib.menu = _menuHadlers
lib.cart = _cartHadlers
lib.orders = _orderHadlers

lib.login = async (data, callback) => {
  if (data.method === 'post') {
    await lib.tokens(data)
  } else {
    return _helpers.resultify(_rCodes.notFound)
  }
}

lib.logout = async (data) => {
  if (data.method === 'delete') {
    // manually write QueryStringObject to satify Delete request for a token
    data.queryStringObject = { 'id': data.headers.token }
    await lib.tokens(data)
  } else {
    return _helpers.resultify(_rCodes.notFound)
  }
}

// ----------------------------------------------------------------------------------------------------
// Service

// simple ping handler
lib.ping = async () => {
  return _helpers.resultify(_rCodes.OK, {})
}

// not found handler
lib.notFoundHandler = async () => {
  return _helpers.resultify(_rCodes.notFound)
}

module.exports = lib
