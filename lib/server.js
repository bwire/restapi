// ----------------------------------------------------------------------------------------------------------------
// Server related stuff
// ----------------------------------------------------------------------------------------------------------------
'use strict'

// Dependencies
const http = require('http')
const https = require('https')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder
const fs = require('fs')
const path = require('path')
const util = require('util')
const debug = util.debuglog('server')

const config = require('./config')
const handlers = require('./handlers')
const _helpers = require('./helpers')

// Instantiate the server object
var server = {}

server.httpServer = http.createServer(function (req, res) {
  server.unifiedServer(req, res)
})

server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname, '/../https/key.pm')),
  'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pe'))
}

server.httpsServer = https.createServer(server.httpsServerOptions, function (req, res) {
  server.unifiedServer(req, res)
})

server.router = {
  '': handlers.index,
  'account/create': handlers.accountCreate,
  'account/edit': handlers.accountEdit,
  'account/deleted': handlers.accountDeleted,
  'session/create': handlers.sessionCreate,
  'session/deleted': handlers.sessionDeleted,
  'checks/all': handlers.checksList,
  'checks/create': handlers.checksCreate,
  'checks/edit': handlers.checksEdit,
  'ping': handlers.ping,
  'hello': handlers.hello,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/checks': handlers.checks,
  'favicon': handlers.favicon,
  'public': handlers.public
}

server.unifiedServer = function (req, res) {
  // get the url and parse it
  var parsedUrl = url.parse(req.url, true)

  // get the path
  var path = parsedUrl.pathname
  var trimmedPath = path.replace(/^\/+|\/+$/g, '')

  // determine method
  var method = req.method.toLowerCase()

  // query string
  var queryStringObject = parsedUrl.query

  // headers
  var headers = req.headers

  // payloads (if any)
  var decoder = new StringDecoder('utf-8')
  var buffer = ''

  req.on('data', function (data) {
    buffer += decoder.write(data)
  })

  req.on('end', function () {
    buffer += decoder.end()

    // choose the handler the request should go to
    var choosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFoundHandler

    // if the request is within the public directory use the public handler instead
    choosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : choosenHandler

    // construct the data to send to the handler
    var data = {
      'trimmedPath': trimmedPath,
      'queryStringObject': queryStringObject,
      'method': method,
      'headers': headers,
      'payload': _helpers.parseJSONToObject(buffer)
    }

    // route the request to the handler
    choosenHandler(data, function (code, payload, contentType) {
      // Determine the type of response (fallback to JSON)
      contentType = typeof (contentType) === 'string' ? contentType : 'json'

      // Use the status code returned from the handler, or set the default status code to 200
      var statusCode = typeof (code) === 'number' ? code : 200

      // return response type that are content-specific
      let payloadString = ''

      if (contentType === 'json') {
        res.setHeader('Content-Type', 'application/json')
        // Use the payload returned from the handler, or set the default payload to an empty object
        const payloadObject = typeof (payload) === 'object' ? payload : {}
        payloadString = JSON.stringify(payloadObject)
      }

      if (contentType === 'html') {
        res.setHeader('Content-Type', 'text/html')
        payloadString = typeof (payload) === 'string' ? payload : ''
      }

      if (contentType === 'favicon') {
        res.setHeader('Content-Type', 'image/x-icon')
        payloadString = typeof (payload) !== 'undefined' ? payload : ''
      }

      if (contentType === 'css') {
        res.setHeader('Content-Type', 'text/css')
        payloadString = typeof (payload) !== 'undefined' ? payload : ''
      }

      if (contentType === 'png') {
        res.setHeader('Content-Type', 'image/png')
        payloadString = typeof (payload) !== 'undefined' ? payload : ''
      }

      if (contentType === 'jpg') {
        res.setHeader('Content-Type', 'image/jpeg')
        payloadString = typeof (payload) !== 'undefined' ? payload : ''
      }

      if (contentType === 'plain') {
        res.setHeader('Content-Type', 'text/plain')
        payloadString = typeof (payload) === 'string' ? payload : ''
      }

      // return response parts that are common to all content types
      res.writeHead(statusCode)
      res.end(payloadString)

      // If the response is 200 print in green, otherwise in red
      if (statusCode === 200) {
        debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} ' /' ${trimmedPath} ' ' + ${statusCode}`)
      } else {
        debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} ' /' ${trimmedPath} ' ' + ${statusCode}`)
      }
    })
  })
}

// Init script
server.init = function () {
  // Start http server
  server.httpServer.listen(config.httpPort, function () {
    console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${config.httpPort} with ${config.envName} now...`)
  })

  // Start https server
  server.httpsServer.listen(config.httpsPort, function () {
    console.log('\x1b[35m%s\x1b[0m', `The server is listening on port ${config.httpsPort} with ${config.envName} now...`)
  })
}

module.exports = server
