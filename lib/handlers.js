/*
 * Request handlers
 */
'ue strict';

// dependencies
const _data = require('./data');
const _helpers = require('./helpers');
const config = require('./config');

// request methods to deal with
const acceptableMethods = ['post', 'get', 'put', 'delete'];

// _helpers
function checkData(field, data) {
  if (['firstName', 'lastName', 'password', 'url'].indexOf(field) > -1) {
    return typeof(data) == 'string' && data.trim().length > 0 ? data.trim() : false;  
  } else if (field == 'phone') {
    return typeof(data) == 'string' && data.trim().length == 10 ? data.trim() : false;
  } else if (field == 'id') {
    return typeof(data) == 'string' && data.trim().length == 20 ? data.trim() : false;
  } else if (field == 'token') {
    return typeof(data) == 'string' ? data.trim() : false;
  } else if (field == 'tosAgreement' || field == 'extend') {
    return typeof(data) == 'boolean' && data == true ? true : false; 
  } else if (field == 'protocol') {
    return typeof(data) == 'string' && ['http', 'https'].indexOf(data) > -1 ? data : false;
  } else if (field == 'method') {
    return typeof(data) == 'string' && acceptableMethods.indexOf(data) > -1 ? data : false;
  } else if (field == 'successCodes') {
    return typeof(data) == 'object' && data instanceof Array && data.length > 0 ? data : false;
  } else if (field == 'timeoutSeconds') {
    return typeof(data) == 'number' && data % 1 === 0 && data >= 1 && data <= 5 ? data : false;
  } else {
    return false;
  }
};

const handlers = {};

//----------------------------------------------------------------------------------------------------
// HTML API handlers
//----------------------------------------------------------------------------------------------------

// index handler
handlers.index = function(data, callback) {
  // reject any request that isn't GET
  if (data.method == 'get') {
    // Read in a template as a string
    _helpers.getTemplate('index', (error, htmlString) => {
      if (!error && htmlString) {
        callback(200, htmlString, 'html');
      } else {
        callback(500, undefined, 'html');
      }
    });
  } else {
    callback(405, undefined, 'html');
  }
};

//----------------------------------------------------------------------------------------------------
// Users
//----------------------------------------------------------------------------------------------------
handlers.users = function (data, callback) {
 if (acceptableMethods.indexOf(data.method) != -1) {
  handlers._users[data.method](data, callback);
 };
};

// Container for the users submethods
handlers._users = {};

// Requested data: firstName. lastName, phone, address, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
 // check that all requires fields are filled out
 const firstName = checkData('firstName', data.payload.firstName);
 const lastName = checkData('lastName', data.payload.lastName);
 const phone = checkData('phone', data.payload.phone);
 const password = checkData('password', data.payload.password);
 const tosAgreement = checkData('tosAgreement', data.payload.tosAgreement);

 if (firstName && lastName && phone && password && tosAgreement) {
  // make sure that the user doesn't already exist
  _data.read('users', phone, (error, data) => {
    if (error) {
      // hash the password
      var hashedPassword = _helpers.hash(password);

      if (hashedPassword) {
        // cretae the user object
        var userObject = {
         'firstName': firstName,
         'lastName': lastName,
         'phone': phone,
         'password': hashedPassword,
         'tosAgreement': true
        };

        // store the user
        _data.create('users', phone, userObject, (error) => {
          if (!error) {
            callback(200);
          } else {
            console.log(error);
            callback(500, { 'Error': 'Could not create a new user' });
          }
        });
      } else {
        callback(500, { 'Error': 'Could not hash the password' });
      };
    } else {
      callback(500, {'Error': 'A user with that phone number already exist' });
    }; 
  });
 } else {
  callback(400, {'Error': 'Missing required fields' });
 }
};

// Requested data: phone
// Optional data: none
handlers._users.get = (data, callback) => {
  // check if the phone number provided is valid
  const phone = checkData('phone', data.queryStringObject.phone);
  if (phone) {
    // get the token from the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    // verify that the given token corresponds to the phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        _data.read('users', phone, (error, data) => {
          if (!error && data) {
            // remove hashed password form the user obejct before return it to the requester
            delete data.password;
            callback(200, data);
          } else {
            callback(404, { 'Error': 'No user found!'});
          };
        });
      } else {
        callback(403, { "Error": "Missing required token in the header, or the token is not valid"});
      }
    });
  } else {
    callback(400, { 'Error': 'Invalid phone parameter provided'});
  };
};

