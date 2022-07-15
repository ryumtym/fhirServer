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
} = require('../../utils/querybuilder.util');

let getMedicationRequest = (base_version) => {
  return resolveSchema(base_version, 'MedicationRequest');
};

let getMeta = (base_version) => {
  return resolveSchema(base_version, 'Meta');
};

let buildRelease4SearchQuery = (args) => {
  // Common search params
  let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } = args;

  // Search Result params
  let {
    _INCLUDE,
    _REVINCLUDE,
    _SORT,
    _COUNT,
    _SUMMARY,
    _ELEMENTS,
    _CONTAINED,
    _CONTAINEDTYPED,
  } = args;

  // MedicationRequest search params
  let authoredon = args['authoredon'];
  let category = args['category'];
  let code = args['code'];
  let date = args['date'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let intended_dispenser = args['intended-dispenser'];
  let intended_performer = args['intended-performer'];
  let intended_performertype = args['intended-performertype'];
  let intent = args['intent'];
  let medication = args['medication'];
  let medicationRequest = args['medicationRequest'];
  let priority = args['priority'];
  let requester = args['requester'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (ors.length !== 0) {
    query.$and = ors;
  }

  if (authoredon) {
    query.deceasedDateTime = dateQueryBuilder(authoredon, 'authoredOn', '');
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'value', 'category', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (code) {
    let queryBuilder = tokenQueryBuilder(code, 'code', 'code', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (date) {
    query.deceasedDateTime = dateQueryBuilder(date, 'date', '');
  }

  if (encounter) {
    let queryBuilder = referenceQueryBuilder(encounter, 'encounter');
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

  if (intended_dispenser) {
    let queryBuilder = referenceQueryBuilder(intended_dispenser, 'dispenseRequest.performer');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (intended_performer) {
    let queryBuilder = referenceQueryBuilder(intended_performer, 'performer');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (intended_performertype) {
    let queryBuilder = tokenQueryBuilder(intended_performertype, 'value', 'performerType', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (intent) {
    let queryBuilder = tokenQueryBuilder(intent, 'value', 'intent', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (medication) {
    let queryBuilder = referenceQueryBuilder(medication, 'medication');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (medicationRequest) {
    let queryBuilder = referenceQueryBuilder(medicationRequest, 'medicationRequest');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (priority) {
    let queryBuilder = tokenQueryBuilder(priority, 'value', 'priority', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (requester) {
    let queryBuilder = referenceQueryBuilder(requester, 'requester');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'value', 'status', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject');
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
    logger.info('MedicationRequest >>> search');

    let { base_version } = args;
    let query = {};

    if (base_version === VERSIONS['3_0_1']) {
      query = buildStu3SearchQuery(args);
    } else if (base_version === VERSIONS['1_0_2']) {
      query = buildDstu2SearchQuery(args);
    } else if (base_version === VERSIONS['4_0_0']) {
      query = buildRelease4SearchQuery(args);
    }
    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}`);
    let MedicationRequest = getMedicationRequest(base_version);

    // Query our collection for this observation
    collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with MedicationRequest.search: ', err);
        return reject(err);
      }

      // MedicationRequest is a medicationRequest cursor, pull documents out before resolving
      data.toArray().then((medicationRequests) => {
        medicationRequests.forEach(function (element, i, returnArray) {
          returnArray[i] = new MedicationRequest(element);
        });
        resolve(medicationRequests);
      });
    });
  });

module.exports.searchById = (args) =>
  new Promise((resolve, reject) => {
    logger.info('MedicationRequest >>> searchById');

    let { base_version, id } = args;
    let MedicationRequest = getMedicationRequest(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}`);
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, medicationRequest) => {
      if (err) {
        logger.error('Error with MedicationRequest.searchById: ', err);
        return reject(err);
      }
      if (medicationRequest) {
        resolve(new MedicationRequest(medicationRequest));
      }
      resolve();
    });
  });

module.exports.create = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('MedicationRequest >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}`);

    // Get current record
    let MedicationRequest = getMedicationRequest(base_version);
    let medicationRequest = new MedicationRequest(resource);

    // If no resource ID was provided, generate one.
    let id = getUuid(medicationRequest);

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    medicationRequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Create the document to be inserted into Mongo
    let doc = JSON.parse(JSON.stringify(medicationRequest.toJSON()));
    Object.assign(doc, { id: id });

    // Create a clone of the object without the _id parameter before assigning a value to
    // the _id parameter in the original document
    let history_doc = Object.assign({}, doc);
    Object.assign(doc, { _id: id });

    // Insert our medicationRequest record
    collection.insertOne(doc, (err) => {
      if (err) {
        logger.error('Error with MedicationRequest.create: ', err);
        return reject(err);
      }

      // Save the resource to history
      let history_collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}_History`);

      // Insert our medicationRequest record to history but don't assign _id
      return history_collection.insertOne(history_doc, (err2) => {
        if (err2) {
          logger.error('Error with MedicationRequestHistory.create: ', err2);
          return reject(err2);
        }
        return resolve({ id: doc.id, resource_version: doc.meta.versionId });
      });
    });
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('MedicationRequest >>> update');

    let resource = req.body;

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}`);

    // Get current record
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with MedicationRequest.searchById: ', err);
        return reject(err);
      }

      let MedicationRequest = getMedicationRequest(base_version);
      let medicationRequest = new MedicationRequest(resource);

      if (data && data.meta) {
        let foundMedicationRequest = new MedicationRequest(data);
        let meta = foundMedicationRequest.meta;
        meta.versionId = `${parseInt(foundMedicationRequest.meta.versionId) + 1}`;
        medicationRequest.meta = meta;
      } else {
        let Meta = getMeta(base_version);
        medicationRequest.meta = new Meta({
          versionId: '1',
          lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
        });
      }

      let cleaned = JSON.parse(JSON.stringify(medicationRequest));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our medicationRequest record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with MedicationRequest.update: ', err2);
          return reject(err2);
        }

        // save to history
        let history_collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}_History`);

        let history_medicationrequest = Object.assign(cleaned, { _id: id +  cleaned.meta.versionId  });

        // Insert our medicationRequest record to history but don't assign _id
        return history_collection.insertOne(history_medicationrequest, (err3) => {
          if (err3) {
            logger.error('Error with MedicationRequestHistory.create: ', err3);
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
    logger.info('MedicationRequest >>> remove');

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}`);
    // Delete our medicationRequest record
    collection.deleteOne({ id: id }, (err, _) => {
      if (err) {
        logger.error('Error with MedicationRequest.remove');
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
      let history_collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}_History`);
      return history_collection.deleteMany({ id: id }, (err2) => {
        if (err2) {
          logger.error('Error with MedicationRequest.remove');
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
    logger.info('MedicationRequest >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let MedicationRequest = getMedicationRequest(base_version);

    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}_History`);

    // Query our collection for this observation
    history_collection.findOne(
      { id: id.toString(), 'meta.versionId': `${version_id}` },
      (err, medicationRequest) => {
        if (err) {
          logger.error('Error with MedicationRequest.searchByVersionId: ', err);
          return reject(err);
        }

        if (medicationRequest) {
          resolve(new MedicationRequest(medicationRequest));
        }

        resolve();
      }
    );
  });

module.exports.history = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('MedicationRequest >>> history');

    // Common search params
    let { base_version } = args;

    let query = {};

    if (base_version === VERSIONS['3_0_1']) {
      query = buildStu3SearchQuery(args);
    } else if (base_version === VERSIONS['1_0_2']) {
      query = buildDstu2SearchQuery(args);
    }else if (base_version === VERSIONS['4_0_0']) {
      query = buildRelease4SearchQuery(args);
    }
    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}_History`);
    let MedicationRequest = getMedicationRequest(base_version);

    // Query our collection for this observation
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with MedicationRequest.history: ', err);
        return reject(err);
      }

      // MedicationRequest is a medicationRequest cursor, pull documents out before resolving
      data.toArray().then((medicationRequests) => {
        medicationRequests.forEach(function (element, i, returnArray) {
          returnArray[i] = new MedicationRequest(element);
        });
        resolve(medicationRequests);
      });
    });
  });

module.exports.historyById = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('MedicationRequest >>> historyById');

    let { base_version, id } = args;
    let query = {};

    if (base_version === VERSIONS['3_0_1']) {
      query = buildStu3SearchQuery(args);
    } else if (base_version === VERSIONS['1_0_2']) {
      query = buildDstu2SearchQuery(args);
    }else if (base_version === VERSIONS['4_0_0']) {
      query = buildRelease4SearchQuery(args);
    }

    query.id = `${id}`;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}_History`);
    let MedicationRequest = getMedicationRequest(base_version);

    // Query our collection for this observation
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with MedicationRequest.historyById: ', err);
        return reject(err);
      }

      // MedicationRequest is a medicationRequest cursor, pull documents out before resolving
      data.toArray().then((medicationRequests) => {
        medicationRequests.forEach(function (element, i, returnArray) {
          returnArray[i] = new MedicationRequest(element);
        });
        resolve(medicationRequests);
      });
    });
  });

