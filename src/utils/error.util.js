const errors = require('@asymmetrik/node-fhir-server-core/dist/server/utils/error.utils');

const cannotCombineParameterError = (params) => {
  return errors.internal({ message: `Cannot combine the [${params}] parameters`}, '4_0_0');
  // return new Error(`Cannot combine the [${params}] parameters`);
};

/**
 * @name unknownParameterValue
 * @description If an unknown parameter value is obtained, err is returned.
 * @Example throw (unknownParameterValue('_sort', nmae, ['birthDate','name'])
 * @returns Unknown {param} parameter value {value}. Valid values for this search are: {srchableParams}
 */
const unknownParameterError = (param, value, srchableParams) => {
  return errors.invalidParameter(`Unknown ${param} parameter value [${value}]. Valid values for this search are: [${srchableParams}]`, '4_0_0');
};

/**
 * @name invalidParameterValue
 * @description If an invalid parameter value is obtained, err is returned.
 * @Example throw (unknownParameterValue('_sort', nmae, ['birthDate','name'])
 * @returns Unknown {param} parameter value {value}. Valid values for this search are: {srchableParams}
 */
const invalidParameterError = (param, value, srchableParams) => {
  return errors.invalidParameter(`Invalid ${param} parameter value [${value}]. Valid values for this search are: [${srchableParams}]`, '4_0_0');
};

module.exports = {
  cannotCombineParameterError,
  unknownParameterError,
  invalidParameterError
};