// Requested data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = (data, callback) => {

  // check if the phone number provided is valid
  const phone = checkData('phone', data.payload.phone);

  // chack for the optional fields
  const firstName = checkData('firstName', data.payload.firstName);
  const lastName = checkData('lastName', data.payload.lastName);
  const password = checkData('password', data.payload.password);

  // error if the phone is invalid
  if (phone) {
    // get the token from the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    // verify that the given token corresponds to the phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // error if nothing is sent to update
        if (firstName || lastName || password) {
          // Look up the user
          _data.read('users', phone, (error, userData) => {
            if (!error && data) {

              // update necessary fields
              if (firstName)
                userData.firstName = firstName;
              if (lastName)
                userData.lastName = lastName;
              if (password)
                userData.password = _helpers.hash(password);

              // store updated data
              _data.update('users', phone, userData, (error) => {
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
        callback(403, { "Error": "Missing required token in the header, or the token is not valid"});
      }
    });  
  } else {
    callback(400, {'Error': 'Phone number provided is invalid' });  
  };
};

// Requested data: phone
// Optional data: none
handlers._users.delete = (data, callback) => {
  // check if the phone number provided is valid
  const phone = checkData('phone', data.queryStringObject.phone);
  if (phone) {
    // get the token from the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    // verify that the given token corresponds to the phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        _data.read('users', phone, (error, data) => {
          if (!error && data) {
            _data.delete('users', phone, (error) => {
              if (!error) {
                // Delete related checks
                checksToDelete = data.checks.length;
                if (checksToDelete) {
                  var deletionErrors = false;
                  data.checks.forEach((checkID) => {
                    _data.delete('checks', checkID, (error) => {
                      if (error) {
                        deletionErrors = true;
                      }
                    });
                  });
                  if (!deletionErrors) {
                    callback(200);
                  } else {
                    callback(500, { "Error": "The error occured when trying to delete all user\'s checks" });
                  }
                }
              } else {
                callback(500, { 'Error': 'Could not delete a user' });
              }
            });
          } else {
            callback(404, { 'Error': 'No user found!'});
          };
        });
      } else {
        callback(403, { "Error": "Missing required token in the header, or the token is not valid"});
      }
    });
  } else {
    callback(400, { 'Error': 'Invalid phone parameter provided'});
  };
};


//----------------------------------------------------------------------------------------------------
// Tokens
//----------------------------------------------------------------------------------------------------

handlers.tokens = (data, callback) => {
 if (acceptableMethods.indexOf(data.method) != -1) {
  handlers._tokens[data.method](data, callback);
 };
};

// Container for the tokens submethods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  const phone = checkData('phone', data.payload.phone);
  const password = checkData('password', data.payload.password);

  if (phone && password) {
    // lookup the user who matches the phone number
    _data.read('users', phone, (error, userData) => {
      if (!error && userData) {
        // hash the password and compare it to the password stored in the user object
        hashedPassword = _helpers.hash(password);

        if (hashedPassword == userData.password) {
          // Create a new token with a random name. Set expiration date 1 hour in the future.
          const tokenId = _helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;

          const tokenObject = {
            'phone': phone,
            'id': tokenId,
            'expires': expires
          };

          // store the token
          _data.create('tokens', tokenId, tokenObject, (error) => {
            if (!error) {
              callback(200, tokenObject);
            } else {
              callback(500, { 'Error': 'Could not create a new token'});
            };
          });
        } else {
          callback(400, { 'Error': "The password provided did not matched the specified user\'s strored"});
        };
      } else {
        callback(400, { 'Error': 'Could not find the specified user'});
      };
    });

  } else {
    callback(400, { 'Error': 'Missing required field(s)' });
  };
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
  // check that id is valid
  const id = checkData('id', data.queryStringObject.id);
  if (id) {
    _data.read('tokens', id, (error, tokenObject) => {
      if (!error && tokenObject) {
        callback(200, tokenObject);
      } else {
        callback(404, { 'Error': 'No tokens found!'});
      };
    })
  } else {
    callback(400, { 'Error': 'Invalid id parameter provided'});
  };
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
  const id = checkData('id', data.payload.id);
  const extend = checkData('extend', data.payload.extend);
  if (id && extend) {
    // lookup the token
    _data.read('tokens', id, (error, tokenObject) => {
      if (!error && tokenObject) {
        // Check to make sure the token has not already expired
        if (tokenObject.expires > Date.now()) {
          // set the expiration an hour from now
          tokenObject.expires += Date.now() + 1000 * 60 * 60;
          // Store updated data to disk
          _data.update('tokens', id, tokenObject, (error) => {
            if (!error) {
              callback(200);
            } else {
              callback(500, { "Error": "Could not update the token\'s expiration"});
            }
          });
        } else {
          callback(400, { 'Error': 'The token has already expired and cannot be restored!'});  
        }
      } else {
        callback(400, { 'Error': 'Specified token does not exist!'}); 
      }
    });
  } else {
    callback(400, { "Error": "Missing required field(s) or firlds are invalid" });
  }
};

