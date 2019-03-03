// ----------------------------------------------------------------------------------------------------------------
// Menu handlers
// ----------------------------------------------------------------------------------------------------------------
'use strict'

// dependencies
const _menu = require('../menu')
const _rCodes = require('../responseCodes')
const _helpers = require('../helpers')

// main container
const lib = {}

// main dispatcher function
function menu (data, callback) {
  if (data.method === 'get') {
    return lib.get(data, callback)
  }
}

// Menu - GET
// Requested data: none
// Optional data: none
//
lib.get = (data) => {
  return _helpers.resultify(_rCodes.OK, _menu)
}

module.exports = menu
