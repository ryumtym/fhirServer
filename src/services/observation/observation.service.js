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
  compositeQueryBuilder,
  dateQB,
} = require('../../utils/querybuilder.util');

let getObservation = (base_version) => {
  return resolveSchema(base_version, 'Observation');
};

let getMeta = (base_version) => {
  return resolveSchema(base_version, 'Meta');
};

let buildRelease4SearchQuery = (args) => {

  // Patient search params
  const argsCache = {};
  const queryKey = (srchParam) => {
    if (argsCache[srchParam]) { return argsCache[srchParam]; }
    const keys = Object.keys(args).filter(k => k === srchParam || k.startsWith(`${srchParam}:`));
    argsCache[srchParam] = keys;
    return keys;
  };

  const modifCache = {};
  const modif = (str) => {
    if (modifCache[str]) { return modifCache[str]; }
    const result = str.match(/([^:]*)(:?)(.*)/)[3];
    modifCache[str] = result;
    return result;
  };

  // Common search params
  const _id = queryKey('_id');
  const _lastUpdated = queryKey('_lastUpdated');
  const _tag = queryKey('_tag');
  const _profile = queryKey('_profile');
  const _security = queryKey('_security');

  // Observation search params
  const based_on = queryKey('based_on');
  const category = queryKey('category');
  const code = queryKey('code');
  const code_value_concept = queryKey('code-value-concept');
  const code_value_date = queryKey('code-value-date');
  const code_value_quantity = queryKey('code-value-quantity');
  const code_value_string = queryKey('code-value-string');
  const combo_code = queryKey('combo-code');
  const combo_code_value_concept = queryKey('combo-code-value-concept');
  const combo_code_value_quantity = queryKey('combo-code-value-quantity');
  const combo_data_absent_reason = queryKey('combo-data-absent-reason');
  const combo_value_concept = queryKey('combo-value-concept');
  const combo_value_quantity = queryKey('combo-value-quantity');
  const component_code = queryKey('component-code');
  const component_code_value_concept = queryKey('component-code-value-concept');
  const component_code_value_quantity = queryKey('component-code-value-quantity');
  const component_data_absent_reason = queryKey('component-data-absent-reason');
  const component_value_concept = queryKey('component-value-concept');
  const component_value_quantity = queryKey('component-value-quantity');
  const data_absent_reason = queryKey('data-absent-reason');
  const date = queryKey('date');
  // let date = args['date'];
  const derived_from = queryKey('derived-from');
  const device = queryKey('device');
  const encounter = queryKey('encounter');
  const focus = queryKey('focus');
  const has_member = queryKey('has-member');
  const identifier = queryKey('identifier');
  const method = queryKey('method');
  const partof = queryKey('part-of');
  const patient = queryKey('patient');
  const performer = queryKey('performer');
  const specimen = queryKey('specimen');
  const status = queryKey('status');
  const subject = queryKey('subject');
  const value_concept = queryKey('value-concept');
  const value_date = queryKey('value-date');
  const value_quantity = queryKey('value-quantity');
  const value_string = queryKey('value-string');


  let query = {};
  let ors = [];


  _id?.forEach(elm => {
    ors.push(...tokenQueryBuilder(args[elm], 'id', '', 'string', modif(elm)));
  });

  _lastUpdated?.forEach(elm => {
    ors.push(...dateQB(args[elm], ['date'], 'meta.lastUpdated'));
  });

  _tag?.forEach(elm => {
    ors.push(...tokenQueryBuilder(args[elm], 'meta.tag', '', 'Coding', modif(elm)));
  });

  _profile?.forEach(elm => {
    ors.push(...referenceQueryBuilder(args[elm], 'meta.profile', modif(elm)));
  });

  _security?.forEach(elm => {
    ors.push(...tokenQueryBuilder(args[elm], 'meta.security', '', 'Coding', modif(elm)));
  });

  based_on?.forEach(elm => {
    ors.push(...referenceQueryBuilder(args[elm], 'basedOn', modif(elm)));
  });

  category?.forEach(elm => {
    ors.push(...tokenQueryBuilder(args[elm], 'category', '', 'CodeableConcept', modif(elm)));
  });

  code?.forEach(elm => {
    ors.push(...tokenQueryBuilder(args[elm], 'code', '', 'CodeableConcept', modif(elm)));
  });

  code_value_concept?.forEach(elm => {
    ors.push(...compositeQueryBuilder(args[elm], 'code|token', 'valueCodeableConcept|token'));
  });

  code_value_date?.forEach(elm => {
    ors.push(...compositeQueryBuilder(args[elm], 'code|token', 'value|date'));
  });

  code_value_quantity?.forEach(elm => {
    ors.push(...compositeQueryBuilder(args[elm], 'code|token', 'valueQuantity|quantity'));
  });

  code_value_string?.forEach(elm => {
    ors.push(...compositeQueryBuilder(args[elm], 'code|token', 'valueString|string'));
  });

  combo_code?.forEach(elm => {
    const multiple = [
      tokenQueryBuilder(args[elm], 'component.code', '', 'CodeableConcept', modif(elm)),
      tokenQueryBuilder(args[elm], 'code', '', 'CodeableConcept', modif(elm))
    ];
    ors.push(...[{['$or']: multiple.flat()}]);
  });

  combo_code_value_concept?.forEach(elm => {
    ors.push(...compositeQueryBuilder(args[elm], 'component.code|token', 'component.valueCodeableConcept|token'));
  });

  combo_code_value_quantity?.forEach(elm => {
    ors.push(...compositeQueryBuilder(args[elm], 'component.code|token', 'component.valueQuantity|quantity'));
  });

  combo_data_absent_reason?.forEach(elm => {
    const multiple = [
      tokenQueryBuilder(args[elm], 'dataAbsentReason', '', 'CodeableConcept', modif(elm)),
      tokenQueryBuilder(args[elm], 'component.dataAbsentReason', '', 'CodeableConcept', modif(elm))
    ];
    ors.push(...[{['$or']: multiple.flat()}]);
  });

  combo_value_concept?.forEach(elm => {
    const multiple = [
      tokenQueryBuilder(args[elm], 'valueCodeableConcept', '', 'CodeableConcept', modif(elm)),
      tokenQueryBuilder(args[elm], 'component.valueCodeableConcept', '', 'CodeableConcept', modif(elm))
    ];
    ors.push(...[{['$or']: multiple.flat()}]);
  });

  // これが正しいのかわからない ドキュメントを読んでもsampledDataの正しい検索方法/結果がわからない
  combo_value_quantity?.forEach(elm => {
    const multiple = [
      quantityQueryBuilder(args[elm], 'valueQuantity', modif(elm)),
      quantityQueryBuilder(args[elm], 'component.valueQuantity', modif(elm)),
      quantityQueryBuilder(args[elm], 'component.valueSampledData.origin', modif(elm))
    ];
    ors.push(...[{['$or']: multiple.flat()}]);
  });

  component_code?.forEach(elm => {
    ors.push(...tokenQueryBuilder(args[elm], 'component.code', '', 'CodeableConcept', modif(elm)));
  });

  component_code_value_concept?.forEach(elm => {
    ors.push(...compositeQueryBuilder(args[elm], 'component.code|token', 'component.valueCodeableConcept|token'));
  });

  component_code_value_quantity?.forEach(elm => {
    ors.push(...compositeQueryBuilder(args[elm], 'component.code|token', 'component.valueQuantity|quantity'));
  });

  component_data_absent_reason?.forEach(elm => {
    ors.push(...tokenQueryBuilder(args[elm], 'component.dataAbsentReason', '', 'CodeableConcept', modif(elm)));
  });

  component_value_concept?.forEach(elm => {
    ors.push(...tokenQueryBuilder(args[elm], 'component.valueCodeableConcept', '', 'CodeableConcept', modif(elm)));
  });

  component_value_quantity?.forEach(elm => {
    ors.push(...quantityQueryBuilder(args[elm], 'component.valueQuantity', modif(elm)));
  });

  data_absent_reason?.forEach(elm => {
    ors.push(...tokenQueryBuilder(args[elm], 'dataAbsentReason', '', 'CodeableConcept', modif(elm)));
  });

  date?.forEach(elm => {
    // ors.push(...dateQB(args[elm], ['dateTime', 'Period', 'Timing', 'instant'], 'effective', modif(elm)));
    ors.push(...dateQB(args[elm], ['dateTime', 'Period'], 'effective', modif(elm)));
  });

  derived_from?.forEach(elm => {
    ors.push(...referenceQueryBuilder(args[elm], 'derivedFrom.reference', modif(elm)));
  });

  device?.forEach(elm => {
    ors.push(...referenceQueryBuilder(args[elm], 'device.reference', modif(elm)));
  });

  encounter?.forEach(elm => {
    ors.push(...referenceQueryBuilder(args[elm], 'encounter.reference', modif(elm)));
  });

  focus?.forEach(elm => {
    ors.push(...referenceQueryBuilder(args[elm], 'focus.reference', modif(elm)));
  });

  has_member?.forEach(elm => {
    ors.push(...referenceQueryBuilder(args[elm], 'hasMember.reference', modif(elm)));
  });

  identifier?.forEach(elm => {
    ors.push(...tokenQueryBuilder(args[elm], 'identifier', '', 'Identifier', modif(elm)));
  });

  method?.forEach(elm => {
    ors.push(...tokenQueryBuilder(args[elm], 'method', '', 'CodeableConcept', modif(elm)));
  });

  partof?.forEach(elm => {
    ors.push(...referenceQueryBuilder(args[elm], 'partOf.reference', modif(elm)));
  });

  patient?.forEach(elm => {
    ors.push(...referenceQueryBuilder(args[elm], 'subject.reference', modif(elm), 'Patient'));
  });

  performer?.forEach(elm => {
    ors.push(...referenceQueryBuilder(args[elm], 'performer.reference', modif(elm)));
  });

  specimen?.forEach(elm => {
    ors.push(...referenceQueryBuilder(args[elm], 'specimen.reference', modif(elm)));
  });

  status?.forEach(elm => {
    ors.push(...tokenQueryBuilder(args[elm], 'status', '', 'code', modif(elm)));
  });

  subject?.forEach(elm => {
    ors.push(...referenceQueryBuilder(args[elm], 'subject.reference', modif(elm)));
  });

  value_concept?.forEach(elm => {
    ors.push(...tokenQueryBuilder(args[elm], 'valueCodeableConcept', '', 'CodeableConcept', modif(elm)));
  });

  value_date?.forEach(elm => {
    ors.push(...dateQB(args[elm], ['dateTime', 'Period'], 'value'));
  });

  value_quantity?.forEach(elm => {
    ors.push(...quantityQueryBuilder(args[elm], 'valueQuantity', modif(elm)));
  });

  value_string?.forEach(elm => {
    ors.push(...stringQueryBuilder(args[elm], 'valueString', modif(elm)));
  });


  // https://stackoverflow.com/questions/5150061/mongodb-multiple-or-operations
  if (ors.length !== 0) {
    query.$and = ors.flat();
  }
  console.log(JSON.stringify(query));

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

    // console.log(query)
 
    collection.find(query).toArray().then(
      (observations) => {
        observations.forEach(function (element, i, returnArray) {
          returnArray[i] = new Observation(element);
        });
        resolve(observations);
      },
      err => {
        logger.error('Error with Observation.search: ', err);
        return reject(err);
      }
    )
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
