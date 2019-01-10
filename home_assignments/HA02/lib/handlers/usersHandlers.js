//----------------------------------------------------------------------------------------------------
// Users request handlers
//----------------------------------------------------------------------------------------------------

// dependencies
const _data = require('../data');
const helpers = require('../helpers');
const validator = require('../validator');

// Main container
_users = {};

// Main dispatcher handler to export
users = (data, callback) => {
  if (validator.acceptableMethods.indexOf(data.method) != -1) {
    _users[data.method](data, callback);
  };
};

// USERS - POST
// Requested data: password, firstName, lastName, eMail, address
// Optional data: none
_users.post = (data, callback) => {

  // validtate necessary payload fields
  const input = validator.validate("password, firstName, lastName, eMail, address", data.payload);

  if (!input.hasErrors()) {
    // make sure that the user doesn't already exist
    _data.read('users', input.eMail, (error, data) => {
      // An error generated, when no file with the name of user login found 
      if (error) {
        // hash the password
        const hashedPassword = helpers.hash(input.password);

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
              callback(200, userObject);
            } else {
              console.log(error);
              callback(500, { 'Error': 'Could not create a new user' });
            }
          });
        } else {
          callback(500, { 'Error': 'Could not hash the password' });
        };
      } else {
        callback(500, {'Error': 'A user with the specified login already exists' });
      }; 
    });
  } else {
    callback(400, {"Errors": input._errors});
  }
};

// USERS - GET
// Requested data: eMail
// Optional data: none_users.get = (data, callback) => {
_users.get = (data, callback) => {
  // validtate eMail address
  var input = validator.validate("eMail", data.queryStringObject);
  if (input.eMail) {
    const eMail = input.eMail;
    // get the token from the headers
    input = validator.validate("token", data.headers);
    if (input.token) {
      // verify that the given token corresponds to the phone number
      validator.verifyToken(input.token, eMail, (tokenIsValid) => {
        if (tokenIsValid) {
          _data.read('users', eMail, (error, userData) => {
            if (!error && userData) {
              // remove hashed password form the user obejct before return it to the requester
              delete userData.password;
              callback(200, userData);
            } else {
              callback(404, { 'Error': 'No user with the specified e-mail found!'});
            };
          });
        } else {
          callback(403, { "Error": "Specified token either invalid or expired" });
        }  
      });    
    } else {
      callback(403, { "Error": "Missing required token in the header, or the token is not valid"});
    }
  } else {
    callback(400, {"Errors": input._errors}); 
  }
};

// USERS - PUT
// Requested data: eMail
// Optional data: firstName, lastName, address, password (at least one must be specified)
_users.put = (data, callback) => {
  // validtate fields
  const input = validator.validate("eMail, firstName, lastName, address, password", data.payload);
  if (!input.hasErrors()) {
    // get the token from the headers
    const headers = validator.validate("token", data.headers);
    if (headers.token) {
      // verify that the given token corresponds to the phone number
      validator.verifyToken(headers.token, input.eMail, (tokenIsValid) => {
        if (tokenIsValid) {
          // error if nothing is sent to update
          if (input.firstName || input.lastName || input.address || input.password) {
            // Look up the user
            _data.read('users', input.eMail, (error, userData) => {
              if (!error && data) {
                // update necessary fields
                if (input.firstName)
                  userData.firstName = input.firstName;
                if (input.lastName)
                  userData.lastName = input.lastName;
                if (input.address)
                  userData.address = input.address;
                if (input.password)
                  userData.password = helpers.hash(input.password);

                // store updated data
                _data.update('users', input.eMail, userData, (error) => {
                  if (!error) {
                    callback(200);
                  } else {
                    callback(500, {'Error': 'Could not update the user' });
                  }
                });
              } else {
                callback(400, { 'Error': 'The specified user does not exist' });
              }
            });
          } else {
            callback(400, {'Error': 'Missing fields to update' });
          }
        } else {
          callback(403, { "Error": "Specified token either invalid or expired" });  
        } 
      });
    } else {
      callback(403, { "Error": "Missing required token in the header, or the token is not valid"});  
    }
  } else {
    callback(400, {"Errors": input._errors});  
  };
};

// USERS - DELETE
// Requested data: eMail
// Optional data: none
_users.delete = (data, callback) => {
  // validtate eMail address
  const input = validator.validate("eMail", data.queryStringObject);
  if (input.eMail) {
    // get the token from the headers
    const headers = validator.validate("token", data.headers);
    if (headers.token) {
      // verify that the given token corresponds to the phone number
      validator.verifyToken(headers.token, input.eMail, (tokenIsValid) => {
        if (tokenIsValid) {
          _data.read('users', input.eMail, (error, userData) => {
            if (!error && userData) {
              _data.delete('users', input.eMail, (error) => {
                if (!error) {
                  callback(200);    
                } else {
                  callback(500, { 'Error': 'Could not delete the user!'}); 
                }
              });    
            } else {
              callback(404, { 'Error': 'No user with the specified e-mail found!'});
            }
          });
        } else {
          callback(403, { "Error": "Specified token either invalid or expired" });
        }
      });
    } else {
      callback(403, { "Error": "Missing required token in the header, or the token is not valid"}); 
    }   
  } else {
    callback(400, {"Errors": input._errors});
  };
};

module.exports = users;
