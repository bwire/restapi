//----------------------------------------------------------------------------------------------------
// Functionality for perform necessary validation of input fields
//----------------------------------------------------------------------------------------------------

// Dependencies
const _data = require('./data');

validator = {};

// request methods to deal with
validator.acceptableMethods = ['post', 'get', 'put', 'delete'];

// Input parameters: 
// - fields - array of field names to be validated inside object
// - object - structure, containing all the fields (payload or query parameters)
// If all the fields validated successfully - resulting object will contain fields for every input field 
// with corresponding values from the input container. If the are any errors - resulting object will
// have an 'errors' array, describing each error occured during validation process
// If 'skipEmpty' argument provided, then mo check performed. 
validator.validate = function(fieldsString, container) {
  
  const fields = fieldsString.split(", ");

  // Container for the results of validation
  var inputData = {};
  // Chack for the 'fields' to be an array
  if (typeof(fields) == 'object' && fields instanceof Array) {
    if (fields.length > 0) {
      // perform validation for each field in the input array
      fields.forEach((field) => {
        if (container[field]) {
          // Try to obtain velidation function data
          let functionData = getValidationFunctionData(container, field);
          if (functionData.func) {
            // run validation function in the context of inputData object
            functionData.func.apply(inputData, functionData.params);
          } else {
            // If validation function doesn't exist - report error
            addError(inputData, "No validation procedure found to check '" + field + "' field");
          };
        } 
      });
    } else {
      addError(inputData, 'No fields information to validate provided');
    };
  } else {
    addError(inputData, 'Invalid input fields description format!');
  };

  // Function answering if there were any errors during validation
  inputData.hasErrors = function() {
    return this._errors ? true : false;
  };

  return inputData;
};

// verify if the given token id is currently valid for the given user
validator.verifyToken = (id, eMail, callback) => { 
  if (id != false) { 
    _data.read('tokens', id, (error, tokenData) => {
      if (!error && tokenData) {
        // Check that the token is for the current user and it is not expired
        if (tokenData.eMail == eMail && tokenData.expires > Date.now()) {
          callback(true);
        } else {
          callback(false);
        }
      } else {
        callback(false);
      };
    });
  } else {
    callback(false);
  } 
};


// service functions

// Add new error message into the inner errors array
function addError(inputData, errorMessage) {
  if (!inputData._errors) {
    inputData._errors = [];
  };
  inputData._errors.push(errorMessage); 
};

// Select necessary functiona and parameters set according to the field being checked
function getValidationFunctionData(container, field) {
  var fnData = {};
  if (field == 'password') {
    fnData.func = validateString;
    fnData.params = [field, container[field], , 7, 20];
  } else if (field == 'id' || field == 'token') {
    fnData.func = validateString;
    fnData.params = [field, container[field], 20];
  } else if (field == 'firstName' || field == 'lastName' || field == 'address') {
    fnData.func = validateString;
    fnData.params = [field, container[field]];
  } else if (field == 'eMail') {
    fnData.func = validateEMail;
    fnData.params = [field, container[field]]
  } else if (field == 'extend') {
    fnData.func = validateFlag;
    fnData.params = [field, container[field]]
  };
  return fnData;
};

// Specific validation functions

// Validate string field
function validateString(field, value, len, lbound, rbound) {

  var noErrors = true;

  if (typeof(value) == 'string') {

    const trimmedValue = value.trim();
    const dataLength = trimmedValue.length;

    // Check for the value not to be empty
    if (dataLength <= 0) {
      addError(this, "The value of the '" + field + "' cannot be empty");
      noErrors = false;
    };
    // Check for the exact length of the value
    if (len && dataLength != len) {
      addError(this, "The value of the '" + field + "' field should be exactly " + len + " characters length");
      noErrors = false;
    }
    // Check that the length of the string is no less than the lower bound
    if (lbound && dataLength < lbound) {
      addError(this, "The value of the '" + field + "' field should be at least " + lbound + " characters length");
      noErrors = false;
    };
    // Check that the length of the string is no more than the upper bound
    if (rbound && dataLength > rbound) {
      addError(this, "The value of the '" + field + "' field should be no more than " + rbound + " characters length");
      noErrors = false
    };
  } else {
    addError(this, "Invalid data type for the field '" + field + "' provided");
    noErrors = false;
  }

  // if no errors found - create field in the inputData object
  if (noErrors) {
    this[field] = value;
  };
};

// Validate boolean field (with comparison to the expected value)
function validateFlag(field, value) {
  var noErrors = true;
  if (typeof(value) == 'boolean') {
    this[field] = value;
  } else {
    addError(this, "Invalid data type for the field '" + field + "' provided");
    noErrors = false; 
  };
};

// Validate the e-mail string
// (Borrowed from here: https://flaviocopes.com/how-to-validate-email-address-javascript/)
function validateEMail(field, value) {
  const rgx = /(?!.*\.{2})^([a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+(\.[a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+)*|"((([ \t]*\r\n)?[ \t]+)?([\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*(([ \t]*\r\n)?[ \t]+)?")@(([a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.)+([a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.?$/i;
  if (!rgx.test(value.toLowerCase())) {
    addError(this, "Invalid e-mail address");
  } else {
    // if e-mail is valid - create field in the inputData object
    this[field] = value;
  }
};

module.exports = validator;