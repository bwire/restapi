//----------------------------------------------------------------------------------------------------
// Request handlers
//----------------------------------------------------------------------------------------------------
'use strict';

// dependencies
const _userHandlers = require("./handlers/userHandlers");
const _tokenHadlers = require("./handlers/tokenHandlers");
const _menuHadlers = require("./handlers/menuHandlers");
const _cartHadlers = require("./handlers/cartHandlers");
const _orderHadlers = require("./handlers/orderHandlers");

const lib = {};

// main dispatchers
lib.users = _userHandlers;
lib.tokens = _tokenHadlers;
lib.menu = _menuHadlers;
lib.cart = _cartHadlers;
lib.orders = _orderHadlers;

lib.login = function(data, callback) {
  if (data.method == 'post') {
    lib.tokens(data, callback);
  } else {
    callback(404);
  }
};

lib.logout = function(data, callback) {
  if (data.method == 'delete') {
    // manually write QueryStringObject to satify Delete request for a token
    data.queryStringObject = { 'id': data.headers.token }; 
    lib.tokens(data, callback);
  } else {
    callback(404);
  }
};

//----------------------------------------------------------------------------------------------------
// Service

// simple ping handler
lib.ping = function(data, callback) {
  callback(200);
};

// not found handler
lib.notFoundHandler = function(data, callback) {
  callback(404);
};

module.exports = lib;
