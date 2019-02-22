//----------------------------------------------------------------------------------------------------
// Request handlers for mantaining tokens
//----------------------------------------------------------------------------------------------------
'use strict';

// dependencies
const _validator = require("../validator");
const _helpers = require("../helpers");
const _data = require("../data");
const _rCodes = require("../responseCodes");

// main container
const lib = {};

// main dispatcher function
function tokens(data, callback) {
  if (_validator.acceptableMethods.indexOf(data.method) != -1) {
    lib[data.method](data, callback);
  }
}

// Tokens - POST
// Required data: eMail, password
// Optional data: none
lib.post = (data, callback) => {
  // validtate necessary payload fields
  const input = _validator.validate("password, eMail", data.payload);
  if (!input.hasErrors()) {
    // lookup the user who matches the eMail
    _data.readAsync('users', input.eMail, "Could not find specifies user!")
      .then(userData => {
        // hash the password and compare it to the password stored in the user object
        const hashedPassword = _helpers.hash(input.password);
        if (hashedPassword == userData.password) {
          // Create a new token with a random name. Set expiration date 1 hour in the future.
          const tokenId = _helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            'eMail': input.eMail,
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
          callback(400, { 'Error': "The password provided did not matched the specified user\'s stored"});
        };   
      })
      .catch(e => callback(_rCodes.notFound, e)); 
  } else {
    callback(400, { "Errors": input._errors });
  };
};

// Tokens - GET
// Required data: id
// Optional data: none
lib.get = (data, callback) => {
  // check that id is valid
  const input = _validator.validate("id", data.queryStringObject);
  if (!input.hasErrors()) {
    _data.readAsync('tokens', input.id, 'No token found!')
      .then(tokenObject => {
        callback(200, tokenObject)
      })
      .catch(e => callback(_rCodes.notFound, e));
  } else {
    callback(400, { "Errors": input._errors });
  };
};

// Tokens - PUT
// Required data: id, extend
// Optional data: none
lib.put = (data, callback) => {
  // validtate necessary payload fields
  const input = _validator.validate("id, extend", data.payload);
  if (!input.hasErrors()) {
    _data.readAsync('tokens', input.id, 'Specified token does not exist!')
      .then(tokenObject => {
        // Check to make sure the token has not already expired
        if (tokenObject.expires > Date.now()) {
          // set the expiration an hour from now
          tokenObject.expires += Date.now() + 1000 * 60 * 60;
          // Store updated data to disk
          _data.update('tokens', input.id, tokenObject, (error) => {
            if (!error) {
              callback(200, tokenObject);
            } else {
              callback(500, { "Error": "Could not update the token\'s expiration"});
            }
          });
        } else {
          callback(400, { 'Error': 'The token has already expired and cannot be restored!'});  
        }  
      })
      .catch(e => callback(_rCodes.notFound, e)); 
  } else {
    callback(400, {"Errors": input._errors});
  }
};

// Tokens - DELETE
// Requested data: id
// Optional data: none
lib.delete = (data, callback) => {
  // validtate necessary payload fields
  const input = _validator.validate("id", data.queryStringObject);
  if (!input.hasErrors()) {
    _data.readAsync('tokens', input.id, "No token found!")
      .then(data => {
        _data.delete('tokens', data.id, (error) => {
          if (!error) {
            callback(200);
          } else {
            callback(500, { "Error": "Could not delete specified token" });
          }
        }); 
      })
      .catch(e => callback(404, e));
  } else {
    callback(_rCodes.notFound, { 'Error': input._errors });
  };
};

module.exports = tokens;
