// container for all the environments
var environments = {};

// Staging (default) environment
environments.staging = {
  "httpPort": 3000,
  "httpsPort": 3001,
  "envName": 'staging',
  "hashingSecret": 'ThisIsASecret',
  "maxChecks": 5
};

// production environment
environments.production = {
  "httpPort": 5000,
  "httpsPort": 5001,
  "envName": 'production',
  "hashingSecret": 'ThisIsASecret',
  "maxChecks": 5
};

var currentEnv = typeof(process.env.Node_ENV) === 'string' ?
  process.env.Node_ENV.toLowerCase() : '';

// check for one of the defined environments (if not - set staging)
var envToExport = typeof(environments[currentEnv]) == 'object' ?
  environments[currentEnv] : environments.staging;

module.exports = envToExport;
