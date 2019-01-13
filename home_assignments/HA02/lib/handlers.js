//----------------------------------------------------------------------------------------------------
// Request handlers
//----------------------------------------------------------------------------------------------------

// dependencies
const _userHandlers = require("./handlers/userHandlers");
const _tokenHadlers = require("./handlers/tokenHandlers")

const lib = {};

// main dispatchers
lib.users = _userHandlers;
lib.tokens = _tokenHadlers;

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
