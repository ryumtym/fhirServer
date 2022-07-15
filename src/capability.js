let FHIRServer = require('@asymmetrik/node-fhir-server-core');

let base_version = '4_0_0';

let customCapabilityStatement = (resources) => {
  let CapabilityStatement = FHIRServer.resolveSchema(base_version, 'CapabilityStatement');

  return new CapabilityStatement(
    {
        "resourceType": "CapabilityStatement",
        "url": "http://localhost:3000",
        "fhirVersion": "4.0.0",
        "format": [
          "json",
          "application/fhir+json"
        ],
        "patchFormat": [
          "application/json-patch+json"
        ],
        "rest": [
            {
              "mode": "server",
              "documentation": "Cerner implementation of FHIR on top of Millennium",
              "security": {
                "cors": false,
                "extension": [
                  {
                    "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
                    "extension": [
                      {
                        "url": "token",
                        "valueUri": "http://localhost:3001/token"
                      },
                      {
                        "url": "authorize",
                        "valueUri": "http://localhost:3001/authorize"
                      }
                    ]
                  }
                ],
            }
        }
        ]
    },
  );
};

let customSecurityStatement = (securityUrls) => {
    return {
      cors: true,
      service: [
        {
          coding: [
            {
              system: 'http://hl7.org/fhir/restful-security-service',
              code: 'SMART-on-FHIR',
            },
          ],
          text: 'Custom OAuth2 using SMART-on-FHIR profile (see http://docs.smarthealthit.org)',
        },
      ],
      extension: [
        {
          url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
          extension: securityUrls,
        },
      ],
    };
  };

  module.exports.generateStatements = (args) => {
    base_version = args.base_version;
    return {
      makeStatement: customCapabilityStatement,
      securityStatement: customSecurityStatement,
    };
  };