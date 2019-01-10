//----------------------------------------------------------------------------------------------------
// Helper functions for various tasks
//----------------------------------------------------------------------------------------------------


// Dependencies
const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');

// Container
var helpers = {};

// cretae the SHA256 hash
helpers.hash = (str) => {
  if (typeof(str) == 'string' && str.length > 0) {
    return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
  } else {
    return false;
  };
};

// parse a JSON string to an object in all cases without throwing
helpers.parseJSONToObject = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return {};
  };
};

// Create a string of random alphanumeric characters of a given length
helpers.createRandomString = (strLength) => {
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
  if (strLength) {
    // define all possible characters that could go into a string
    const possibleCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";

    var str = '';
    for (var i = 0; i < strLength; i++) {
      // get a random character from possible characters and append it to the final string
      var randomChar = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      str += randomChar;
    };
    return str;
  } else {
    return false;
  };
};

helpers.sendSMS = () => {
  console.log("Message sent");
};

module.exports = helpers;