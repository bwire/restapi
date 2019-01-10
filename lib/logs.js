//----------------------------------------------------------------------------------------------------------------
// Library for logging operations
//----------------------------------------------------------------------------------------------------------------

// Dependencies
const fs = require('fs');
const zlib = require('zlib');
const helpers = require('./helpers');

// main container
var lib = {};

// Append a string to a file. Create a file if it does not exist yet
lib.append = function(file, data, callback) {
  // Open the file for appending
  fs.open(helpers.fileName('logs', '', file), 'a', (error, fileDescriptor) => {
    if (!error && fileDescriptor) {
      // Append to the file and close it
      fs.appendFile(fileDescriptor, data + '\n', (error) => {
        if (!error) {
          fs.close(fileDescriptor, (error) => {
            if (!error) {
              callback(false);
            } else {
              callback('Error closing the file that was being appended');
            }
          })
        } else {
          callback('Could not append data to a file');
        }
      });
    } else {
      callback('Could not open file for appending');  
    }
  });
};

// List all the loga and optionaly incldes the compressed logs
lib.list = function(includeCompressed, callback) {
  fs.readdir(helpers.baseDir('logs'), (error, data) => {
    if (!error && data && data.length > 0) {
      var trimmedNames = [];
      data.forEach((name) => {
        // add the log files
        if (name.indexOf('.log') > -1) {
          trimmedNames.push(name.replace('.log', ''));
        } 
        // add .gz files to the array
        if (includeCompressed && name.indexOf('.gz.b64') > -1) {
          trimmedNames.push(name.replace('.gz.b64', ''));
        }
      });
      callback(false, trimmedNames);
    } else {
      callback(error, data);
    }
  });

};

// Compress one .log file into .gz.b64 file within the same directory
lib.compress = function(logID, newFileID, callback) {
  const destFile = newFileID + '.gz.b64';
  // Read the source file
  fs.readFile(helpers.fileName('logs', '', logID + '.log'), 'utf8', (error, inputString) => {
    if (!error && inputString) {
      // Compress the data using gzip
      zlib.gzip(inputString, (error, buffer) => {
        if (!error && buffer) {
          // Send the data to the destination file
          fs.open(helpers.fileName('logs', '', destFile), 'wx', (error, fileDescriptor) => {
            if (!error && fileDescriptor) {
              // Write to the destination file
              fs.writeFile(fileDescriptor, buffer.toString('base64'), (error) => {
                if (!error) {
                  //Close the destination file 
                  fs.close(fileDescriptor, (error) => {
                    if (!error) {
                      callback(false);
                    } else {
                      callback(error);
                    }
                  });
                } else {
                  callback(error);
                }
              })
            } else {
              callback(error);
            }
          });
        } else {
          callback(error);
        }
      });
    } else {
      callback(error);
    }
  });
};

// Decompess the contents of the .gs.b64 file into a string variable
lib.decompress = function(fileId, callback) {
  const file = fileId + '.gz.b64';
  fs.readFile(helpers.fileName('logs', '', file + '.log'), 'utf8', (error, str) => {
    if (!error && str) {
      // Decompress the data
      const inputBuffer = Buffer.from(str, 'base64');
      zlib.unzip(inputBuffer, (error, outputBuffer) => {
        if (!error && outputBuffer) {
          const str = outputBuffer.toString();
          callback(false, str);
        } else {
          callback(error);
        }
      });
    } else {
      callback(error);
    }
  });
};

// Truncate a log file
lib.truncate = function(logId, callback) {
  fs.truncate(helpers.fileName('logs', '', logId + '.log'), 0, (error) => {
    if (!error) {
      callback(false);
    } else {
      callback(error);
    }
  });
};


module.exports = lib; 