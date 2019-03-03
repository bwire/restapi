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
async function tokens (data) {
  if (_validator.acceptableMethods.indexOf(data.method) !== -1) {
    return lib[data.method](data)
  }
}

// Tokens - POST
// Required data: eMail, password
// Optional data: none
lib.post = async (data) => {
  try {
    // validtate necessary payload fields
    const input = _validator.validate('password, eMail', data.payload)
    if (input.hasErrors()) {
      return _helpers.resultify(_rCodes.badRequest, {'Errors': input._errors})
    }

    // lookup the user who matches the eMail
    const userData = await _data.read('users', input.eMail)
    if (!userData) {
      return _helpers.resultify(_rCodes.unauthorized, {'Error': 'User not found'})
    }

    // hash the password and compare it to the password stored in the user object
    const hashedPassword = _helpers.hash(input.password)
    if (!hashedPassword) {
      return _helpers.resultify(_rCodes.serverError, {'Error': 'Could not hash the password'})
    }

    if (hashedPassword !== userData.password) {
      return _helpers.resultify(_rCodes.unauthorized, {'Error': 'The password provided did not matches the specified user\'s stored'})
    }

    // Create a new token with a random name. Set expiration date 1 hour in the future.
    const tokenId = _helpers.createRandomString(20)
    const expires = Date.now() + 1000 * 60 * 60
    const tokenObject = {
      'eMail': input.eMail,
      'id': tokenId,
      'expires': expires
    }
    // store the token
    const tokenData = await _data.create('tokens', tokenId, tokenObject)
    return _helpers.resultify(_rCodes.OK, tokenData)
  } catch (e) {
    return _helpers.resultify(_rCodes.serverError, {'Error': 'Could not create a new token'})
  }
}

// Tokens - GET
// Required data: id
// Optional data: none
lib.get = async (data) => {
  // check that token ('id' parameter) is valid
  const input = _validator.validate('id', data.queryStringObject)
  if (input.hasErrors()) {
    return _helpers.resultify(_rCodes.invalidData, {'Errors': input._errors})
  }
  const tokenObject = await _data.read('tokens', input.id)
  if (tokenObject) {
    return _helpers.resultify(_rCodes.OK, tokenObject)
  } else {
    return _helpers.resultify(_rCodes.unauthorized, {'Errors': 'Invalid token'})
  }
}

// Tokens - PUT
// Required data: id, extend
// Optional data: none
lib.put = async (data) => {
  try {
    // validtate necessary payload fields
    const input = _validator.validate('id, extend', data.payload)
    if (input.hasErrors()) {
      return _helpers.resultify(_rCodes.badRequest, {'Errors': input._errors})
    }
    const tokenObject = await _data.read('tokens', input.id)
    if (!tokenObject) {
      return _helpers.resultify(_rCodes.unauthorized, {'Errors': 'Invalid token'})
    }

    // Check to make sure the token has not already expired
    if (tokenObject.expires <= Date.now()) {
      return _helpers.resultify(_rCodes.unauthorized, {'Error': 'The token has already expired and cannot be restored!'})
    }

    // set the expiration an hour from now
    tokenObject.expires += Date.now() + 1000 * 60 * 60
    // Store updated data to disk
    await _data.update('tokens', input.id, tokenObject)
    return _helpers.resultify(_rCodes.OK, tokenObject)
  } catch (__) {
    return _helpers.resultify(_rCodes.serverError, {'Error': 'Could not update the token\'s expiration'})
  }
}

// Tokens - DELETE
// Requested data: id
// Optional data: none
lib.delete = async (data) => {
  try {
    // validtate token
    const input = _validator.validate('id', data.queryStringObject)
    if (input.hasErrors()) {
      return _helpers.resultify(_rCodes.notFound, { 'Errors': input._errors })
    }

    const tokenData = await _data.read('tokens', input.id)
    if (!tokenData) {
      return _helpers.resultify(_rCodes.unauthorized, {'Error': 'A token does not exist'})
    }

    await _data.delete('tokens', input.id)
    return _helpers.resultify(_rCodes.OK)
  } catch (__) {
    return _helpers.resultify(_rCodes.serverError, {'Error': 'Could not delete specified token'})
  }
}

module.exports = tokens
