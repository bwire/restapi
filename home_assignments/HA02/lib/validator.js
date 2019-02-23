// ----------------------------------------------------------------------------------------------------
// Functionality for perform necessary validation of input fields
// ----------------------------------------------------------------------------------------------------
'use strict'

// dependencies
const _data = require('./data')
const _menu = require('./menu')

const lib = {}

// request methods to deal with
lib.acceptableMethods = ['get', 'post', 'put', 'delete']

// Input parameters:
// - fields - array of field names to be validated inside object
// - object - structure, containing all the fields (payload or query parameters)
// If all the fields validated successfully - resulting object will contain fields for every input field
// with corresponding values from the input container. If the are any errors - resulting object will
// have an 'errors' array, describing each error occured during validation process
// If 'skipEmpty' argument provided, then no check performed.
lib.validate = function (fieldsString, container) {
  const fields = fieldsString.split(', ')
  // container for the result of validation
  const inputData = {}

  inputData.hasErrors = function () {
    return this._errors
  }

  // Check that 'fields is an array'
  if (typeof (fields) === 'object' && fields instanceof Array) {
    if (fields.length > 0) {
      // perform validation for each field in the input array
      fields.forEach((field) => {
        if (container[field]) {
          // Try to obtain velidation function data
          let functionData = getValidationFunctionData(container, field)
          if (functionData.func) {
            functionData.func.apply(inputData, functionData.params)
          } else {
            // If validation function doesn't exist - report error
            addError(inputData, "No validation procedure found to check '" + field + "' field")
          }
        } else {
          addError(inputData, 'Missing expected input data - ' + field)
        }
      })
    } else {
      addError(inputData, 'No fields information to validate provided')
    }
  } else {
    addError(inputData, 'Invalid input fields description format!')
  }

  return inputData
}

// verify if the given token id is currently valid for the given user
lib.verifyToken = function (headers, eMail, callback) {
  lib.validateToken(headers, (tokenData) => {
    if (tokenData && tokenData.eMail === eMail) {
      callback(true)
    } else {
      callback(false)
    }
  })
}

// verify if the given token id is currently valid
lib.validateToken = function (headers, callback) {
  // get the token from the headers
  const id = typeof (headers.token) === 'string' ? headers.token : false
  if (id !== false) {
    _data.read('tokens', id)
      .then(tokenData => {
        if (tokenData) {
          // Check that the token is for the current user and it is not expired
          if (tokenData.expires > Date.now()) {
            callback(tokenData)
          } else {
            callback(false)
          }
        } else {
          callback(false)
        }
      })
  } else {
    callback(false)
  }
}

// order data validating
lib.validateCartItem = function (item) {
  let input = lib.validate('menuItemID, qty, price', item)
  if (!input.hasErrors()) {
    // name doesn't need to be checked. Just add it to the result
    input.name = item.name
  };
  return input
}

lib.valdateCartItems = function (items) {
  const errors = items.map(lib.validateCartItem)
    .filter(item => item.hasErrors())
    .map(item => item._errors)
  return errors.length === 0
    ? {'hasErrors': () => false, 'data': items} : {'hasErrors': () => true, 'data': errors}
}

// //////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Service functions

// Add new error message into the inner errors array
function addError (inputData, errorMessage) {
  if (!inputData._errors) {
    inputData._errors = []
  }
  inputData._errors.push(errorMessage)
}

// Select necessary functiona and parameters set according to the field being checked
function getValidationFunctionData (container, field) {
  var fnData = {}
  if (field === 'password') {
    fnData.func = validateString
    fnData.params = [field, container[field], undefined, 7, 20]
  } else if (field === 'id') {
    fnData.func = validateString
    fnData.params = [field, container[field], 20]
  } else if (field === 'stripeToken') {
    fnData.func = validateString
    fnData.params = [field, container[field], undefined, 7]
  } else if (field === 'menuItemID') {
    fnData.func = validateItemID
    fnData.params = [field, container[field]]
  } else if (field === 'qty') {
    fnData.func = validateNumber
    fnData.params = [field, container[field], false]
  } else if (field === 'price') {
    fnData.func = validateNumber
    fnData.params = [field, container[field], true]
  } else if (field === 'firstName' || field === 'lastName' || field === 'address') {
    fnData.func = validateString
    fnData.params = [field, container[field]]
  } else if (field === 'eMail') {
    fnData.func = validateEMail
    fnData.params = [field, container[field]]
  } else if (field === 'extend') {
    fnData.func = validateFlag
    fnData.params = [field, container[field]]
  }
  return fnData
}

// //////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Specific validation functions

// Validate string field
function validateString (field, value, len, lbound, rbound) {
  if (typeof (value) === 'string') {
    const trimmedValue = value.trim()
    const dataLength = trimmedValue.length

    // Check for the value not to be empty
    if (dataLength <= 0) {
      addError(this, "The value of the '" + field + "' cannot be empty")
    }
    // Check for the exact length of the value
    if (len && dataLength !== len) {
      addError(this, `The value of the '${field}' field should be exactly ${len} characters length`)
    }
    // Check that the length of the string is no less than the lower bound
    if (lbound && dataLength < lbound) {
      addError(this, `The value of the '${field}' field should be at least ${lbound} characters length`)
    }
    // Check that the length of the string is no more than the upper bound
    if (rbound && dataLength > rbound) {
      addError(this, `The value of the '${field}' field should be no more than ${rbound} characters length`)
    }
  } else {
    addError(this, `Invalid data type for the field '${field}' provided`)
  }

  // if no errors found - create field in the inputData object
  if (!this.hasErrors()) {
    this[field] = value
  }
}

// Validate boolean field (with comparison to the expected value)
function validateNumber (field, value, isPrice) {
  if ((typeof (value) === 'number') && ((isPrice && value.toString().match(/^\d+(\.\d{1,2})?$/)) || !isPrice)) {
    this[field] = value
  } else {
    addError(this, `Invalid data type for the field '${field}' provided`)
  }
}

// Validate boolean field (with comparison to the expected value)
function validateFlag (field, value) {
  if (typeof (value) === 'boolean') {
    this[field] = value
  } else {
    addError(this, `Invalid data type for the field '${field}' provided`)
  };
}

// Validate the e-mail string
// (Borrowed from here: https://flaviocopes.com/how-to-validate-email-address-javascript/)
function validateEMail (field, value) {
  const rgx = /(?!.*\.{2})^([a-z\d!#$%&'*+\-=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+(\.[a-z\d!#$%&'*+\-=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+)*|"((([ \t]*\r\n)?[ \t]+)?([\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*(([ \t]*\r\n)?[ \t]+)?")@(([a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.)+([a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.?$/i
  if (!rgx.test(value.toLowerCase())) {
    addError(this, 'Invalid e-mail address')
  } else {
    // if e-mail is valid - create field in the inputData object
    this[field] = value
  }
}

function validateItemID (field, value) {
  if (typeof (value) === 'number') {
    let fCheck = (elem, idx, arr) => {
      if (elem.id === value) {
        return elem
      }
    }

    if (_menu.find(fCheck)) {
      this[field] = value
    } else {
      addError(this, `Menu item with the specified id (${value}) not found`)
    }
  } else {
    addError(this, 'Invalid menu item id value')
  }
}

module.exports = lib
