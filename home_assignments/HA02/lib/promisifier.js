/*
 *  Promissifting old-styled functions
 */

// depnedencies
const fs = require('fs')
const { promisify } = require('util')

// main container
const lib = {}

lib.readFile = promisify(fs.readFile)
lib.openFile = promisify(fs.open)
lib.closeFile = promisify(fs.close)
lib.writeFile = promisify(fs.writeFile)
lib.unlinkFile = promisify(fs.unlink)

module.exports = lib
