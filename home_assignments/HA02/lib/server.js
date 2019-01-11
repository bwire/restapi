//----------------------------------------------------------------------------------------------------------------
// Server related stuff
//----------------------------------------------------------------------------------------------------------------

const http = require("http");
const https = require("https");
const fs = require("fs");
const url = require("url");
const StringDecoder = require('string_decoder').StringDecoder;
const path = require("path");
const util = require("util");
const debug = util.debuglog("server");

const config = require("../config");
const handlers = require("./handlers");
const helpers = require("./helpers");


// instantiate the server object
const server = {};

const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});


// start https server
const httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname, '/../https/key.pm')),
  'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pe'))
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res);
});

// main router (ADD ROUTES HERE!!)
const router = {
  'ping': handlers.ping,
  'users': handlers.users
};


const unifiedServer = function(req, res) {
  // get url and parse it
  const parsedUrl = url.parse(req.url);

  // get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // determine method
  const method = req.method.toLowerCase();

  // query string
  const queryStringObject = parsedUrl.query;

  // headers
  const headers = req.headers;

  // payload (if any)
  const decoder = new StringDecoder('utf-8');
  var buffer = '';

  // events
  req.on('data', (data) => {
    buffer += decoder.write(data);
  });

  req.on('end', () => {
    buffer = +decoder.end();

    // choose the handler request should go to
    const choosenHandler = typeof (router[trimmedPath]) !== undefined ?
      router[trimmedPath] : handlers.notFoundHandler;

    // construct the data to be send to the handler
    const data = {
      'trimmedPath': trimmedPath,
      'queryStringObject': queryStringObject,
      'method': method,
      'headers': headers,
      'payload': helpers.parseJSONToObject(buffer)
    };

    choosenHandler(data, (code, payload) => {
      // Use the status code returned from the handler, or set the default status code to 200
      const statusCode = typeof (code) === 'number' ? code : 200;

      // Use the payload returned from the handler, or set the default payload to an empty object
      const payloadObject = typeof (payload) === 'object' ? payload : {};

      // convert the payload to string
      const payloadString = JSON.stringify(payloadObject);

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
};

server.init = function() {
  // Start http server
  httpServer.listen(config.httpPort, function() {
    console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${config.httpPort} with ${config.envName} now...`);
  });

  // Start https server
  httpsServer.listen(config.httpsPort, function() {
    console.log('\x1b[35m%s\x1b[0m', `The server is listening on port ${config.httpsPort} with ${config.envName} now...`);
  });
};

module.exports = server;
