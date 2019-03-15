/*
 * Helper functions for various tasks
 */

// Dependencies
const crypto = require('crypto')
const config = require('./config')
const querystring = require('querystring')
const https = require('https')
const path = require('path')
const fs = require('fs')

// Container
var helpers = {}

// base directory
helpers.baseDir = (baseDir) => {
  return path.join(__dirname, '/../.' + baseDir + '/')
}

// compose file name according to parameters
helpers.fileName = (base, dir, file) => {
  return helpers.baseDir(base) + dir + '/' + file
}

// create the SHA256 hash
helpers.hash = (str) => {
  if (typeof (str) === 'string' && str.length > 0) {
    return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex')
  } else {
    return false
  }
}

// parse a JSON string to an object in all cases without throwing
helpers.parseJSONToObject = (str) => {
  try {
    return JSON.parse(str)
  } catch (e) {
    return {}
  }
}

// Create a string of random alphanumeric characters of a given length
helpers.createRandomString = (strLength) => {
  strLength = typeof (strLength) === 'number' && strLength > 0 ? strLength : false
  if (strLength) {
    // define all possible characters that could go into a string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'

    var str = ''
    for (var i = 0; i < strLength; i++) {
      // get a random character from possible characters and append it to the final string
      var randomChar = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
      str += randomChar
    }
    return str
  } else {
    return false
  }
}

// Send the SMS message via Twilio
helpers.sendTwilioSMS = (phone, msg, callback) => {
  // Validate parameters
  phone = typeof (phone) === 'string' && phone.trim().length === 10 ? phone.trim() : false
  msg = typeof (msg) === 'string' && msg.trim().length > 0 && msg.trim().length < 1600 ? msg.trim() : false
  if (phone && msg) {
    // Configure the request payload
    var payload = {
      'From': config.twilio.fromPhone,
      'To': '+1' + phone,
      'Body': msg
    }
    var stringPayload = querystring.stringify(payload)

    // Configure the request details
    var requestDetails = {
      'protocol': 'https:',
      'hostname': 'api.twilio.com',
      'method': 'POST',
      'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
      'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
      'headers': {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    }

    // Instantiate the request object
    var req = https.request(requestDetails, function (res) {
      // Grab the status of the sent request
      var status = res.statusCode
      // Callback successfully if the request went through
      if (status === 200 || status === 201) {
        callback(false)
      } else {
        callback('Status code returned was ' + status)
      }
    })

    // Bind to the error event so it doesn't get throwned
    req.on('error', (e) => {
      callback(e)
    })

    // Add the payload
    req.write(stringPayload)

    req.end()
  } else {
    callback('Given parameters were missing or invalid')
  }
}

helpers.sendSMS = function (msg) {
  console.log('Message sent!', msg)
}

// get the string content of the template
helpers.getTemplate = function (templateName, data, callback) {
  templateName = typeof (templateName) === 'string' && templateName.length > 0 ? templateName : ''
  data = typeof (data) === 'object' && data !== 'null' ? data : {}

  if (templateName) {
    const templateDir = path.join(__dirname, '/../templates/')
    fs.readFile(templateDir + templateName + '.html', 'utf-8', (error, dataString) => {
      if (!error && dataString && dataString.length > 0) {
        // do interpolation on the string
        const finalString = helpers.interpolate(dataString, data)
        callback(false, finalString)
      } else {
        callback('No template could be found!')
      }
    })
  } else {
    callback('Wrong template name')
  }
}

// Add the universal header and footer to a string
// and pass the provided data object to the header and footer
helpers.addUniversalTemplates = function (str, data, callback) {
  str = typeof (str) === 'string' && str.length > 0 ? str : ''
  data = typeof (data) === 'object' && data !== 'null' ? data : {}
  // Get the header
  helpers.getTemplate('_header', data, (error, headerString) => {
    if (!error && headerString) {
      // Get the footer
      helpers.getTemplate('_footer', data, (error, footerString) => {
        if (!error && footerString) {
          const fullString = headerString + str + footerString
          callback(false, fullString)
        } else {
          callback("Couldn't find the footer template")
        }
      })
    } else {
      callback("Couldn't find the header template")
    }
  })
}

// take  givin string and a data object and find/replace all the keys within it
helpers.interpolate = function (str, data) {
  str = typeof (str) === 'string' && str.length > 0 ? str : ''
  data = typeof (data) === 'object' && data !== 'null' ? data : {}

  // Add template globals to the data object prepending each name with "global"
  for (let keyName in config.templateGlobals) {
    if (config.templateGlobals.hasOwnProperty(keyName)) {
      data['global.' + keyName] = config.templateGlobals[keyName]
    }
  }
  // for each key in the data object, insert its value into the string at the corresponding placeholder
  for (let key in data) {
    if (data.hasOwnProperty(key) && typeof (data[key] === 'string')) {
      const replace = data[key]
      const find = '{' + key + '}'
      str = str.replace(find, replace)
    }
  }
  return str
}

// get the content of a static (public asset)
helpers.getStaticAsset = function (filename, callback) {
  filename = typeof (filename) === 'string' && filename.length > 0 ? filename : false

  if (filename) {
    var publicDir = path.join(__dirname, '/../public/')
    fs.readFile(publicDir + filename, function (err, data) {
      if (!err && data) {
        callback(false, data)
      } else {
        callback('No file could be found')
      }
    })
  } else {
    callback('A valid filename was not specified')
  }
}

module.exports = helpers
