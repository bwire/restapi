/*
 *  Library for storing and editing data
 */
'use strict'

// dependencies

// TODO get rid of this dependency
const fs = require('fs')
const path = require('path')

const _p = require('./promisifier')
const helpers = require('./helpers')

// container for the module to be exported
const lib = {}

// base directory of the data folder
function baseDir () {
  return path.join(__dirname, '/../.data/')
}

// compose file name according to parameters
function fileName (dir, file) {
  return baseDir() + dir + '/' + file + '.json'
}

// write to the file and close it
lib.write = function (fileDescriptor, stringData, callback) {
  fs.writeFile(fileDescriptor, stringData, (error) => {
    if (!error) {
      fs.close(fileDescriptor, (error) => {
        if (error) {
          callback('Error closing file!')
        } else {
          callback(false)
        }
      })
    } else {
      callback('Error writing to a new file!')
    }
  })
}

// write to the file and close it
lib.writeAsync = async (fileDescriptor, stringData) => {
  await _p.writeFile(fileDescriptor, stringData)
  await _p.closeFile(fileDescriptor)
}

// write data to a file
lib.create = async (dir, file, data) => {
  // open the file for writing
  const fileDescriptor = await _p.openFile(fileName(dir, file), 'wx')
  await lib.writeAsync(fileDescriptor, JSON.stringify(data))
  return data
}

// Read data from a file
// errorMessage parameter defines the message used in case of error
lib.read = async (dir, file) => {
  try {
    const data = await _p.readFile(fileName(dir, file), 'utf8')
    return helpers.objectify(data)
  } catch (e) {
    // supress rejection
    return false
  }
}

// update data in the existing file
lib.update = function (dir, file, data, callback) {
  // open the file for writing
  fs.open(fileName(dir, file), 'r+', (error, fileDescriptor) => {
    if (!error && fileDescriptor) {
      // convert data to a string
      const stringData = JSON.stringify(data)
      // truncate data
      fs.truncate(fileDescriptor, (error) => {
        if (!error) {
          // write to the file and close it
          lib.write(fileDescriptor, stringData, callback)
        } else {
          callback('Error truncating file')
        }
      })
    } else {
      callback("Couldn't open the file for updating! It may not exist yet.")
    }
  })
}

// delete a file
lib.delete = function (dir, file, callback) {
  fs.unlink(fileName(dir, file), (error) => {
    if (!error) {
      callback(false)
    } else {
      callback('Error deleting a file')
    }
  })
}

// delete a file
lib.deleteAsync = async (dir, file) => {
  await _p.unlinkFile(fileName(dir, file))
}

// export the module
module.exports = lib
