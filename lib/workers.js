// ----------------------------------------------------------------------------------------------------------------
// Worker related tasks
// ----------------------------------------------------------------------------------------------------------------

// Dependencies
const https = require('https')
const http = require('http')
const url = require('url')
const util = require('util')
const debug = util.debuglog('workers')

const _data = require('./data')
const _logs = require('./logs')
const helpers = require('./helpers')

// Instantiate the main object
var workers = {}

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = function () {
  // Get all the checks that exist
  _data.list('checks', (error, checks) => {
    if (!error && checks && checks.length > 0) {
      checks.forEach((check) => {
        // Read in the check data
        _data.read('checks', check + '.json', (error, originalCheckData) => {
          if (!error && originalCheckData) {
            // Pass the data to the check validator, and let this function continue or log errrors if needed
            workers.validateCheckData(originalCheckData)
          } else {
            debug('Error reading the check data')
          }
        })
      })
    } else {
      debug('Error: could not find any checks to process!')
    }
  })
}

// Sanity-check the check data
workers.validateCheckData = function (originalCheckData) {
  originalCheckData = typeof (originalCheckData) === 'object' && originalCheckData !== null ? originalCheckData : {}
  originalCheckData.id = typeof (originalCheckData.id) === 'string' && originalCheckData.id.trim().length === 20 ? originalCheckData.id.trim() : false
  originalCheckData.userPhone = typeof (originalCheckData.userPhone) === 'string' && originalCheckData.userPhone.trim().length === 10 ? originalCheckData.userPhone.trim() : false
  originalCheckData.protocol = typeof (originalCheckData.protocol) === 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false
  originalCheckData.url = typeof (originalCheckData.url) === 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false
  originalCheckData.method = typeof (originalCheckData.method) === 'string' && ['get', 'post', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false
  originalCheckData.successCodes = typeof (originalCheckData.successCodes) === 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false
  originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) === 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false

  // Set the key that may not be set (if a worker have never seen this check before)
  originalCheckData.state = typeof (originalCheckData.state) === 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down'
  originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) === 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false

  // If all checks passed, pass the data along to the next step in the process
  if (originalCheckData.id && originalCheckData.userPhone && originalCheckData.protocol &&
    originalCheckData.url && originalCheckData.method && originalCheckData.successCodes && originalCheckData.timeoutSeconds) {
    workers.performCheck(originalCheckData)
  } else {
    debug('Error: One of the checks is not properly formatted. Skipping it')
  }
}

// Perform the check, send the originalCheckData and the outcome of the check process to the next step in the process
workers.performCheck = function (originalCheckData) {
  // Prepare the initial check outcome
  var checkOutcome = {
    'error': false,
    'responseCode': false
  }
  // Mark that the outcome has not been sent yet
  var outcomeSent = false

  // Parse the hostname and the path out of the original check data
  const parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true)
  const hostName = parsedUrl.host
  const path = parsedUrl.path

  // Construct the request
  const requestDetails = {
    'protocol': originalCheckData.protocol + ':',
    'host': hostName,
    'method': originalCheckData.method.toUpperCase(),
    'path': path,
    'timeout': originalCheckData.timeoutSeconds * 1000
  }

  // Instantiate the request object (using the http or https module)
  const moduleToUse = originalCheckData.protocol === 'http' ? http : https
  var req = moduleToUse.request(requestDetails, function (res) {
    // grab the status of the sent request
    const status = res.statusCode
    // Update the outcome and pass the data along
    checkOutcome.responseCode = status
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome)
      outcomeSent = true
    }
  })

  // Bind to the error event so it does not get throwned
  req.on('error', (error) => {
    // Update the outcome and pass the data along
    checkOutcome.error = {
      'error': true,
      'value': error
    }
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome)
      outcomeSent = true
    }
  })

  // Bind to the timeout event
  req.on('timeout', () => {
    // Update the outcome and pass the data along
    checkOutcome.error = {
      'error': true,
      'value': 'timeout'
    }
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome)
      outcomeSent = true
    }
  })

  // End the request
  req.end()
}

// Process the outcome and update the check data as needed
// Trigger an alert to the user if needed
// Special logic for accomodating a check that never been tested before (don't alert on that one)
workers.processCheckOutcome = function (originalCheckData, checkOutcome) {
  // Decide if the check considered up or down
  const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down'
  // Decide if the alert is warranted
  const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state

  // Log the check
  var timeOfCheck = Date.now()
  workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck)

  // Update the check data
  var newCheckData = originalCheckData
  newCheckData.state = state
  newCheckData.lastChecked = timeOfCheck

  // Save the updated data to disk
  _data.update('checks', newCheckData.id + '.json', newCheckData, (error) => {
    if (!error) {
      // Set the updated data to the next phase in the process
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData)
      } else {
        debug('Check outcome has not changed. No alert needed')
      }
    } else {
      debug('Error trying to save updates in the check')
    }
  })
}

// Alert user about the change in their check status
workers.alertUserToStatusChange = function (newCheckData) {
  const msg = 'Your check data for a ' + newCheckData.method.toUpperCase() +
    ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state
  helpers.sendSMS(msg)
}

workers.log = function (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
  // Form the log data
  var checkData = {
    'check': originalCheckData,
    'outcome': checkOutcome,
    'state': state,
    'alert': alertWarranted,
    'time': timeOfCheck
  }
  // Convert data to a string
  var logStringData = JSON.stringify(checkData)

  // Determine the name of the log file
  const logFileName = originalCheckData.id + '.log'
  // Append data to the file
  _logs.append(logFileName, logStringData, (error) => {
    if (!error) {
      debug('Logging to a file succeded')
    } else {
      debug('Logging to a file failed')
    }
  })
}

// Timer to execute the wirker process once per minute
workers.loop = function () {
  setInterval(() => {
    workers.gatherAllChecks()
  }, 1000 * 60)
}

// Rotate (compress the log files)
workers.rotateLogs = function () {
  // List all non-compressed log files
  _logs.list(false, (error, logs) => {
    if (!error && logs && logs.length > 0) {
      logs.forEach((logName) => {
        // Compress the data to a separate file
        const logId = logName.replace('.log', '')
        const newFileId = logId + '-' + Date.now()
        _logs.compress(logId, newFileId, (error) => {
          if (!error) {
            // Truncate the log
            _logs.truncate(logName, (error) => {
              if (!error) {
                debug(`The file ${logId} has been succesfully removed`)
              } else {
                debug('Error truncating the log file', error)
              }
            })
          } else {
            debug('Error compressing one of the log files', error)
          }
        })
      })
    } else {
      debug('No log files to rotate found')
    }
  })
}

// Timer to execute the main checking loop
workers.loop = function () {
  setInterval(() => {
    workers.gatherAllChecks()
  }, 1000 * 60)
}

// Timer to execute the log rotation process once per day
workers.logRotationLoop = function () {
  setInterval(() => {
    workers.rotateLogs()
  }, 1000 * 86400)
}

// Init script
workers.init = function () {
  // send to the console (in yellow)
  console.log('\x1b[33m%s\x1b[0m', 'Background workers are running')
  // Execute all the checks immediately
  workers.gatherAllChecks()
  // Call the loop so checks can continue execute later on
  workers.loop()
  // Compress all the logs immediately
  workers.rotateLogs()
  // Call the compression loop so logs will be compressed later on
  workers.logRotationLoop()
}

module.exports = workers
