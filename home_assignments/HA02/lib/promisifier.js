/*
 *  Promissifting old-styled functions
 */

// depnedencies
const fs = require('fs');
const { promisify } = require('util');

// main container
const lib = {};

lib.readFile = promisify(fs.readFile); 

module.exports = lib;