module.exports.patch = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('MedicationRequest >>> patch'); // Should this say update (instead of patch) because the end result is that of an update, not a patch

    let { base_version, id, patchContent } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}`);

    // Get current record
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with MedicationRequest.searchById: ', err);
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

      let MedicationRequest = getMedicationRequest(base_version);
      let medicationRequest = new MedicationRequest(resource);

      if (data && data.meta) {
        let foundMedicationRequest = new MedicationRequest(data);
        let meta = foundMedicationRequest.meta;
        meta.versionId = `${parseInt(foundMedicationRequest.meta.versionId) + 1}`;
        medicationRequest.meta = meta;
      } else {
        return reject('Unable to patch resource. Missing either data or metadata.');
      }

      // Same as update from this point on
      let cleaned = JSON.parse(JSON.stringify(medicationRequest));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our medicationRequest record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with MedicationRequest.update: ', err2);
          return reject(err2);
        }

        // Save to history
        let history_collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}_History`);
        let history_medicationrequest = Object.assign(cleaned, { _id: id + cleaned.meta.versionId });
        

        // Insert our medicationRequest record to history but don't assign _id
        return history_collection.insertOne(history_medicationrequest, (err3) => {
          if (err3) {
            logger.error('Error with MedicationRequestHistory.create: ', err3);
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
