//----------------------------------------------------------------------------------------------------
// Tokens request handlers
//----------------------------------------------------------------------------------------------------

// dependencies
const _data = require('../data');
const helpers = require('../helpers');
const validator = require('../validator');

// Main container
_tokens = {};

// Main dispatcher handler to export
tokens = (data, callback) => {
  if (validator.acceptableMethods.indexOf(data.method) != -1) {
    _tokens[data.method](data, callback);
  };
};

// Tokens - post
// Required data: eMail, password
// Optional data: none
_tokens.post = (data, callback) => {
  // validtate necessary payload fields
  const input = validator.validate("password, eMail", data.payload);
  if (!input.hasErrors()) {
    // lookup the user who matches the phone number
    _data.read('users', input.eMail, (error, userData) => {
      if (!error && userData) {
        // hash the password and compare it to the password stored in the user object
        hashedPassword = helpers.hash(input.password);

        if (hashedPassword == userData.password) {
          // Create a new token with a random name. Set expiration date 1 hour in the future.
          const tokenId = helpers.createRandomString(20);
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
          callback(400, { 'Error': "The password provided did not matched the specified user\'s strored"});
        };
      } else {
        callback(400, { 'Error': 'Could not find the specified user'});
      };
    });
  } else {
    callback(400, { "Errors": input._errors });
  };
};

// Tokens - GET
// Required data: id
// Optional data: none
_tokens.get = (data, callback) => {
  // check that id is valid
  const input = validator.validate("id", data.queryStringObject);
  if (input.id) {
    _data.read('tokens', input.id, (error, tokenObject) => {
      if (!error && tokenObject) {
        callback(200, tokenObject);
      } else {
        callback(404, { 'Error': 'No tokens found!'});
      };
    })
  } else {
    callback(400, { "Errors": input._errors });
  };
};

// Tokens - PUT
// Required data: id, extend
// Optional data: none
_tokens.put = (data, callback) => {
  const input = validator.validate("id, extend", data.payload);
  if (!input.hasErrors()) {
    // lookup the token
    _data.read('tokens', input.id, (error, tokenObject) => {
      if (!error && tokenObject) {
        // Check to make sure the token has not already expired
        if (tokenObject.expires > Date.now()) {
          // set the expiration an hour from now
          tokenObject.expires += Date.now() + 1000 * 60 * 60;
          // Store updated data to disk
          _data.update('tokens', input.id, tokenObject, (error) => {
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
    callback(400, { "Errors": input._errors });
  }
};

// Tokens - DELETE
// Requested data: id
// Optional data: none
_tokens.delete = (data, callback) => {
  // check that id is valid
  const input = validator.validate("id", data.queryStringObject);
  if (input.id) {
    _data.read('tokens', input.id, (error, data) => {
      if (!error && data) {
        _data.delete('tokens', input.id, (error) => {
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
    callback(400, { "Errors": input._errors });
  };
};


module.exports = tokens;
