/*
 *  Library for storing and editing data
 */
'use strict'

// dependencies
const _path = require('path')
const _p = require('./promisifier')
const _helpers = require('./helpers')

// container for the module to be exported
const lib = {}

// base directory of the data folder
function baseDir () {
  return _path.join(__dirname, '/../.data/')
}

// compose file name according to parameters
function fileName (dir, file) {
  return baseDir() + dir + '/' + file + '.json'
}

// write to the file and close it
lib.write = async (fileDescriptor, stringData) => {
  await _p.writeFile(fileDescriptor, stringData)
  await _p.closeFile(fileDescriptor)
}

// write data to a file
lib.create = async (dir, file, data) => {
  // open the file for writing
  const fileDescriptor = await _p.openFile(fileName(dir, file), 'wx')
  await lib.write(fileDescriptor, JSON.stringify(data))
  return data
}

// Read data from a file
// errorMessage parameter defines the message used in case of error
lib.read = async (dir, file) => {
  try {
    const data = await _p.readFile(fileName(dir, file), 'utf8')
    return _helpers.objectify(data)
  } catch (e) {
    // supress rejection
    return false
  }
}

// update data in the existing file
lib.update = async (dir, file, data) => {

  console.log('before')
  const fileName = fileName(dir, file)

  console.log('after')

  const fileDescriptor = await _p.openFile(fileName, 'r+')
  await _p.truncateFile(fileName)
  await lib.write(fileDescriptor, JSON.stringify(data))
}

// delete a file
lib.delete = async (dir, file) => {
  await _p.unlinkFile(fileName(dir, file))
}

// export the module
module.exports = lib
