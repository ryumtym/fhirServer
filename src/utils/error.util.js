const cannotCombineParameterError = (params) => {
  return new Error(`Cannot combine the [${params}] parameters`);
};

/**
 * @name unknownParameterValue
 * @description when got unknown Parameter Values then return err
 * @Example throw (unknownParameterValue('_sort', nmae, ['birthDate','name'])
 */
const unknownParameterError = (param, value, srchableParams) => {
  return new Error(`Unknown ${param} parameter value [${value}]. Valid values for this search are: [${srchableParams}]`);
};

module.exports = {
  cannotCombineParameterError,
  unknownParameterError
};
