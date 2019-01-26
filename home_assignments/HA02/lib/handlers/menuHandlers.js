//----------------------------------------------------------------------------------------------------------------
// Menu handlers
//----------------------------------------------------------------------------------------------------------------
'use strict';

// dependencies
const _menu = require("../menu");
const _validator = require("../validator");

// main container
const lib = {};

// main dispatcher function
function menu(data, callback) {
  if (data.method === 'get') {
    lib.get(data, callback);
  }
}

// Menu - GET
// Requested data: 
// Optional data: none
// This function checks for any!! valid token - without binding to some user! 
lib.get = (data, callback) => { 
  // verify that the given token corresponds to the eMail
  _validator.validateToken(data.headers, (tokenIsValid) => {
    if (tokenIsValid) 
      callback(200, _menu);
    else 
      callback(403, { "Error": "Missing required token in the header, or the token is not valid"});
  });
};

module.exports = menu;
