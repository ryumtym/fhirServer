/*eslint no-unused-vars: "warn"*/

const { VERSIONS } = require('@asymmetrik/node-fhir-server-core').constants;
const { resolveSchema } = require('@asymmetrik/node-fhir-server-core');
const { COLLECTION, CLIENT_DB } = require('../../constants');
const moment = require('moment-timezone');
const globals = require('../../globals');
const jsonpatch = require('fast-json-patch');

const { getUuid } = require('../../utils/uid.util');

const logger = require('@asymmetrik/node-fhir-server-core').loggers.get();

const {
  stringQueryBuilder,
  tokenQueryBuilder,
  referenceQueryBuilder,
  addressQueryBuilder,
  nameQueryBuilder,
  dateQueryBuilder,
  quantityQueryBuilder,
  compositeQueryBuilder
} = require('../../utils/querybuilder.util');

let getObservation = (base_version) => {
  return resolveSchema(base_version, 'Observation');
};

let getMeta = (base_version) => {
  return resolveSchema(base_version, 'Meta');
};

let buildRelease4SearchQuery = (args) => {
  // Common search params
  let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } = args;

  // Search Result params
  let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
    args;

  // Observation search params
  let based_on = args['based-on'];
  let category = args['category'];
  let code = args['code'];
  let code_value_concept = args['code-value-concept'];
  let code_value_date = args['code-value-date'];
  let code_value_quantity = args['code-value-quantity'];
  let code_value_string = args['code-value-string'];
  let combo_code = args['combo-code'];
  let combo_code_value_concept = args['combo-code-value-concept'];
  let combo_code_value_quantity = args['combo-code-value-quantity'];
  let combo_data_absent_reason = args['combo-data-absent-reason'];
  let combo_value_concept = args['combo-value-concept'];
  let combo_value_quantity = args['combo-value-quantity'];
  let component_code = args['component-code'];
  let component_code_value_concept = args['component-code-value-concept'];
  let component_code_value_quantity = args['component-code-value-quantity'];
  let component_data_absent_reason = args['component-data-absent-reason'];
  let component_value_concept = args['component-value-concept'];
  let component_value_quantity = args['component-value-quantity'];
  // let _context = args['_context'];
  let data_absent_reason = args['data-absent-reason'];
  let date = args['date'];
  let derived_from = args['derived-from'];
  let device = args['device'];
  let encounter = args['encounter'];
  let focus = args['focus'];
  let has_member = args['has-member'];
  let identifier = args['identifier'];
  let method = args['method'];
  let partof = args['partof'];
  let patient = args['patient'];
  let performer = args['performer'];
  let specimen = args['specimen'];
  let status = args['status'];
  let subject = args['subject'];
  let value_concept = args['value-concept'];
  let value_date = args['value-date'];
  let value_quantity = args['value-quantity'];
  let value_string = args['value-string'];


  let query = {};
  let ors = [];


  if (ors.length !== 0) {
    query.$and = ors;
  }

  if (_id) {
    query.id = _id;
  }



  if (based_on) {
    let queryBuilder = referenceQueryBuilder(based_on, 'basedOn');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'value', 'category', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (code) {
    let queryBuilder = tokenQueryBuilder(code, 'coding', 'code');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
      console.log(query[i])
    }
  }

  if (code_value_concept) {
    query['code.value.concept'] = compositeQueryBuilder(code_value_concept,'code.value.concept','');
  }

  if (code_value_date) {
    query['code.value.date'] = compositeQueryBuilder(code_value_date,'code.value.date','');
  }

  if (code_value_quantity) {
    query['code.value.quantity'] = compositeQueryBuilder(code_value_quantity,'code.value.quantity','');
  }

  if (code_value_string) {
    query['code.value.string'] = compositeQueryBuilder(code_value_string,'code.value.string','');
  }

  if (combo_code) {
    let queryBuilder = tokenQueryBuilder(combo_code, 'value', 'combo_code', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (combo_code_value_concept) {
    query['combo.code.value.concept'] = compositeQueryBuilder(combo_code_value_concept,'combo.code.value.concept','');
  }

  if (combo_code_value_quantity) {
    query['combo.code.value.quantity'] = compositeQueryBuilder(combo_code_value_quantity,'combo.code.value.quantity','');
  }

  if (combo_data_absent_reason) {
    let queryBuilder = tokenQueryBuilder(combo_data_absent_reason, 'value', 'dataAbsentReason', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (combo_value_concept) {
    let queryBuilder = tokenQueryBuilder(combo_value_concept, 'value', 'combo_value_concept', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (combo_value_quantity) {
    let queryBuilder = quantityQueryBuilder(combo_value_quantity, 'value', 'combo_value_quantity', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (component_code) {
    let queryBuilder = tokenQueryBuilder(component_code, 'value', 'component.code', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
      // console.log("sec/service/observ/compo_code" + query[i]);
    }
  }

  if (component_code_value_concept) {
    query['component-code-value-concept'] = compositeQueryBuilder(component_code_value_concept,'component-code-value-concept','');
  }

  if (component_code_value_quantity) {
    // console.log(compositeQueryBuilder(component_code_value_quantity,'component-code-value-quantity','valueQuantity'))
    // query['component-code-value-quantity'] = compositeQueryBuilder(component_code_value_quantity,'code.coding|token','valueQuantity|value');
    let queryBuilder = compositeQueryBuilder(component_code_value_quantity,'code.coding|token','valueQuantity|value');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (component_data_absent_reason) {
    let queryBuilder = tokenQueryBuilder(component_data_absent_reason, 'value', 'component-data-absent-reason', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (component_value_concept) {
    let queryBuilder = tokenQueryBuilder(component_value_concept, 'value', 'component-value-concept', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (component_value_concept) {
    let queryBuilder = tokenQueryBuilder(component_value_concept, 'value', 'component-value-concept', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (component_value_quantity) {
    let queryBuilder = quantityQueryBuilder(component_value_quantity, 'value', 'component_value_quantity', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (data_absent_reason) {
    let queryBuilder = tokenQueryBuilder(data_absent_reason, 'value', 'data-absent-reason', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (date) {
    query.effectiveDateTime = dateQueryBuilder(date, 'date', 'effective');
    // console.log(query.effectiveDateTime)
  }

  if (derived_from) {
    let queryBuilder = referenceQueryBuilder(derived_from, 'derived-from');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (device) {
    let queryBuilder = referenceQueryBuilder(device, 'device.reference');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (encounter) {
    let queryBuilder = referenceQueryBuilder(encounter, 'encounter');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (focus) {
    let queryBuilder = referenceQueryBuilder(focus, 'encounter');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (has_member) {
    let queryBuilder = referenceQueryBuilder(has_member, 'has-member');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (method) {
    let queryBuilder = tokenQueryBuilder(method, 'value', 'method', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (partof) {
    let queryBuilder = referenceQueryBuilder(partof, 'partof.reference');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (performer) {
    let queryBuilder = referenceQueryBuilder(performer, 'performer');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (specimen) {
    let queryBuilder = referenceQueryBuilder(specimen, 'specimen');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject.reference');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }


  if (value_quantity) {
    let queryBuilder = quantityQueryBuilder(value_quantity,'valueQuantity');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }


  return query;
};


/**
 *
 * @param {*} args
 * @param {*} context
 * @param {*} logger
 */
module.exports.search = (args) =>
  new Promise((resolve, reject) => {
    logger.info('Observation >>> search');

    let { base_version } = args;
    let query = {};
    query = buildRelease4SearchQuery(args);


    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}`);
    let Observation = getObservation(base_version);
    console.log("args&query" + JSON.stringify(args,query))
 
    // Query our collection for this observation
    collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with Observation.search: ', err);
        return reject(err);
      }
      // Observation is a observation cursor, pull documents out before resolving
      data.toArray().then((observations) => {
        observations.forEach(function (element, i, returnArray) {
          returnArray[i] = new Observation(element);
        });
        resolve(observations);
      });
    });
  });

module.exports.searchById = (args) =>
  new Promise((resolve, reject) => {
    logger.info('Observation >>> searchById');

    let { base_version, id } = args;
    let Observation = getObservation(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}`);
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, observation) => {
      if (err) {
        logger.error('Error with Observation.searchById: ', err);
        return reject(err);
      }
      if (observation) {
        resolve(new Observation(observation));
      }
      resolve();
    });
  });

module.exports.create = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('Observation >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}`);

    // Get current record
    let Observation = getObservation(base_version);
    let observation = new Observation(resource);

    // If no resource ID was provided, generate one.
    let id = getUuid(observation);

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    observation.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Create the document to be inserted into Mongo
    let doc = JSON.parse(JSON.stringify(observation.toJSON()));
    Object.assign(doc, { id: id });

    // Create a clone of the object without the _id parameter before assigning a value to
    // the _id parameter in the original document
    let history_doc = Object.assign({}, doc);
    Object.assign(doc, { _id: id });

    // Insert our observation record
    collection.insertOne(doc, (err) => {
      if (err) {
        logger.error('Error with Observation.create: ', err);
        return reject(err);
      }

      // Save the resource to history
      let history_collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}_History`);

      // Insert our observation record to history but don't assign _id
      return history_collection.insertOne(history_doc, (err2) => {
        if (err2) {
          logger.error('Error with observationHistory.create: ', err2);
          return reject(err2);
        }
        return resolve({ id: doc.id, resource_version: doc.meta.versionId });
      });
    });
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('Observation >>> update');

    let resource = req.body;

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}`);

    // Get current record
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with Observation.searchById: ', err);
        return reject(err);
      }

      let Observation = getObservation(base_version);
      let observation = new Observation(resource);

      if (data && data.meta) {
        let foundobservation = new Observation(data);
        let meta = foundobservation.meta;
        meta.versionId = `${parseInt(foundobservation.meta.versionId) + 1}`;
        observation.meta = meta;
      } else {
        let Meta = getMeta(base_version);
        observation.meta = new Meta({
          versionId: '1',
          lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
        });
      }

      let cleaned = JSON.parse(JSON.stringify(observation));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our observation record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with Observation.update: ', err2);
          return reject(err2);
        }

        // save to history
        let history_collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}_History`);

        let history_observation = Object.assign(cleaned, { _id: id + cleaned.meta.versionId });

        // Insert our observation record to history but don't assign _id
        return history_collection.insertOne(history_observation, (err3) => {
          if (err3) {
            logger.error('Error with observationHistory.create: ', err3);
            return reject(err3);
          }

          return resolve({
            id: id,
            created: res.lastErrorObject && !res.lastErrorObject.updatedExisting,
            resource_version: doc.meta.versionId,
          });
        });
      });
    });
  });

module.exports.remove = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Observation >>> remove');

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}`);
    // Delete our observation record
    collection.deleteOne({ id: id }, (err, _) => {
      if (err) {
        logger.error('Error with Observation.remove');
        return reject({
          // Must be 405 (Method Not Allowed) or 409 (Conflict)
          // 405 if you do not want to allow the delete
          // 409 if you can't delete because of referential
          // integrity or some other reason
          code: 409,
          message: err.message,
        });
      }

      // delete history as well.  You can chose to save history.  Up to you
      let history_collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}_History`);
      return history_collection.deleteMany({ id: id }, (err2) => {
        if (err2) {
          logger.error('Error with Observation.remove');
          return reject({
            // Must be 405 (Method Not Allowed) or 409 (Conflict)
            // 405 if you do not want to allow the delete
            // 409 if you can't delete because of referential
            // integrity or some other reason
            code: 409,
            message: err2.message,
          });
        }

        return resolve({ deleted: _.result && _.result.n });
      });
    });
  });

module.exports.searchByVersionId = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Observation >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Observation = getObservation(base_version);

    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}_History`);

    // Query our collection for this observation
    history_collection.findOne(
      { id: id.toString(), 'meta.versionId': `${version_id}` },
      (err, observation) => {
        if (err) {
          logger.error('Error with Observation.searchByVersionId: ', err);
          return reject(err);
        }

        if (observation) {
          resolve(new Observation(observation));
        }

        resolve();
      }
    );
  });

module.exports.history = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Observation >>> history');

    // Common search params
    let { base_version } = args;

    let query = {};
    query = buildRelease4SearchQuery(args);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}_History`);
    let Observation = getObservation(base_version);

    // Query our collection for this observation
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with Observation.history: ', err);
        return reject(err);
      }

      // Observation is a observation cursor, pull documents out before resolving
      data.toArray().then((observations) => {
        observations.forEach(function (element, i, returnArray) {
          returnArray[i] = new Observation(element);
        });
        resolve(observations);
      });
    });
  });

module.exports.historyById = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Observation >>> historyById');

    let { base_version, id } = args;
    let query = {};
    query = buildRelease4SearchQuery(args);


    query.id = `${id}`;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}_History`);
    let Observation = getObservation(base_version);

    // Query our collection for this observation
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with Observation.historyById: ', err);
        return reject(err);
      }

      // Observation is a observation cursor, pull documents out before resolving
      data.toArray().then((observations) => {
        observations.forEach(function (element, i, returnArray) {
          returnArray[i] = new Observation(element);
        });
        resolve(observations);
      });
    });
  });

module.exports.patch = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Observation >>> patch'); // Should this say update (instead of patch) because the end result is that of an update, not a patch

    let { base_version, id, patchContent } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}`);

    // Get current record
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with Observation.searchById: ', err);
        return reject(err);
      }

      // Validate the patch
      let errors = jsonpatch.validate(patchContent, data);
      if (errors && Object.keys(errors).length > 0) {
        logger.error('Error with patch contents');
        return reject(errors);
      }
      // Make the changes indicated in the patch
      let resource = jsonpatch.applyPatch(data, patchContent).newDocument;

      let Observation = getObservation(base_version);
      let observation = new Observation(resource);

      if (data && data.meta) {
        let foundobservation = new Observation(data);
        let meta = foundobservation.meta;
        meta.versionId = `${parseInt(foundobservation.meta.versionId) + 1}`;
        observation.meta = meta;
      } else {
        return reject('Unable to patch resource. Missing either data or metadata.');
      }

      // Same as update from this point on
      let cleaned = JSON.parse(JSON.stringify(observation));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our observation record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with Observation.update: ', err2);
          return reject(err2);
        }

        // Save to history
        let history_collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}_History`);
        let history_observation = Object.assign(cleaned, { _id: id + cleaned.meta.versionId });

        // Insert our observation record to history but don't assign _id
        return history_collection.insertOne(history_observation, (err3) => {
          if (err3) {
            logger.error('Error with observationHistory.create: ', err3);
            return reject(err3);
          }

          return resolve({
            id: doc.id,
            created: res.lastErrorObject && !res.lastErrorObject.updatedExisting,
            resource_version: doc.meta.versionId,
          });
        });
      });
    });
  });
