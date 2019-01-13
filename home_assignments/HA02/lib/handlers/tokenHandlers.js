//----------------------------------------------------------------------------------------------------
// Request handlers for mantaining tokens
//----------------------------------------------------------------------------------------------------

// dependencies
const _validator = require("../validator");
const _helpers = require("../helpers");
const _data = require("../data");

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
    _data.read('users', input.eMail, (error, userData) => {
      if (!error && userData) {
        // hash the password and compare it to the password stored in the user object
        hashedPassword = _helpers.hash(input.password);
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
          callback(400, { 'Error': "The password provided did not matched the specified user\'s strored"});
        };
      } else {
        callback(400, { 'Error': 'Could not find the specified user'});
      };
    });

  } else {
    callback(400, {
      "Errors": input._errors
    });
  };
};

// Tokens - GET
// Required data: id
// Optional data: none
lib.get = (data, callback) => {
  // check that id is valid
  const input = _validator.validate("id", data.queryStringObject);
  if (!input.hasErrors()) {
    _data.read('tokens', input.id, (error, tokenObject) => {
      if (!error && tokenObject) {
        callback(200, tokenObject);
      } else {
        callback(404, { 'Error': 'No tokens found!'});
      };
    })
  } else {
    callback(400, {
      "Errors": input._errors
    });
  };
};

module.exports = tokens;
