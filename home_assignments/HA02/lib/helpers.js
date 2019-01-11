/*
 * Helper functions for various tasks
 */

// dependencies
const crypto = require("crypto");

const config = require('../config');


const lib = {};

// cretae the SHA256 hash
lib.hash = function(str) {
  if (typeof (str) == 'string' && str.length > 0) {
    return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
  } else {
    return false;
  }
};

// parse a JSON string to an object in all cases without throwing
lib.parseJSONToObject = function(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return {};
  }
};

module.exports = lib;