// Tokens - delete
// Requested data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  // check that the id is valid
  const id = checkData('id', data.queryStringObject.id);
  if (id) {
    _data.read('tokens', id, (error, data) => {
      if (!error && data) {
        _data.delete('tokens', id, (error) => {
          if (!error) {
            callback(200);
          } else {
            callback(500, { "Error": "Could not delete specified token" });
          }
        });
      } else {
        callback(404, { "Error": "No token found!"});
      };
    });
  } else {
    callback(400, { "Error": "Invalid id parameter provided" });
  };
};

// verify if the given token id is currently valid for the given user
handlers._tokens.verifyToken = (id, phone, callback) => { 
  if (id != false) { 
    _data.read('tokens', id, (error, tokenData) => {
      if (!error && tokenData) {
        // Check that the token is for the current user and it is not expired
        if (tokenData.phone == phone && tokenData.expires > Date.now()) {
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


//----------------------------------------------------------------------------------------------------
// Checks
//----------------------------------------------------------------------------------------------------
handlers.checks = (data, callback) => {
  if (acceptableMethods.indexOf(data.method) != -1) {
    handlers._checks[data.method](data, callback);
 };
};

// Container for the checks submethods
handlers._checks = {};

// Checks - POST
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = (data, callback) => {

  // Validate inputs
  const protocol = checkData('protocol', data.payload.protocol);
  const url = checkData('url', data.payload.url);
  const method = checkData('method', data.payload.method);
  const successCodes = checkData('successCodes', data.payload.successCodes);
  const timeoutSeconds = checkData('timeoutSeconds', data.payload.timeoutSeconds); 

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token from the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Lookup the user by reding the token
    _data.read('tokens', token, (error, tokenData) => {
      if (!error && tokenData) {
        const userPhone = tokenData.phone;
        //lookup the user data
        _data.read('users', userPhone, (error, userData) => {
          if (!error && userData) {
            const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
            // verify that the user has less than the max number of checks per user
            if (userChecks.length < config.maxChecks) {
              // Create a random id for the check
              const checkId = _helpers.createRandomString(20);
              // Create check object and include the user's phone
              const checkObject = {
                'id': checkId,
                'userPhone': userPhone,
                'protocol': protocol,
                'url': url,
                'method': method,
                'successCodes': successCodes,
                'timeoutSeconds': timeoutSeconds
              };
              // save object
              _data.create('checks', checkId, checkObject, (error) => {
                if (!error) {
                  // Add the check id to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);
                  // Save user data
                  _data.update('users', userPhone, userData, (error) => {
                    if (!error) {
                      // Return the data about the new check to the requester
                      callback(200, checkObject);
                    } else {
                      callback(500, { 'Error': 'Cpuld not update the user with the new check'});
                    }
                  });
                } else {
                  callback(500, { "Error": "Could not create the new check" });  
                }
              });
            } else {
              callback(400, { "Error" : "The user already has the maximum number of checks (" + config.maxChecks + ")" });
            }
          } else {
            callback(403, { 'Error': 'No user found by the specified token!'});    
          }
        });
      } else {
        callback(403, { 'Error': 'Specified token does not exist!'});  
      }
    });

  } else {
    callback(400, { "Error": "Missing required field(s) or fields are invalid" });  
  }
};

// Checks - GET
// Required data: id
// Optional data: none
handlers._checks.get = (data, callback) => {
  // check if the id is valid
  const id = checkData('id', data.queryStringObject.id);
  if (id) {
    // Look up the check
    _data.read('checks', id, (error, checkData) => {
      if (!error && checkData) {
        // Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false; 
        // Verify the token is valid and belongs to the user that created the check
        handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {
            callback(200, checkData);
          } else {
            callback(403);
          }
        });
      } else {
        callback(404, { 'Error': 'No checks found!'});
      }
    });
  } else {
    callback(404, { 'Error': 'The id is invalid!'}); 
  }
}

// Checks - PUT
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds
handlers._checks.put = (data, callback) => {
  // check if the id is valid
  const id = checkData('id', data.payload.id);
  if (id) {
    // check to make sure one of the optional fields has been sent
    const protocol = checkData('protocol', data.payload.protocol);
    const url = checkData('url', data.payload.url);
    const method = checkData('method', data.payload.method);
    const successCodes = checkData('successCodes', data.payload.successCodes);
    const timeoutSeconds = checkData('timeoutSeconds', data.payload.timeoutSeconds);

    if (protocol || url || method || successCodes || timeoutSeconds) {
      // Look up the check
      _data.read('checks', id, (error, checkObject) => {
        if (!error && checkObject) {
          // Get the token from the headers
          const token = checkData('token', data.headers.token);

          // verify that the given token corresponds to the phone number
          handlers._tokens.verifyToken(token, checkObject.userPhone, (tokenIsValid) => {
            if (tokenIsValid) {
              // Update the check where necessary
              if (protocol) 
                checkObject.protocol = protocol;
              if (url) 
                checkObject.url = url;
              if (method) 
                checkObject.method = method;
              if (successCodes) 
                checkObject.successCodes = successCodes;
              if (timeoutSeconds) 
                checkObject.timeoutSeconds = timeoutSeconds;

              // Save changes
              _data.update('checks', id, checkObject, (error) => {
                if (!error) {
                  callback(200);
                } else {
                  callback(500, "Could not update the check!");
                }
              });
            } else {
                  
            }
          });
        } else {
          callback(404, { 'Error': 'No checks found by the id provided!'}); 
        }
      }); 
    } else {
      callback(400, { 'Error': 'No field(s) have been provided for update'});  
    }
  } else {
    callback(400, { 'Error': 'The id is invalid!'}); 
  }
}

// Checks - DELETE
// Required data: id
// Optional data: none
handlers._checks.delete = (data, callback) => {
  // check if the id is valid
  const id = checkData('id', data.queryStringObject.id);
  if (id) {
    // Get check data
    _data.read('checks', id, (error, checkObject) => {
      if (!error && checkObject) {
        // Get the token from the headers
        const token = checkData('token', data.headers.token);
        // verify that the given token corresponds to the phone number
        handlers._tokens.verifyToken(token, checkObject.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {
            _data.delete('checks', id, (error) => {
              if (!error) {
                // Look up the user
                _data.read('users', checkObject.userPhone, (error, userData) => {
                  if (!error && userData) {
                    const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];  
                    // Remove data of the deleted check from the list
                    checkPosition = userChecks.indexOf(id);
                    if (checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);
                      _data.update('users', checkObject.userPhone, userData, (error) => {
                        if (!error) {
                          callback(200);
                        } else {
                          callback(500, { "Error": "Could not save the user data after removing the check" });
                        }
                      });
                    } else {
                      callback(500, { "Error": "The check was not in the list of the user\'s checks" }); 
                    }
                  } else {
                    callback(500, { 'Error': 'Could not find the user who created the check!'}); 
                  }
                });
              } else {
                callback(500, { "Error": "Could not delete the check" });
              }
            })
          } else {
            callback(403, { "Error": "The user is not authorized to perform this operation"});
          }
        }); 
      } else {
        callback(404, { 'Error': 'No checks found by the id provided!'});  
      }
    });
  } else {
    callback(400, { 'Error': 'The id is invalid!'}); 
  }; 
}


// simple ping handler
handlers.ping = function(data, callback) {
 callback(200);
};

handlers.hello = function(data, callback) {
 callback(200, {
  requestMethod: data.method,
  responseText: 'Hello, world!'
 });
};

// not found handler
handlers.notFoundHandler = function(data, callback) {
 callback(404);
};

module.exports = handlers;
