//----------------------------------------------------------------------------------------------------
// Request handlers
//----------------------------------------------------------------------------------------------------

// dependencies
const userHandlers = require("./handlers/userHandlers");

const lib = {};

// main dispatchers
lib.users = userHandlers;

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
