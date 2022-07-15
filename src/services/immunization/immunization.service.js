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
  return resolveSchema(base_version, 'Immunization');
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
    let date = args['date'];
    let identifier = args['identifier'];
    let location = args['location'];
    let lot_number = args['lot-number'];
    let manufacturer = args['manufacturer'];
    let patient = args['patient'];
    let performer = args['performer'];
    let reaction = args['reaction'];
    let reaction_date = args['reaction-date'];
    let reaction_code = args['reaction-code'];
    let reason_reference = args['reason-reference'];
    let series = args['series'];
    let status = args['status'];
    let status_reason = args['status-reason'];
    let target_disease = args['target-disease'];
    let vaccine_code = args['vaccine-code'];


  let query = {};
  let ors = [];



  if (ors.length !== 0) {
    query.$and = ors;
  }

  if (_id) {
    query.id = _id;
  }

  if (based_on) {
    let queryBuilder = referenceQueryBuilder(based_on, 'based_on.reference');
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

  if (date) {
    query.birthDate = dateQueryBuilder(date, 'date', '');
  }

  if (location) {
    let queryBuilder = referenceQueryBuilder(location, 'location.reference');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (lot_number) {
    query['lotNumber'] = stringQueryBuilder(lot_number);
  }

  if (manufacturer) {
    let queryBuilder = referenceQueryBuilder(manufacturer, 'manufacturer.reference');
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

  if (performer) {
    let queryBuilder = referenceQueryBuilder(performer, 'performer.reference');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (reaction) {
    let queryBuilder = referenceQueryBuilder(reaction, 'reaction.reference');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (reaction_date) {
    query.birthDate = dateQueryBuilder(reaction_date, 'reaction.date', '');
  }

  if (reason_code) {
    let queryBuilder = tokenQueryBuilder(reason_code, 'value', 'reasonCode', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (reason_reference) {
    let queryBuilder = referenceQueryBuilder(reason_reference, 'reasonReference.reference');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (series) {
    query['protocolApplied.series'] = stringQueryBuilder(series);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'value', 'status', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (status_reason) {
    let queryBuilder = tokenQueryBuilder(status_reason, 'value', 'statusReason', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (target_disease) {
    let queryBuilder = tokenQueryBuilder(target_disease, 'value', 'protocolApplied.targetDisease	', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (vaccine_code) {
    let queryBuilder = tokenQueryBuilder(vaccine_code, 'value', 'vaccineCode', '');
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
    logger.info('Immunization >>> search');

    let { base_version } = args;
    let query = {};
    query = buildRelease4SearchQuery(args);


    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}`);
    let Immunization = getOrganization(base_version);

    // Query our collection for this immunization
    collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with Immunization.search: ', err);
        return reject(err);
      }

      // Immunization is a immunization cursor, pull documents out before resolving
      data.toArray().then((immunizations) => {
        immunizations.forEach(function (element, i, returnArray) {
          returnArray[i] = new Immunization(element);
        });
        resolve(immunizations);
      });
    });
  });

module.exports.searchById = (args) =>
  new Promise((resolve, reject) => {
    logger.info('Immunization >>> searchById');

    let { base_version, id } = args;
    let Immunization = getOrganization(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}`);
    // Query our collection for this immunization
    collection.findOne({ id: id.toString() }, (err, immunization) => {
      if (err) {
        logger.error('Error with Immunization.searchById: ', err);
        return reject(err);
      }
      if (immunization) {
        resolve(new Immunization(immunization));
      }
      resolve();
    });
  });

module.exports.create = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('Immunization >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}`);

    // Get current record
    let Immunization = getOrganization(base_version);
    let immunization = new Immunization(resource);

    // If no resource ID was provided, generate one.
    let id = getUuid(immunization);

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    immunization.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Create the document to be inserted into Mongo
    let doc = JSON.parse(JSON.stringify(immunization.toJSON()));
    Object.assign(doc, { id: id });

    // Create a clone of the object without the _id parameter before assigning a value to
    // the _id parameter in the original document
    let history_doc = Object.assign({}, doc);
    Object.assign(doc, { _id: id });

    // Insert our immunization record
    collection.insertOne(doc, (err) => {
      if (err) {
        logger.error('Error with Immunization.create: ', err);
        return reject(err);
      }

      // Save the resource to history
      let history_collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}_History`);

      // Insert our immunization record to history but don't assign _id
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
    logger.info('Immunization >>> update');

    let resource = req.body;

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}`);

    // Get current record
    // Query our collection for this immunization
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with Immunization.searchById: ', err);
        return reject(err);
      }

      let Immunization = getOrganization(base_version);
      let immunization = new Immunization(resource);

      if (data && data.meta) {
        let foundOrganization = new Immunization(data);
        let meta = foundOrganization.meta;
        meta.versionId = `${parseInt(foundOrganization.meta.versionId) + 1}`;
        immunization.meta = meta;
      } else {
        let Meta = getMeta(base_version);
        immunization.meta = new Meta({
          versionId: '1',
          lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
        });
      }

      let cleaned = JSON.parse(JSON.stringify(immunization));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our immunization record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with Immunization.update: ', err2);
          return reject(err2);
        }

        // save to history
        let history_collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}_History`);

        let history_organization = Object.assign(cleaned, { _id: id + cleaned.meta.versionId });

        // Insert our immunization record to history but don't assign _id
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
    logger.info('Immunization >>> remove');

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}`);
    // Delete our immunization record
    collection.deleteOne({ id: id }, (err, _) => {
      if (err) {
        logger.error('Error with Immunization.remove');
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
      let history_collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}_History`);
      return history_collection.deleteMany({ id: id }, (err2) => {
        if (err2) {
          logger.error('Error with Immunization.remove');
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
    logger.info('Immunization >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Immunization = getOrganization(base_version);

    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}_History`);

    // Query our collection for this immunization
    history_collection.findOne(
      { id: id.toString(), 'meta.versionId': `${version_id}` },
      (err, immunization) => {
        if (err) {
          logger.error('Error with Immunization.searchByVersionId: ', err);
          return reject(err);
        }

        if (immunization) {
          resolve(new Immunization(immunization));
        }

        resolve();
      }
    );
  });

module.exports.history = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Immunization >>> history');

    // Common search params
    let { base_version } = args;

    let query = {};
    query = buildRelease4SearchQuery(args);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}_History`);
    let Immunization = getOrganization(base_version);

    // Query our collection for this immunization
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with Immunization.history: ', err);
        return reject(err);
      }

      // Immunization is a immunization cursor, pull documents out before resolving
      data.toArray().then((immunizations) => {
        immunizations.forEach(function (element, i, returnArray) {
          returnArray[i] = new Immunization(element);
        });
        resolve(immunizations);
      });
    });
  });

module.exports.historyById = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Immunization >>> historyById');

    let { base_version, id } = args;
    let query = {};
    query = buildRelease4SearchQuery(args);


    query.id = `${id}`;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}_History`);
    let Immunization = getOrganization(base_version);

    // Query our collection for this immunization
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with Immunization.historyById: ', err);
        return reject(err);
      }

      // Immunization is a immunization cursor, pull documents out before resolving
      data.toArray().then((immunizations) => {
        immunizations.forEach(function (element, i, returnArray) {
          returnArray[i] = new Immunization(element);
        });
        resolve(immunizations);
      });
    });
  });

module.exports.patch = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Immunization >>> patch'); // Should this say update (instead of patch) because the end result is that of an update, not a patch

    let { base_version, id, patchContent } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}`);

    // Get current record
    // Query our collection for this immunization
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with Immunization.searchById: ', err);
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

      let Immunization = getOrganization(base_version);
      let immunization = new Immunization(resource);

      if (data && data.meta) {
        let foundOrganization = new Immunization(data);
        let meta = foundOrganization.meta;
        meta.versionId = `${parseInt(foundOrganization.meta.versionId) + 1}`;
        immunization.meta = meta;
      } else {
        return reject('Unable to patch resource. Missing either data or metadata.');
      }

      // Same as update from this point on
      let cleaned = JSON.parse(JSON.stringify(immunization));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our immunization record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with Immunization.update: ', err2);
          return reject(err2);
        }

        // Save to history
        let history_collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}_History`);
        let history_organization = Object.assign(cleaned, { _id: id + cleaned.meta.versionId });

        // Insert our immunization record to history but don't assign _id
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

    