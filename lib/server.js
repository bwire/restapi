//----------------------------------------------------------------------------------------------------------------
// Server related tasks
//----------------------------------------------------------------------------------------------------------------

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');
const _data = require('./data');

// Instantiate the server object
var server = {};

server.httpServer = http.createServer(function(req, res) {
  server.unifiedServer(req, res);
});

server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname, '/../https/key.pm')),
  'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pe'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res) {
  unifiedServer(req, res);
});

server.router = {
 'ping': handlers.ping,
 'hello': handlers.hello,
 'users': handlers.users,
 'tokens': handlers.tokens,
 'checks': handlers.checks
};

server.unifiedServer = function(req, res) {

 // get the url and parse it
 var parsedUrl = url.parse(req.url, true);

 // get the path
 var path = parsedUrl.pathname;
 var trimmedPath = path.replace(/^\/+|\/+$/g, '');

 // determine method
 var method = req.method.toLowerCase();

 // query string
 var queryStringObject = parsedUrl.query;

 // headers
 var headers = req.headers;

 // payloads (if any)
 var decoder = new StringDecoder('utf-8');
 var buffer = '';

 req.on('data', function(data) {
  buffer += decoder.write(data);
 });

 req.on('end', function() {

  buffer += decoder.end();

  // choose the handler the request should go to
  var choosenHandler =
   typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFoundHandler;

  // construct the data to send to the handler
  var data = {
   'trimmedPath': trimmedPath,
   'queryStringObject': queryStringObject,
   'method': method,
   'headers': headers,
   'payload': helpers.parseJSONToObject(buffer)
  };

  // route the request to the handler
  choosenHandler(data, function(code, payload) {
   // Use the status code returned from the handler, or set the default status code to 200
   var statusCode = typeof(code) == 'number' ? code : 200;

   // Use the payload returned from the handler, or set the default payload to an empty object
   var payload = typeof(payload) == 'object' ? payload : {};

   // convert payload to string
   var payloadString = JSON.stringify(payload);

   res.setHeader('Content-Type', 'application/json');

   res.writeHead(statusCode);

   // send the response
   res.end(payloadString);

    // If the response is 200 print in green, otherwise in red
    if (statusCode == 200) {
      debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} ' /' ${trimmedPath} ' ' + ${statusCode}`);
    } else {
      debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} ' /' ${trimmedPath} ' ' + ${statusCode}`);
    }
  });
 });
}

//Init script
server.init = function() {
  // Start http server
  server.httpServer.listen(config.httpPort, function() {
    console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${config.httpPort} with ${config.envName} now...`);
  });

  // Start https server
  server.httpsServer.listen(config.httpsPort, function() {
   console.log('\x1b[35m%s\x1b[0m', `The server is listening on port ${config.httpsPort} with ${config.envName} now...`);
  });
};

module.exports = server;
