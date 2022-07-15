

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

let getMedicationStatement = (base_version) => {
  return resolveSchema(base_version, 'MedicationStatement');
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

    // Resource Specific params
    let category = args['category'];
    let code = args['code'];
    let _context = args['_context'];
    let effective = args['effective'];
    let identifier = args['identifier'];
    let medication = args['medication'];
    let part_of = args['part-of'];
    let patient = args['patient'];
    let source = args['source'];
    let status = args['status'];
    let subject = args['subject'];


  let query = {};
  let ors = [];

  if (ors.length !== 0) {
    query.$and = ors;
  }

  if (_id) {
    query.id = _id;
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'value', 'category', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (code) {
    let queryBuilder = tokenQueryBuilder(code, 'value', 'code', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (_context) {
    let queryBuilder = referenceQueryBuilder(_context, 'context.reference');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (effective) {
    query.deceasedDateTime = dateQueryBuilder(effective, 'effective', '');
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (medication) {
    let queryBuilder = referenceQueryBuilder(medication, 'medication.reference');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (part_of) {
    let queryBuilder = referenceQueryBuilder(part_of, 'part_of.reference');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient.reference');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (source) {
    let queryBuilder = referenceQueryBuilder(source, 'informationSource.reference');
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
    let queryBuilder = referenceQueryBuilder(subject, 'subject.reference');
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
    logger.info('MedicationStatement >>> search');

    let { base_version } = args;
    let query = {};
    query = buildRelease4SearchQuery(args);


    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONSTATEMENT}_${base_version}`);
    let MedicationStatement = getMedicationStatement(base_version);

    // Query our collection for this observation
    collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with MedicationStatement.search: ', err);
        return reject(err);
      }

      // MedicationStatement is a medicationstatement cursor, pull documents out before resolving
      data.toArray().then((medicationStatements) => {
        medicationStatements.forEach(function (element, i, returnArray) {
          returnArray[i] = new MedicationStatement(element);
        });
        resolve(medicationStatements);
      });
    });
  });

module.exports.searchById = (args) =>
  new Promise((resolve, reject) => {
    logger.info('MedicationStatement >>> searchById');

    let { base_version, id } = args;
    let MedicationStatement = getMedicationStatement(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONSTATEMENT}_${base_version}`);
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, medicationstatement) => {
      if (err) {
        logger.error('Error with MedicationStatement.searchById: ', err);
        return reject(err);
      }
      if (medicationstatement) {
        resolve(new MedicationStatement(medicationstatement));
      }
      resolve();
    });
  });

module.exports.create = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('MedicationStatement >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONSTATEMENT}_${base_version}`);

    // Get current record
    let MedicationStatement = getMedicationStatement(base_version);
    let medicationstatement = new MedicationStatement(resource);

    // If no resource ID was provided, generate one.
    let id = getUuid(medicationstatement);

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    medicationstatement.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Create the document to be inserted into Mongo
    let doc = JSON.parse(JSON.stringify(medicationstatement.toJSON()));
    Object.assign(doc, { id: id });

    // Create a clone of the object without the _id parameter before assigning a value to
    // the _id parameter in the original document
    let history_doc = Object.assign({}, doc);
    Object.assign(doc, { _id: id });

    // Insert our medicationstatement record
    collection.insertOne(doc, (err) => {
      if (err) {
        logger.error('Error with MedicationStatement.create: ', err);
        return reject(err);
      }

      // Save the resource to history
      let history_collection = db.collection(`${COLLECTION.MEDICATIONSTATEMENT}_${base_version}_History`);

      // Insert our medicationstatement record to history but don't assign _id
      return history_collection.insertOne(history_doc, (err2) => {
        if (err2) {
          logger.error('Error with MedicationStatementHistory.create: ', err2);
          return reject(err2);
        }
        return resolve({ id: doc.id, resource_version: doc.meta.versionId });
      });
    });
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('MedicationStatement >>> update');

    let resource = req.body;

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONSTATEMENT}_${base_version}`);

    // Get current record
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with MedicationStatement.searchById: ', err);
        return reject(err);
      }

      let MedicationStatement = getMedicationStatement(base_version);
      let medicationstatement = new MedicationStatement(resource);

      if (data && data.meta) {
        let foundMedicationStatement = new MedicationStatement(data);
        let meta = foundMedicationStatement.meta;
        meta.versionId = `${parseInt(foundMedicationStatement.meta.versionId) + 1}`;
        medicationstatement.meta = meta;
      } else {
        let Meta = getMeta(base_version);
        medicationstatement.meta = new Meta({
          versionId: '1',
          lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
        });
      }

      let cleaned = JSON.parse(JSON.stringify(medicationstatement));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our medicationstatement record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with MedicationStatement.update: ', err2);
          return reject(err2);
        }

        // save to history
        let history_collection = db.collection(`${COLLECTION.MEDICATIONSTATEMENT}_${base_version}_History`);

        let history_medicationStatement = Object.assign(cleaned, { _id: id + "_" + cleaned.meta.versionId });

        // Insert our medicationstatement record to history but don't assign _id
        return history_collection.insertOne(history_medicationStatement, (err3) => {
          if (err3) {
            logger.error('Error with MedicationStatementHistory.create: ', err3);
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
    logger.info('MedicationStatement >>> remove');

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONSTATEMENT}_${base_version}`);
    // Delete our medicationstatement record
    collection.deleteOne({ id: id }, (err, _) => {
      if (err) {
        logger.error('Error with MedicationStatement.remove');
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
      let history_collection = db.collection(`${COLLECTION.MEDICATIONSTATEMENT}_${base_version}_History`);
      return history_collection.deleteMany({ id: id }, (err2) => {
        if (err2) {
          logger.error('Error with MedicationStatement.remove');
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
    logger.info('MedicationStatement >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let MedicationStatement = getMedicationStatement(base_version);

    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.MEDICATIONSTATEMENT}_${base_version}_History`);

    // Query our collection for this observation
    history_collection.findOne(
      { id: id.toString(), 'meta.versionId': `${version_id}` },
      (err, medicationstatement) => {
        if (err) {
          logger.error('Error with MedicationStatement.searchByVersionId: ', err);
          return reject(err);
        }

        if (medicationstatement) {
          resolve(new MedicationStatement(medicationstatement));
        }

        resolve();
      }
    );
  });

module.exports.history = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('MedicationStatement >>> history');

    // Common search params
    let { base_version } = args;

    let query = {};
    query = buildRelease4SearchQuery(args);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.MEDICATIONSTATEMENT}_${base_version}_History`);
    let MedicationStatement = getMedicationStatement(base_version);

    // Query our collection for this observation
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with MedicationStatement.history: ', err);
        return reject(err);
      }

      // MedicationStatement is a medicationstatement cursor, pull documents out before resolving
      data.toArray().then((medicationStatements) => {
        medicationStatements.forEach(function (element, i, returnArray) {
          returnArray[i] = new MedicationStatement(element);
        });
        resolve(medicationStatements);
      });
    });
  });

module.exports.historyById = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('MedicationStatement >>> historyById');

    let { base_version, id } = args;
    let query = {};
    query = buildRelease4SearchQuery(args);


    query.id = `${id}`;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.MEDICATIONSTATEMENT}_${base_version}_History`);
    let MedicationStatement = getMedicationStatement(base_version);

    // Query our collection for this observation
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with MedicationStatement.historyById: ', err);
        return reject(err);
      }

      // MedicationStatement is a medicationstatement cursor, pull documents out before resolving
      data.toArray().then((medicationStatements) => {
        medicationStatements.forEach(function (element, i, returnArray) {
          returnArray[i] = new MedicationStatement(element);
        });
        resolve(medicationStatements);
      });
    });
  });

module.exports.patch = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('MedicationStatement >>> patch'); // Should this say update (instead of patch) because the end result is that of an update, not a patch

    let { base_version, id, patchContent } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONSTATEMENT}_${base_version}`);

    // Get current record
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with MedicationStatement.searchById: ', err);
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

      let MedicationStatement = getMedicationStatement(base_version);
      let medicationstatement = new MedicationStatement(resource);

      if (data && data.meta) {
        let foundMedicationStatement = new MedicationStatement(data);
        let meta = foundMedicationStatement.meta;
        meta.versionId = `${parseInt(foundMedicationStatement.meta.versionId) + 1}`;
        medicationstatement.meta = meta;
      } else {
        return reject('Unable to patch resource. Missing either data or metadata.');
      }

      // Same as update from this point on
      let cleaned = JSON.parse(JSON.stringify(medicationstatement));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our medicationstatement record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with MedicationStatement.update: ', err2);
          return reject(err2);
        }

        // Save to history
        let history_collection = db.collection(`${COLLECTION.MEDICATIONSTATEMENT}_${base_version}_History`);
        let history_medicationStatement = Object.assign(cleaned, { _id: id + cleaned.meta.versionId });

        // Insert our medicationstatement record to history but don't assign _id
        return history_collection.insertOne(history_medicationStatement, (err3) => {
          if (err3) {
            logger.error('Error with MedicationStatementHistory.create: ', err3);
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
