// ----------------------------------------------------------------------------------------------------
//  Request handlers for mantaining tokens
// ----------------------------------------------------------------------------------------------------
'use strict'

// dependencies
const _validator = require('../validator')
const _helpers = require('../helpers')
const _data = require('../data')
const _rCodes = require('../responseCodes')

// main container
const lib = {}

// main dispatcher function
function tokens (data, callback) {
  if (_validator.acceptableMethods.indexOf(data.method) !== -1) {
    lib[data.method](data, callback)
  }
}

// Tokens - POST
// Required data: eMail, password
// Optional data: none
lib.post = (data, callback) => {
  // validtate necessary payload fields
  const input = _validator.validate('password, eMail', data.payload)
  if (!input.hasErrors()) {
    // lookup the user who matches the eMail
    _data.read('users', input.eMail)
      .then(userData => {
        if (userData) {
          // hash the password and compare it to the password stored in the user object
          const hashedPassword = _helpers.hash(input.password)
          if (hashedPassword === userData.password) {
            // Create a new token with a random name. Set expiration date 1 hour in the future.
            const tokenId = _helpers.createRandomString(20)
            const expires = Date.now() + 1000 * 60 * 60
            const tokenObject = {
              'eMail': input.eMail,
              'id': tokenId,
              'expires': expires
            }

            // store the token
            _data.create('tokens', tokenId, tokenObject, (error) => {
              if (!error) {
                callback(_rCodes.OK, tokenObject)
              } else {
                callback(500, {'Error': 'Could not create a new token'})
              };
            })
          } else {
            callback(400, {'Error': 'The password provided did not matched the specified user\'s stored'})
          }
        } else {
          callback(_rCodes.unauthorized, {'Error': 'Could not find a user by the specified e-mail'})
        }
      })
  } else {
    callback(400, {'Errors': input._errors})
  }
}

// Tokens - GET
// Required data: id
// Optional data: none
lib.get = (data, callback) => {
  // check that token ('id' parameter) is valid
  const input = _validator.validate('id', data.queryStringObject)
  if (!input.hasErrors()) {
    _data.read('tokens', input.id)
      .then(tokenObject => tokenObject
        ? callback(_rCodes.OK, tokenObject) : callback(_rCodes.unauthorized, {'Errors': 'Invalid token'})
      )
  } else {
    callback(_rCodes.invalidData, {'Errors': input._errors})
  }
}

// Tokens - PUT
// Required data: id, extend
// Optional data: none
lib.put = (data, callback) => {
  // validtate necessary payload fields
  const input = _validator.validate('id, extend', data.payload)
  if (!input.hasErrors()) {
    _data.read('tokens', input.id)
      .then(tokenObject => {
        if (tokenObject) {
          // Check to make sure the token has not already expired
          if (tokenObject.expires > Date.now()) {
            // set the expiration an hour from now
            tokenObject.expires += Date.now() + 1000 * 60 * 60
            // Store updated data to disk
            _data.update('tokens', input.id, tokenObject, (error) => {
              if (!error) {
                callback(200, tokenObject)
              } else {
                callback(500, {'Error': 'Could not update the token\'s expiration'})
              }
            })
          } else {
            callback(400, {'Error': 'The token has already expired and cannot be restored!'})
          }
        } else {
          callback(_rCodes.unauthorized, {'Errors': 'Invalid token'})
        }
      })
  } else {
    callback(400, {'Errors': input._errors})
  }
}

// Tokens - DELETE
// Requested data: id
// Optional data: none
lib.delete = (data, callback) => {
  // validtate token
  const input = _validator.validate('id', data.queryStringObject)
  if (!input.hasErrors()) {
    _data.read('tokens', input.id)
      .then(tokenData => {
        if (tokenData) {
          _data.delete('tokens', input.id, (error) => {
            if (!error) {
              callback(200)
            } else {
              callback(500, {'Error': 'Could not delete specified token'})
            }
          })
        } else {
          callback(_rCodes.unauthorized, {'Errors': 'Invalid token'})
        }
      })
      .catch(e => callback(404, e))
  } else {
    callback(_rCodes.notFound, { 'Error': input._errors })
  };
}

module.exports = tokens
