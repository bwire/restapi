// primary API

const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const _data = require('./lib/data');

// test sms
helpers.sendTwilioSMS('4158375309', 'Hi, barbedwire', (error) => {
  console.log(error);
})

// start http server
const httpServer = http.createServer(function(req, res) {
 unifiedServer(req, res);
});
httpServer.listen(config.httpPort, function() {
 console.log(`The server is listening on port ${config.httpPort} with ${config.envName} now...`);
});

// start https server
const httpsServerOptions = {
 'key': fs.readFileSync('./https/key.pm'),
 'cert': fs.readFileSync('./https/cert.pe')
};

const httpsServer = https.createServer(httpsServerOptions, function(req, res) {
 unifiedServer(req, res);
});

httpsServer.listen(config.httpsPort, function() {
 console.log(`The server is listening on port ${config.httpsPort} with ${config.envName} now...`);
});

var router = {
 'ping': handlers.ping,
 'hello': handlers.hello,
 'users': handlers.users,
 'tokens': handlers.tokens,
 'checks': handlers.checks
};

var unifiedServer = function(req, res) {

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
   typeof(router[trimmedPath]) !== 'undefined' ?
   router[trimmedPath] : handlers.notFoundHandler;


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

   // log the request path
   console.log(`Returning the response: code ${statusCode}, ${payloadString}`);
  });
 });
}
