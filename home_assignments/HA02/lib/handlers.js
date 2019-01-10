//----------------------------------------------------------------------------------------------------
// Request handlers
//----------------------------------------------------------------------------------------------------

// dependencies
const usersHandlers = require('./handlers/usersHandlers.js');
const tokensHandlers = require('./handlers/tokensHandlers.js');

// handlers container
const handlers = {};

// Main dispatchers
handlers.users = usersHandlers;
handlers.tokens = tokensHandlers;


//----------------------------------------------------------------------------------------------------
// Service
//----------------------------------------------------------------------------------------------------

// not found handler
handlers.notFoundHandler = function(data, callback) {
 callback(404);
};

module.exports = handlers;
