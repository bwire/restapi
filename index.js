//----------------------------------------------------------------------------------------------------------------
// Primary API
//----------------------------------------------------------------------------------------------------------------

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');

var app = {};

// Init function
app.init = function() {
  // Start the server
  server.init();
  // Start the workers
  workers.init();
};

// Execute initialization
app.init();

module.exports = app;
