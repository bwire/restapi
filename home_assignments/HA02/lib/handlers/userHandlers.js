// ----------------------------------------------------------------------------------------------------
// Request handlers for mantaining users
// ----------------------------------------------------------------------------------------------------
'use strict'

// dependencies
const _validator = require('../validator')
const _data = require('../data')
const _helpers = require('../helpers')
const _rCodes = require('../responseCodes')

// main container
const lib = {}

// main dispatcher function
async function users (data) {
  if (_validator.acceptableMethods.indexOf(data.method) !== -1) {
    return await lib[data.method](data)
  }
}

// USERS - POST
// Requested data: password, firstName, lastName, eMail, address
// Optional data: none
lib.post = async (data) => {
  try {
    // validtate necessary payload fields
    const input = _validator.validate('password, firstName, lastName, eMail, address', data.payload)
    if (input.hasErrors()) {
      return _helpers.resultify(_rCodes.badRequest, { 'Errors': input._errors })
    }

    // make sure that the user doesn't already exist
    let userData = await _data.read('users', input.eMail)
    if (userData) {
      return _helpers.resultify(_rCodes.unauthorized, {'Error': 'The user already exists'})
    }

    // hash the password
    const hashedPassword = _helpers.hash(input.password)
    if (!hashedPassword) {
      return _helpers.resultify(_rCodes.serverError, {'Error': 'Could not hash the password'})
    }

    // create the user object
    var userObject = {
      'password': hashedPassword,
      'firstName': input.firstName,
      'lastName': input.lastName,
      'eMail': input.eMail,
      'address': input.address
    }
    // store the user
    userData = await _data.create('users', input.eMail, userObject)
    // remove hashed password form the user object before return it to the requester
    delete userData.password

    return _helpers.resultify(_rCodes.OK, userData)
  } catch (e) {
    console.log(e)
    return _helpers.resultify(_rCodes.serverError, {'Error': 'Could not create a new user'})
  }
}

// USERS - GET
// Requested data: eMail
// Optional data: none
lib.get = async (data) => {
  // validate eMail address
  const input = _validator.validate('eMail', data.queryStringObject)
  if (!input.eMail) {
    return _helpers.resultify(_rCodes.badRequest, {'Errors': input._errors})
  }

  // verify that the given token corresponds to the eMail
  const tokenIsValid = await _validator.verifyToken(data.headers, input.eMail)
  if (!tokenIsValid) {
    return _helpers.resultify(_rCodes.forbidden, {'Error': 'Missing required token in the header, or the token is not valid'})
  }

  const userData = await _data.read('users', input.eMail)
  if (userData) {
    // remove hashed password form the user object before return it to the requester
    delete userData.password
    return _helpers.resultify(_rCodes.OK, userData)
  } else {
    return _helpers.resultify(_rCodes.notFound, {'Errors': 'No user found!'})
  }
}

// USERS - PUT
// Requested data: eMail
// Optional data: password, firstName, lastName, address (at least one must be specified)
lib.put = async (data) => {
  try {
    // array of possible fields
    const fields = ['password', 'firstName', 'lastName', 'address']
      .filter((v, _, __) => data.payload.hasOwnProperty(v))
    // at least one field presents in the payload
    if (fields.length === 0) {
      return _helpers.resultify(_rCodes.badRequest, {'Errors': 'At least one field should be provided'})
    }
    fields.push('eMail')

    // validate fields
    const input = _validator.validate(fields.join(', '), data.payload)
    if (input.hasErrors()) {
      return _helpers.resultify(_rCodes.badRequest, {'Errors': input._errors})
    }

    // verify that the given token corresponds to the eMail
    const tokenIsValid = await _validator.verifyToken(data.headers, input.eMail)
    if (!tokenIsValid) {
      return _helpers.resultify(_rCodes.forbidden, {'Error': 'Missing required token in the header, or the token is not valid'})
    }

    // Look up the user
    const userData = await _data.read('users', input.eMail)
    if (!userData) {
      return _helpers.resultify(_rCodes.notFound, {'Errors': 'User not found'})
    }

    // update necessary fields
    if (input.firstName) {
      userData.firstName = input.firstName
    }
    if (input.lastName) {
      userData.lastName = input.lastName
    }
    if (input.address) {
      userData.address = input.address
    }
    if (input.password) {
      userData.password = _helpers.hash(input.password)
    }

    // store updated data
    await _data.update('users', input.eMail, userData)
    delete userData.password
    return _helpers.resultify(_rCodes.OK, userData)
  } catch (e) {
    _helpers.resultify(_rCodes.serverError, {'Error': 'Could not update the user'})
  }
}

// USERS - DELETE
// Requested data: eMail
// Optional data: none
lib.delete = async (data) => {
  try {
    // validatate eMail address
    const input = _validator.validate('eMail', data.queryStringObject)
    if (!input.eMail) {
      return _helpers.resultify(_rCodes.badRequest, {'Errors': input._errors})
    }

    // verify that the given token corresponds to the eMail
    const tokenIsValid = await _validator.verifyToken(data.headers, input.eMail)
    if (!tokenIsValid) {
      return _helpers.resultify(_rCodes.unauthorized, {'Error': 'Missing required token in the header, or the token is not valid'})
    }

    // check if user exists
    const userData = await _data.read('users', input.eMail)
    if (!userData) {
      return _helpers.resultify(_rCodes.notFound, {'Errors': 'No user found'})
    }

    await _data.delete('users', input.eMail)
    return _helpers.resultify(_rCodes.OK)
  } catch (e) {
    _helpers.resultify(_rCodes.serverError, {'Error': 'Could not delete the user!'})
  }
}

module.exports = users
