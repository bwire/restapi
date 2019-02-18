//----------------------------------------------------------------------------------------------------
// Request handlers for mantaining users
//----------------------------------------------------------------------------------------------------
'use strict';

// dependencies
const _validator = require("../validator");
const _data = require("../data");
const _helpers = require("../helpers");

// main container
const lib = {};

// main dispatcher function
function users(data, callback) {
  if (_validator.acceptableMethods.indexOf(data.method) != -1) {
    lib[data.method](data, callback);
  }
}

// USERS - POST
// Requested data: password, firstName, lastName, eMail, address
// Optional data: none
lib.post = function (data, callback) {
  // validtate necessary payload fields
  const input = _validator.validate("password, firstName, lastName, eMail, address", data.payload);

  if (!input.hasErrors()) {
    // make sure that the user doesn't already exist
    _data.read('users', input.login, (error, data) => {
      // An error generated, when no file with the name of user login found 
      if (error) {
        // hash the password
        const hashedPassword = _helpers.hash(input.password);

        if (hashedPassword) {
          // create the user object
          var userObject = {
            'password': hashedPassword,
            'firstName': input.firstName,
            'lastName': input.lastName,
            'eMail': input.eMail,
            'address': input.address
          };

          // store the user
          _data.create('users', input.eMail, userObject, (error) => {
            if (!error) {
              // remove hashed password form the user object before return it to the requester
              delete userObject.password;
              callback(200, userObject);
            } else {
              console.log(error);
              callback(_rCodes.serverError, { 'Error': 'Could not create a new user'});
            }
          });
        } else {
          callback(_rCodes.serverError, { 'Error': 'Could not hash the password' });
        }
      } else {
        callback(_rCodes.forbidden, { 'Error': 'A user with the specified login already exists' });
      }
    });
  } else {
    callback(_rCodes.badRequest, { "Errors": input._errors });
  }
};

// USERS - GET
// Requested data: eMail
// Optional data: none
lib.get = function (data, callback) {
  // validate eMail address
  var input = _validator.validate("eMail", data.queryStringObject);
  if (input.eMail) {
    // verify that the given token corresponds to the eMail
    _validator.verifyToken(data.headers, input.eMail, (tokenIsValid) => {
      if (tokenIsValid) {
        _data.read('users', input.eMail, (error, userData) => {
          if (!error && userData) {
            // remove hashed password form the user object before return it to the requester
            delete userData.password;
            callback(200, userData);
          } else {
            callback(404, {
              'Error': 'No user with the specified e-mail found!'
            });
          }
        });
      } else {
        callback(403, { "Error": "Missing required token in the header, or the token is not valid"});
      }
    });
  } else {
    callback(400, {
      "Errors": input._errors
    });
  }
};

// USERS - PUT
// Requested data: eMail
// Optional data: password, firstName, lastName, address (at least one must be specified)
lib.put = function(data, callback) {
  // validtate fields
  const input = _validator.validate("eMail, firstName, lastName, address, password", data.payload);
  if (!input.hasErrors()) {
    // verify that the given token corresponds to the eMail
    _validator.verifyToken(data.headers, input.eMail, (tokenIsValid) => {
      if (tokenIsValid) {
        // error if nothing is sent to update
        if (input.firstName || input.lastName || input.address || input.password) {
          // Look up the user
          _data.read('users', input.eMail, (error, userData) => {
            if (!error && userData) {
              // update necessary fields
              if (input.firstName)
                userData.firstName = input.firstName;
              if (input.lastName)
                userData.lastName = input.lastName;
              if (input.address)
                userData.address = input.address;
              if (input.password)
                userData.password = _helpers.hash(input.password);

              // store updated data
              _data.update('users', input.eMail, userData, (error) => {
                if (!error) {
                  delete userData.password;
                  callback(200, userData);
                } else {
                  callback(500, {
                    'Error': 'Could not update the user'
                  });
                }
              });
            } else {
              callback(400, {
                'Error': 'The specified user does not exist'
              });
            }
          });
        } else {
          callback(400, {
            'Error': 'Missing fields to update'
          });
        }
      } else {
        callback(403, { "Error": "Missing required token in the header, or the token is not valid"});  
      }
    });
  } else {
    callback(400, {
      "Errors": input._errors
    });
  }
};

// USERS - DELETE
// Requested data: eMail
// Optional data: none
lib.delete = function(data, callback) {
  // validatate eMail address
  const input = _validator.validate("eMail", data.queryStringObject);
  if (input.eMail) {
    // verify that the given token corresponds to the eMail
    _validator.verifyToken(data.headers, input.eMail, (tokenIsValid) => {
      if (tokenIsValid) {
        _data.read('users', input.eMail, (error, userData) => {
          if (!error && userData) {
            _data.delete('users', input.eMail, (error) => {
              if (!error) {
                callback(200);
              } else {
                callback(500, {
                  'Error': 'Could not delete the user!'
                });
              }
            });
          } else {
            callback(404, {
              'Error': 'No user with the specified e-mail found!'
            });
          }
        });
      } else {
        callback(403, { "Error": "Missing required token in the header, or the token is not valid"});   
      }
    });
  } else {
    callback(400, {
      "Errors": input._errors
    });
  }
};

module.exports = users;