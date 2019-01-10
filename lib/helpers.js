/*
 * Helper functions for various tasks
 */

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');
const path = require('path');

// Container
var helpers = {};

// base directory
helpers.baseDir = (baseDir) => {
  return path.join(__dirname, '/../.' + baseDir + '/');
};

// compose file name according to parameters
helpers.fileName = (base, dir, file) => {
  return helpers.baseDir(base) + dir + '/' + file;
};

// create the SHA256 hash
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

// Send the SMS message via Twilio
helpers.sendTwilioSMS = (phone, msg, callback) => {
  // Validate parameters
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
  msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length < 1600 ? msg.trim() : false;
  if (phone && msg) {
    // Configure the request payload
    var payload = {
      'From' : config.twilio.fromPhone,
      'To' : '+1' + phone,
      'Body' : msg
    };
    var stringPayload = querystring.stringify(payload);

    // Configure the request details
    var requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.twilio.com',
      'method' : 'POST',
      'path' : '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
      'auth' : config.twilio.accountSid + ':' + config.twilio.authToken,
      'headers' : {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate the request object
    var req = https.request(requestDetails,function(res){
        // Grab the status of the sent request
        var status =  res.statusCode;
        // Callback successfully if the request went through
        if(status == 200 || status == 201){
          callback(false);
        } else {
          callback('Status code returned was '+status);
        }
    });

    // Bind to the error event so it doesn't get throwned
    req.on('error', (e) => {
      callback(e);
    });

    // Add the payload
    req.write(stringPayload);

    req.end();

  } else {
    callback("Given parameters were missing or invalid");
  }
};

helpers.sendSMS = function(msg) {
  console.log('Message sent!', msg);
}
module.exports = helpers;