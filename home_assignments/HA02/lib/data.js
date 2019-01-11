/*
 *  Library for storing and editing data
 */

// dependencies
const fs = require("fs");
const path = require("path");

// container for the module to be exported
const lib = {};

// base directory of the data folder
function baseDir() {
  return path.join(__dirname, '/../.data/');
}

// compose file name according to parameters
function fileName(dir, file) {
  return baseDir + dir + '/' + file + '.json';
}

// write to the file and close it
lib.write = (fileDescriptor, stringData, callback) => fs.writeFile(fileDescriptor, stringData, (error) => {
  if (!error) {
    fs.close(fileDescriptor, (error) => {
      if (error) {
        callback('Error closing file!');
      } else {
        callback(false);
      }
    });
  } else {
    callback('Error writing to a new file!');
  }
});

// write data to a file
lib.create = (dir, file, data, callback) => {
  // open the file for writing
  fs.open(fileName(dir, file), 'wx', (error, fileDescriptor) => {
    if (!error && fileDescriptor) {
      // convert data to a string
      const stringData = JSON.stringify(data);
      // write to the file and close it
      lib.write(fileDescriptor, stringData, callback);
    } else {
      callback("Couldn't create a new file. It may already exist!");
    }
  });
};

// read data from a file
lib.read = (dir, file, callback) => {
  fs.readFile(fileName(dir, file), 'utf8', (error, data) => {
    callback(error, data);
  });
};

// update data in the existing file
lib.update = (dir, file, data, callback) => {
  // open the file for writing
  fs.open(fileName(dir, file), 'r+', (error, fileDescriptor) => {
    if (!error && fileDescriptor) {
      // convert data to a string
      const stringData = JSON.stringify(data);
      // truncate data
      fs.truncate(fileDescriptor, (error) => {
        if (!error) {
          // write to the file and close it
          lib.write(fileDescriptor, stringData, callback);
        } else {
          callback("Error truncating file");
        }
      });
    } else {
      callback("Couldn't open the file for updating! It may not exist yet.");
    }
  });
};

// delete a file
lib.delete = (dir, file, callback) => {
  fs.unlink(lib.fileName(dir, file), (error) => {
    if (!error) {
      callback(false);
    } else {
      callback('Error deleting a file');
    }
  });
};

// export the module
module.exports = lib;
