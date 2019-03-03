/*
 * Helper functions for various tasks
 */

// dependencies
const crypto = require('crypto')
const config = require('../config')

const lib = {}

// Create a string of random alphanumeric characters of a given length
lib.createRandomString = (strLength) => {
  strLength = typeof (strLength) === 'number' && strLength > 0 ? strLength : false
  if (strLength) {
    // define all possible characters that could go into a string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'

    var str = ''
    for (var i = 0; i < strLength; i++) {
      // get a random character from possible characters and append it to the final string
      var randomChar = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
      str += randomChar
    };
    return str
  } else {
    return false
  }
}

// cretae the SHA256 hash
lib.hash = function (str) {
  if (typeof (str) === 'string' && str.length > 0) {
    return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex')
  } else {
    return false
  }
}

// parse a JSON string to an object in all cases without throwing
lib.objectify = (str) => {
  try {
    return JSON.parse(str)
  } catch (e) {
    return {}
  }
}

lib.resultify = (code, data = {}) => {
  return {
    'code': code,
    'payload': data
  }
}
module.exports = lib

