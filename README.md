## 進捗
- stringsQueryBuilder, nameQueryBuilder, quantityQueryBuilder => done <br>
[https://www.hl7.org/fhir/search.html#string]

- dateQueryBuilder -> ``eq,lt,gt``は完了<br> 
  ``sa,eb,ap``に関してはhapifhirでも使われていないので優先度低 [https://www.hl7.org/fhir/search.html#string]

_**@asymmetrik/node-fhir-server-core/dist/server/utils/sanitize.utils.js:**_ 
```javascript
const sanitize = require('sanitize-html');

const errors = require('./error.utils');

const validator = require('validator');

const xss = require('xss');
const { default: isURL } = require('validator/lib/isURL');

let parseValue = function (type, value) {
  let result;

  switch (type) {
    case 'number':
      result = validator.toFloat(value);
      break;

    case 'date':
      result = validator.stripLow(xss(sanitize(value)));
      break;

    case 'boolean':
      result = validator.toBoolean(value);
      break;

    case 'string':
    case 'reference':
    case 'uri':
    case 'token':
    case 'quantity':
    case 'composite':
      // strip any html tags from the query
      // xss helps prevent html from slipping in
      // strip a certain range of unicode characters
      // replace any non word characters
      result = validator.stripLow(xss(sanitize(value)));
      // console.log(result)
      break;

    case 'json_string':
      result = JSON.parse(value);
      break;

    default:
      // Pass the value through, unknown types will fail when being validated
      result = value;
      break;
  }

  return result;
};

let validateType = function (type, value) {
  let result;

  switch (type) {
    case 'number':
      result = typeof value === 'number' && !Number.isNaN(value);
      break;

    case 'boolean':
      result = typeof value === 'boolean';
      break;

    case 'string':
    case 'reference':
    case 'uri':
    case 'token':
    case 'date':
    case 'quantity':
    case 'composite':
      result = typeof value === 'string';
      break;

    case 'json_string':
      result = typeof value === 'object';
      break;

    default:
      result = false;
      break;
  }

  return result;
};

let parseParams = req => {
  let params = {};
  let isSearch = req.url && req.url.endsWith('_search');

  if (req.query && req.method === 'GET' && Object.keys(req.query).length) {
    Object.assign(params, req.query);
  }

  if (req.body && ['PUT', 'POST'].includes(req.method) && Object.keys(req.body).length && isSearch) {
    Object.assign(params, req.body);
  }

  if (req.params && Object.keys(req.params).length) {
    Object.assign(params, req.params);
  }

  return params;
};

let findMatchWithName = (name = '', params = {}) => {
  let keys = Object.getOwnPropertyNames(params);
  let match = keys.find(key => {
    let parameter = key.split(':')[0];
    return name === parameter;
  });
  return {
    field: match,
    value: params[match]
  };
};

/**
 * @function modifiersChecker 
 * @summary Checks for modifiers and returns parameters without modifiers as object type 
 * example  target = gender:not -> return ['gender'], target = gender -> return['gender']
 * @param {object} target - searchParams
 */
const modifiersChecker = function (target) {
  const reg = new RegExp(/([^"]*)(:)([^"]*)/)
  const keyObj = Object.keys(target);
  const valueObj = Object.values(target)
  let newArr = {}

  for(let i=0; i<keyObj.length; i++){
    if(reg.test(keyObj[i]) == true){
      newArr[keyObj[i].split(':')[0]] = valueObj[i]
    }else{
      newArr[keyObj[i]] = valueObj[i]
    }
  }
  return newArr

}

/**
 * @function searchParameterChecker
 * @summary Check if the search parameters are equivalent to the values specified by hl7
 * example  target = gendernot -> return ['gender'], target = gender -> return['gender']
 * @param {object} target - searchParams
 * @param {array} paramsArr - Value determined by hl7
 */
const searchParameterChecker = function(target, paramsArr){
  for(let i = 0; i < Object.keys(target).length; i++){
    if(paramsArr.includes(Object.keys(target)[i]) === false){
      return Object.keys(target)[i];
    }
  }
}


/**
 * @function sanitizeMiddleware
 * @summary Sanitize the arguments by removing extra arguments, escaping some, and
 * throwing errors if arg should throw when an invalid one is passed. This will replace
 * req.body and/or req.params with a clean object
 * @param {Array<Object>} config - Sanitize config for how to deal with params
 * @param {string} config.name - Argument name
 * @param {string} config.type - Argument type. Acceptable types are (boolean, string, number)
 * @param {boolean} required - Should we throw if this argument is present and invalid, default is false
 */

let sanitizeMiddleware = function (config) {
  return function (req, res, next) {
    let currentArgs = parseParams(req);
    let cleanArgs = {}; // filter only ones with version or no version

    let searchParametersArr = []

    let version_specific_params = config.filter(param => {
      return !param.versions || param.versions === req.params.base_version;
    }); // Check each argument in the config



    for (let i = 0; i < version_specific_params.length; i++) {
      let conf = version_specific_params[i];
      let {
        field,
        value
      } = findMatchWithName(conf.name, currentArgs); // If the argument is required but not present

      searchParametersArr.push(conf.name)

      if (!value && conf.required) {
        return next(errors.invalidParameter(conf.name + ' is required', req.params.base_version));
      } // Try to cast the type to the correct type, do this first so that if something
      // returns as NaN we can bail on it

      try {
        if (value) {
          cleanArgs[field] = parseValue(conf.type, value);
        }
      } catch (err) {
        return next(errors.invalidParameter(conf.name + ' is invalid', req.params.base_version));
      } // If we have the arg and the type is wrong, throw invalid arg

      if (cleanArgs[field] !== undefined && !validateType(conf.type, cleanArgs[field])) {
        return next(errors.invalidParameter('Invalid parameter: ' + conf.name, req.params.base_version));
      }
    } // Save the cleaned arguments on the request for later use, we must only use these later on


    if(searchParameterChecker(modifiersChecker(currentArgs), searchParametersArr)){
      return next(errors.invalidParameter(
        'Invalid parameter: ' + JSON.stringify(currentArgs) +  '  Valid search parameters for this search are : ' +  searchParametersArr 
      ));
      // next(errors.invalidParameter('Invalid parameter: ' ))
    }

    // console.log("n-f-c/dist/server-utils/sanitize.utill/sanitizeMiddleware/cleanArgs" + JSON.stringify(cleanArgs))
    // console.log("n-f-c/dist/server-utils/sanitize.utill/sanitizeMiddleware/currentArgs" + JSON.stringify(currentArgs))

    req.sanitized_args = cleanArgs;
    next();
  };
};

module.exports = {
  sanitizeMiddleware
};
```
_**fhirJsonData for test**_ [via mongoplayground](https://mongoplayground.net/)
```bson
[
  {
    _id: "pat1",
    id: "pat1",
    active: true,
    contact: [
      {
        relationship: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v2-0131",
                code: "E"
              }
            ]
          }
        ],
        organization: {
          reference: "Organization/1",
          display: "Walt Disney Corporation"
        }
      }
    ],
    gender: "male",
    identifier: [
      {
        use: "usual",
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0203",
              code: "MR"
            }
          ]
        },
        system: "urn:oid:0.1.2.3.4.5.6.7",
        value: "654321"
      }
    ],
    link: [
      {
        other: {
          reference: "Patient/pat2"
        },
        type: "seealso"
      }
    ],
    managingOrganization: {
      reference: "Organization/1",
      display: "ACME Healthcare, Inc"
    },
    meta: {
      versionId: "2",
      lastUpdated: "2022-06-28T05:39:52+00:00"
    },
    name: [
      {
        use: "official",
        family: "Donald",
        given: [
          "Duck"
        ]
      }
    ],
    photo: [
      {
        contentType: "image/gif",
        data: "R0lGODlhEwARAPcAAAAAAAAA/+9aAO+1AP/WAP/eAP/eCP/eEP/eGP/nAP/nCP/nEP/nIf/nKf/nUv/nWv/vAP/vCP/vEP/vGP/vIf/vKf/vMf/vOf/vWv/vY//va//vjP/3c//3lP/3nP//tf//vf///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////yH5BAEAAAEALAAAAAATABEAAAi+AAMIDDCgYMGBCBMSvMCQ4QCFCQcwDBGCA4cLDyEGECDxAoAQHjxwyKhQAMeGIUOSJJjRpIAGDS5wCDly4AALFlYOgHlBwwOSNydM0AmzwYGjBi8IHWoTgQYORg8QIGDAwAKhESI8HIDgwQaRDI1WXXAhK9MBBzZ8/XDxQoUFZC9IiCBh6wEHGz6IbNuwQoSpWxEgyLCXL8O/gAnylNlW6AUEBRIL7Og3KwQIiCXb9HsZQoIEUzUjNEiaNMKAAAA7"
      }
    ],
    resourceType: "Patient",
    
  },
  {
    _id: "xcda",
    id: "xcda",
    active: true,
    birthDate: "1932-09-24",
    gender: "male",
    identifier: [
      {
        use: "usual",
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0203",
              code: "MR"
            }
          ]
        },
        system: "urn:oid:2.16.840.1.113883.19.5",
        value: "1234567890"
      }
    ],
    managingOrganization: {
      reference: "Organization/2.16.840.1.113883.19.5",
      display: "Good Health Clinic"
    },
    meta: {
      versionId: "1",
      lastUpdated: "2022-06-21T04:32:02+00:00"
    },
    name: [
      {
        family: "Levin",
        given: [
          "Henry"
        ]
      }
    ],
    resourceType: "Patient",
    
  }
]
```