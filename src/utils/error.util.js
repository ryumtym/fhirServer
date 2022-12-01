const errors = require('@asymmetrik/node-fhir-server-core/dist/server/utils/error.utils');

const cannotCombineParameterError = (params) => {
  return errors.internal({ message: `Cannot combine the [${params}] parameters`}, '4_0_0');
  // return new Error(`Cannot combine the [${params}] parameters`);
};

/**
 * @name unknownParameterValue
 * @description If an unknown parameter value is obtained, err is returned.
 * @Example throw (unknownParameterValue('_sort', nmae, ['birthDate','name'])
 */
const unknownParameterError = (param, value, srchableParams) => {
  return errors.invalidParameter(`Unknown ${param} parameter value [${value}]. Valid values for this search are: [${srchableParams}]`, '4_0_0');
  // return new Error(`Unknown ${param} parameter value [${value}]. Valid values for this search are: [${srchableParams}]`);
};

module.exports = {
  cannotCombineParameterError,
  unknownParameterError
};
