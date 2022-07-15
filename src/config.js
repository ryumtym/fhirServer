const { VERSIONS } = require('@asymmetrik/node-fhir-server-core').constants;
const env = require('var');
let generateCapabilityStatement = require('./capability.js').generateStatements; // require the statement generator file


/**
 * @name mongoConfig
 * @summary Configurations for our Mongo instance
 */
let mongoConfig = {
  connection: `mongodb://${env.MONGO_HOSTNAME}`,
  db_name: env.MONGO_DB_NAME,
  options: {
    auto_reconnect: true,
  },
};

// Set up whitelist
let whitelist_env = (env.WHITELIST && env.WHITELIST.split(',').map((host) => host.trim())) || false;

// If no whitelist is present, disable cors
// If it's length is 1, set it to a string, so * works
// If there are multiple, keep them as an array
let whitelist = whitelist_env && whitelist_env.length === 1 ? whitelist_env[0] : whitelist_env;

/**
 * @name fhirServerConfig
 * @summary @asymmetrik/node-fhir-server-core configurations.
 */
let fhirServerConfig = {
  // statementGenerator: generateCapabilityStatement,
  auth: {
    // This servers URI
    resourceServer: env.RESOURCE_SERVER,
    //
    // if you use this strategy, you need to add the corresponding env vars to docker-compose
    //
    // strategy: {
		// 	name: 'basic',
		// 	service: './src/strategies/basic.strategy.js'
		// },

    // strategy: {
    // 	name: 'bearer',
    // 	useSession: false,
    // 	service: './src/strategies/bearer.strategy.js'
    // },

		// Define our strategy here, for smart to work, we need the name to be bearer
		// and to point to a service that exports a Smart on FHIR compatible strategy
    // type: 'smart',
		// strategy: {
		// 	name: 'bearer',
		// 	service: './src/strategies/sof.strategy.js'
		// }
  },
  server: {
    // support various ENV that uses PORT vs SERVER_PORT
    port: env.PORT || env.SERVER_PORT,
    // allow Access-Control-Allow-Origin
    corsOptions: {
      maxAge: 86400,
      origin: whitelist,
    },
  },
  logging: {
    level: env.LOGGING_LEVEL,
  },
  //
  // If you want to set up conformance statement with security enabled
  // Uncomment the following block
  //
  security: [//ここで認証urlとtokenアクセスurlを指定(ここだけenv.jsonで指定しない)
    {
      url: 'authorize',
      valueUri: `${env.AUTH_SERVER_URI}/auth/realms/test/protocol/openid-connect/auth`,
    },
    {
      url: 'token',
      valueUri: `${env.AUTH_SERVER_URI}/auth/realms/test/protocol/openid-connect/token`,
    },
    // optional - registration
  ],
  //
  // Add any profiles you want to support.  Each profile can support multiple versions
  // if supported by core.  To support multiple versions, just add the versions to the array.
  //
  // Example:
  // Account: {
  //		service: './src/services/account/account.service.js',
  //		versions: [ VERSIONS['4_0_0'], VERSIONS['3_0_1'], VERSIONS['1_0_2'] ]
  // },
  //
  profiles: {
    Account: {
      service: './src/services/account/account.service.js',
      versions: [VERSIONS['4_0_0']],
    },
    AllergyIntolerance: {
      service: './src/services/allergyintolerance/allergyintolerance.service.js',
      versions: [VERSIONS['4_0_0']],
    },
    Claim: {
      service: './src/services/claim/claim.service.js',
      versions: [VERSIONS['4_0_0']],
    },
    Condition: {
      service: './src/services/condition/condition.service.js',
      versions: [VERSIONS['4_0_0']],
    },
    Coverage: {
      service: './src/services/coverage/coverage.service.js',
      versions: [VERSIONS['4_0_0']],
    },
    Immunization: {
      service: './src/services/immunization/immunization.service.js',
      versions: [VERSIONS['4_0_0']],
    },
    Medication: {
      service: './src/services/medication/medication.service.js',
      versions: [VERSIONS['4_0_0']],
    },
    MedicationAdministration: {
      service: './src/services/medicationadministration/medicationadministration.service.js',
      versions: [VERSIONS['4_0_0']],
    },
    MedicationDispense: {
      service: './src/services/medicationdispense/medicationdispense.service.js',
      versions: [VERSIONS['4_0_0']],
    },
    MedicationRequest: {
      service: './src/services/medicationrequest/medicationrequest.service.js',
      versions: [VERSIONS['4_0_0']],
    },
    MedicationStatement: {
      service: './src/services/medicationstatement/medicationstatement.service.js',
      versions: [VERSIONS['4_0_0']],
    },
    Organization: {
      service: './src/services/organization/organization.service.js',
      versions: [VERSIONS['4_0_0']],
    },
    Observation: {
      service: './src/services/observation/observation.service.js',
      versions: [VERSIONS['4_0_0']],
    },
    Patient: {
      service: './src/services/patient/patient.service.js',
      versions: [VERSIONS['4_0_0']],
    },
  },
};

module.exports = {
  fhirServerConfig,
  mongoConfig,
};
