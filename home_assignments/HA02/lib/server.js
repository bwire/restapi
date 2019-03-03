// ----------------------------------------------------------------------------------------------------------------
// Server related stuff
// ----------------------------------------------------------------------------------------------------------------
'use strict'

const _http = require('http')
const _https = require('https')
const _fs = require('fs')
const _url = require('url')
const _StringDecoder = require('string_decoder').StringDecoder
const _path = require('path')
const _util = require('util')
const _debug = _util.debuglog('server')

const _config = require('../config')
const _handlers = require('./handlers')
const _helpers = require('./helpers')

// instantiate the server object
const server = {}

const httpServer = _http.createServer((req, res) => {
  unifiedServer(req, res)
})

// start https server
const httpsServerOptions = {
  'key': _fs.readFileSync(_path.join(__dirname, '/../https/key.pm')),
  'cert': _fs.readFileSync(_path.join(__dirname, '/../https/cert.pe'))
}

const httpsServer = _https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res)
})

// main router (ADD ROUTES HERE!!)
const router = {
  'users': _handlers.users,
  'login': _handlers.login,
  'logout': _handlers.logout,
  'tokens': _handlers.tokens,
  'menu': _handlers.menu,
  'cart': _handlers.cart,
  'orders': _handlers.orders,
  'ping': _handlers.ping
}

const unifiedServer = (req, res) => {
  // get url and parse it
  const parsedUrl = _url.parse(req.url, true)

  // get the path
  const path = parsedUrl.pathname
  const trimmedPath = path.replace(/^\/+|\/+$/g, '')

  // determine method
  const method = req.method.toLowerCase()

  // query string
  const queryStringObject = parsedUrl.query

  // headers
  const headers = req.headers

  // payload (if any)
  const decoder = new _StringDecoder('utf-8')
  var buffer = ''

  // events
  req.on('data', (data) => {
    buffer += decoder.write(data)
  })

  req.on('end', async () => {
    buffer += decoder.end()
    // choose the handler request should go to
    const choosenHandler = router[trimmedPath] !== undefined
      ? router[trimmedPath] : _handlers.notFoundHandler

    // construct the data to be send to the handler
    const data = {
      'trimmedPath': trimmedPath,
      'queryStringObject': queryStringObject,
      'method': method,
      'headers': headers,
      'payload': _helpers.objectify(buffer)
    }

    const {code, payload} = await choosenHandler(data)

    // Use the status code returned from the handler, or set the default status code to 200
    const statusCode = typeof (code) === 'number' ? code : 200

    // Use the payload returned from the handler, or set the default payload to an empty object
    const payloadObject = typeof (payload) === 'object' ? payload : {}

    // convert the payload to string
    const payloadString = JSON.stringify(payloadObject)

    res.setHeader('Content-Type', 'application/json')
    res.writeHead(statusCode)

    // send the response
    res.end(payloadString)

    // If the response is 200 print in green, otherwise in red
    if (statusCode === 200) {
      _debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} ' /' ${trimmedPath} ' ' + ${statusCode}`)
    } else {
      _debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} ' /' ${trimmedPath} ' ' + ${statusCode}`)
    }
  })
}

server.init = function () {
  // Start http server
  httpServer.listen(_config.httpPort, function () {
    console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${_config.httpPort} with ${_config.envName} now...`)
  })

  // Start https server
  httpsServer.listen(_config.httpsPort, function () {
    console.log('\x1b[35m%s\x1b[0m', `The server is listening on port ${_config.httpsPort} with ${_config.envName} now...`)
  })
}

module.exports = server

