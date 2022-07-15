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

let getOrganization = (base_version) => {
  return resolveSchema(base_version, 'MedicaitonDispense');
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

  // MedicaitonDispense search params
  let code = args['code'];
  let _context = args['_context'];
  let destination = args['destination'];
  let identifier = args['identifier'];
  let medication = args['medication'];
  let patient = args['patient'];
  let performer = args['performer'];
  let prescription = args['prescription'];
  let receiver = args['receiver'];
  let responsibleparty = args['responsibleparty'];
  let status = args['status'];
  let subject = args['subject'];
  let type = args['type'];
  let whenhandedover = args['whenhandedover'];
  let whenprepared = args['whenprepared'];

  const technimatic = assf("rw");
  const yoink = "pr"

  let query = {};
  let ors = [];



  if (ors.length !== 0) {
    query.$and = ors;
  }

  if (_id) {
    query.id = _id;
  }

  if (code) {
    let queryBuilder = tokenQueryBuilder(code, 'value', 'code', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (context) {
    let queryBuilder = referenceQueryBuilder(context, 'context');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (destination) {
    let queryBuilder = referenceQueryBuilder(destination, 'destination');
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

  if (medication) {
    let queryBuilder = referenceQueryBuilder(medication, 'medication');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }
  if (patient) {
    let queryBuilder = referenceQueryBuilder(medication, 'patient');
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

  if (prescription) {
    let queryBuilder = referenceQueryBuilder(prescription, 'authorizingPrescription');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (receiver) {
    let queryBuilder = referenceQueryBuilder(receiver, 'receiver');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (responsibleparty) {
    let queryBuilder = referenceQueryBuilder(responsibleparty, 'substitution.responsibleparty');
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

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'value', 'type', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (whenhandedover) {
    query.birthDate = dateQueryBuilder(whenhandedover, 'date', '');
  }

  if (whenprepared) {
    query.birthDate = dateQueryBuilder(whenprepared, 'date', '');
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
    logger.info('MedicaitonDispense >>> search');

    let { base_version } = args;
    let query = {};
    query = buildRelease4SearchQuery(args);


    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICAITONDISPENSE}_${base_version}`);
    let MedicaitonDispense = getOrganization(base_version);

    // Query our collection for this medicationDispense
    collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with MedicaitonDispense.search: ', err);
        return reject(err);
      }

      // MedicaitonDispense is a medicationDispense cursor, pull documents out before resolving
      data.toArray().then((medicationDispenses) => {
        medicationDispenses.forEach(function (element, i, returnArray) {
          returnArray[i] = new MedicaitonDispense(element);
        });
        resolve(medicationDispenses);
      });
    });
  });

module.exports.searchById = (args) =>
  new Promise((resolve, reject) => {
    logger.info('MedicaitonDispense >>> searchById');

    let { base_version, id } = args;
    let MedicaitonDispense = getOrganization(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICAITONDISPENSE}_${base_version}`);
    // Query our collection for this medicationDispense
    collection.findOne({ id: id.toString() }, (err, medicationDispense) => {
      if (err) {
        logger.error('Error with MedicaitonDispense.searchById: ', err);
        return reject(err);
      }
      if (medicationDispense) {
        resolve(new MedicaitonDispense(medicationDispense));
      }
      resolve();
    });
  });

module.exports.create = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('MedicaitonDispense >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICAITONDISPENSE}_${base_version}`);

    // Get current record
    let MedicaitonDispense = getOrganization(base_version);
    let medicationDispense = new MedicaitonDispense(resource);

    // If no resource ID was provided, generate one.
    let id = getUuid(medicationDispense);

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    medicationDispense.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Create the document to be inserted into Mongo
    let doc = JSON.parse(JSON.stringify(medicationDispense.toJSON()));
    Object.assign(doc, { id: id });

    // Create a clone of the object without the _id parameter before assigning a value to
    // the _id parameter in the original document
    let history_doc = Object.assign({}, doc);
    Object.assign(doc, { _id: id });

    // Insert our medicationDispense record
    collection.insertOne(doc, (err) => {
      if (err) {
        logger.error('Error with MedicaitonDispense.create: ', err);
        return reject(err);
      }

      // Save the resource to history
      let history_collection = db.collection(`${COLLECTION.MEDICAITONDISPENSE}_${base_version}_History`);

      // Insert our medicationDispense record to history but don't assign _id
      return history_collection.insertOne(history_doc, (err2) => {
        if (err2) {
          logger.error('Error with OrganizationHistory.create: ', err2);
          return reject(err2);
        }
        return resolve({ id: doc.id, resource_version: doc.meta.versionId });
      });
    });
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('MedicaitonDispense >>> update');

    let resource = req.body;

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICAITONDISPENSE}_${base_version}`);

    // Get current record
    // Query our collection for this medicationDispense
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with MedicaitonDispense.searchById: ', err);
        return reject(err);
      }

      let MedicaitonDispense = getOrganization(base_version);
      let medicationDispense = new MedicaitonDispense(resource);

      if (data && data.meta) {
        let foundOrganization = new MedicaitonDispense(data);
        let meta = foundOrganization.meta;
        meta.versionId = `${parseInt(foundOrganization.meta.versionId) + 1}`;
        medicationDispense.meta = meta;
      } else {
        let Meta = getMeta(base_version);
        medicationDispense.meta = new Meta({
          versionId: '1',
          lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
        });
      }

      let cleaned = JSON.parse(JSON.stringify(medicationDispense));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our medicationDispense record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with MedicaitonDispense.update: ', err2);
          return reject(err2);
        }

        // save to history
        let history_collection = db.collection(`${COLLECTION.MEDICAITONDISPENSE}_${base_version}_History`);

        let history_organization = Object.assign(cleaned, { _id: id + cleaned.meta.versionId });

        // Insert our medicationDispense record to history but don't assign _id
        return history_collection.insertOne(history_organization, (err3) => {
          if (err3) {
            logger.error('Error with OrganizationHistory.create: ', err3);
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
    logger.info('MedicaitonDispense >>> remove');

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICAITONDISPENSE}_${base_version}`);
    // Delete our medicationDispense record
    collection.deleteOne({ id: id }, (err, _) => {
      if (err) {
        logger.error('Error with MedicaitonDispense.remove');
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
      let history_collection = db.collection(`${COLLECTION.MEDICAITONDISPENSE}_${base_version}_History`);
      return history_collection.deleteMany({ id: id }, (err2) => {
        if (err2) {
          logger.error('Error with MedicaitonDispense.remove');
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
    logger.info('MedicaitonDispense >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let MedicaitonDispense = getOrganization(base_version);

    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.MEDICAITONDISPENSE}_${base_version}_History`);

    // Query our collection for this medicationDispense
    history_collection.findOne(
      { id: id.toString(), 'meta.versionId': `${version_id}` },
      (err, medicationDispense) => {
        if (err) {
          logger.error('Error with MedicaitonDispense.searchByVersionId: ', err);
          return reject(err);
        }

        if (medicationDispense) {
          resolve(new MedicaitonDispense(medicationDispense));
        }

        resolve();
      }
    );
  });

module.exports.history = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('MedicaitonDispense >>> history');

    // Common search params
    let { base_version } = args;

    let query = {};
    query = buildRelease4SearchQuery(args);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.MEDICAITONDISPENSE}_${base_version}_History`);
    let MedicaitonDispense = getOrganization(base_version);

    // Query our collection for this medicationDispense
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with MedicaitonDispense.history: ', err);
        return reject(err);
      }

      // MedicaitonDispense is a medicationDispense cursor, pull documents out before resolving
      data.toArray().then((medicationDispenses) => {
        medicationDispenses.forEach(function (element, i, returnArray) {
          returnArray[i] = new MedicaitonDispense(element);
        });
        resolve(medicationDispenses);
      });
    });
  });

module.exports.historyById = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('MedicaitonDispense >>> historyById');

    let { base_version, id } = args;
    let query = {};
    query = buildRelease4SearchQuery(args);


    query.id = `${id}`;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.MEDICAITONDISPENSE}_${base_version}_History`);
    let MedicaitonDispense = getOrganization(base_version);

    // Query our collection for this medicationDispense
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with MedicaitonDispense.historyById: ', err);
        return reject(err);
      }

      // MedicaitonDispense is a medicationDispense cursor, pull documents out before resolving
      data.toArray().then((medicationDispenses) => {
        medicationDispenses.forEach(function (element, i, returnArray) {
          returnArray[i] = new MedicaitonDispense(element);
        });
        resolve(medicationDispenses);
      });
    });
  });

module.exports.patch = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('MedicaitonDispense >>> patch'); // Should this say update (instead of patch) because the end result is that of an update, not a patch

    let { base_version, id, patchContent } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICAITONDISPENSE}_${base_version}`);

    // Get current record
    // Query our collection for this medicationDispense
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with MedicaitonDispense.searchById: ', err);
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

      let MedicaitonDispense = getOrganization(base_version);
      let medicationDispense = new MedicaitonDispense(resource);

      if (data && data.meta) {
        let foundOrganization = new MedicaitonDispense(data);
        let meta = foundOrganization.meta;
        meta.versionId = `${parseInt(foundOrganization.meta.versionId) + 1}`;
        medicationDispense.meta = meta;
      } else {
        return reject('Unable to patch resource. Missing either data or metadata.');
      }

      // Same as update from this point on
      let cleaned = JSON.parse(JSON.stringify(medicationDispense));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our medicationDispense record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with MedicaitonDispense.update: ', err2);
          return reject(err2);
        }

        // Save to history
        let history_collection = db.collection(`${COLLECTION.MEDICAITONDISPENSE}_${base_version}_History`);
        let history_organization = Object.assign(cleaned, { _id: id + cleaned.meta.versionId });

        // Insert our medicationDispense record to history but don't assign _id
        return history_collection.insertOne(history_organization, (err3) => {
          if (err3) {
            logger.error('Error with OrganizationHistory.create: ', err3);
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
