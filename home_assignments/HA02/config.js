// ----------------------------------------------------------------------------------------------------------------
// Container for all the environments
// -
var environments = {}

// Staging (default) environment
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'ThisIsASecret',
  stripeKey: 'sk_test_4eC39HqLyjWDarjtT1zdp7dc'
}

// Staging (default) environment
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'ThisIsASecret',
  stripeKey: 'sk_test_4eC39HqLyjWDarjtT1zdp7dc'
}

const currentEnv = typeof (process.env.NODE_ENV) === 'string'
  ? process.env.NODE_ENV.toLowerCase : ''

// check for one of the defined environments (if not - set staging)
const envToExport = typeof (environments[currentEnv]) === 'object'
  ? environments[currentEnv] : environments.staging

module.exports = envToExport
