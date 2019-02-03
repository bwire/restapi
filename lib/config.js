// container for all the environments
var environments = {};

// Staging (default) environment
environments.staging = {
    httpPort: 3000,
    httpsPort: 3001,
    envName: 'staging',
    hashingSecret: 'ThisIsASecret',
    maxChecks: 5,
    'twilio' : {
      'accountSid' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
      'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
      'fromPhone' : '+15005550006'
    },
    "templateGlobals": {
      "appName": "Uptime checker",
      "companyName": "Not a real company Inc.",
      "yearCreated": 2018,
      "baseUrl": "http://localhost:3000"
    }
};

// produnction environment
environments.production = {
    httpPort: 5000,
    httpsPort: 5001,
    envName: 'production',
    hashingSecret: 'ThisIsASecret',
    maxChecks: 5,
    twilio: {
      'accountSid': '',
      'authToken': '',
      'fromPhone' : ''
    },
    "templateGlobals": {
      "appName": "Uptime checker",
      "companyName": "Not a real company Inc.",
      "yearCreated": 2018,
      "baseUrl": "http://localhost:3000"
    }
};

var currentEnv = typeof(process.env.Node_ENV) === 'string' ?
    process.env.Node_ENV.toLowerCase() : '';
    
// check for one of the defined environments (if not - set staging)
var envToExport = typeof(environments[currentEnv]) == 'object' ?
    environments[currentEnv] : environments.staging;
    
module.exports = envToExport;