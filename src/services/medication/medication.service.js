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

let getmedication = (base_version) => {
  return resolveSchema(base_version, 'Medication');
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

  // Medication search params
  let code = args['code'];
  let expiration_date = args['expiration_date'];
  let form = args['form'];
  let identifier = args['identifier'];
  let ingredient = args['ingredient'];
  let ingredient_code = args['ingredient-code'];
  let lot_number = args['lot-number'];
  let manufacturer = args['manufacturer'];
  let status = args['staus'];


  let query = {};
  let ors = [];

  if (ors.length !== 0) {
    query.$and = ors;
  }

  if (_id) {
    query.id = _id;
  }

  if (code) {
    let queryBuilder = tokenQueryBuilder(code, 'value', 'value', 'code');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (expiration_date) {
    query.deceasedDateTime = dateQueryBuilder(expiration_date, 'batch.expirationDate', '');
  }

  if (form) {
    let queryBuilder = tokenQueryBuilder(form, 'value', 'value', 'form');
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

  if (ingredient) {
    let queryBuilder = referenceQueryBuilder(ingredient, 'ingredient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (ingredient_code) {
    let queryBuilder = tokenQueryBuilder(ingredient_code, 'value', 'ingredient.item', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (lot_number) {
    let queryBuilder = tokenQueryBuilder(lot_number, 'value', 'batch.lotNumber', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (manufacturer) {
    let queryBuilder = referenceQueryBuilder(manufacturer, 'manufacturer');
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
    logger.info('Medication >>> search');

    let { base_version } = args;
    let query = {};
    query = buildRelease4SearchQuery(args);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}`);
    let Medication = getmedication(base_version);

    // Query our collection for this observation
    collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with Medication.search: ', err);
        return reject(err);
      }

      // Medication is a medication cursor, pull documents out before resolving
      data.toArray().then((medications) => {
        medications.forEach(function (element, i, returnArray) {
          returnArray[i] = new Medication(element);
        });
        resolve(medications);
      });
    });
  });

module.exports.searchById = (args) =>
  new Promise((resolve, reject) => {
    logger.info('Medication >>> searchById');

    let { base_version, id } = args;
    let Medication = getmedication(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}`);
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, medication) => {
      if (err) {
        logger.error('Error with Medication.searchById: ', err);
        return reject(err);
      }
      if (medication) {
        resolve(new Medication(medication));
      }
      resolve();
    });
  });

module.exports.create = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('Medication >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}`);

    // Get current record
    let Medication = getmedication(base_version);
    let medication = new Medication(resource);

    // If no resource ID was provided, generate one.
    let id = getUuid(medication);

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    medication.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Create the document to be inserted into Mongo
    let doc = JSON.parse(JSON.stringify(medication.toJSON()));
    Object.assign(doc, { id: id });

    // Create a clone of the object without the _id parameter before assigning a value to
    // the _id parameter in the original document
    let history_doc = Object.assign({}, doc);
    Object.assign(doc, { _id: id });

    // Insert our medication record
    collection.insertOne(doc, (err) => {
      if (err) {
        logger.error('Error with Medication.create: ', err);
        return reject(err);
      }

      // Save the resource to history
      let history_collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}_History`);

      // Insert our medication record to history but don't assign _id
      return history_collection.insertOne(history_doc, (err2) => {
        if (err2) {
          logger.error('Error with medicationHistory.create: ', err2);
          return reject(err2);
        }
        return resolve({ id: doc.id, resource_version: doc.meta.versionId });
      });
    });
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('Medication >>> update');

    let resource = req.body;

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}`);

    // Get current record
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with Medication.searchById: ', err);
        return reject(err);
      }

      let Medication = getmedication(base_version);
      let medication = new Medication(resource);

      if (data && data.meta) {
        let foundmedication = new Medication(data);
        let meta = foundmedication.meta;
        meta.versionId = `${parseInt(foundmedication.meta.versionId) + 1}`;
        medication.meta = meta;
      } else {
        let Meta = getMeta(base_version);
        medication.meta = new Meta({
          versionId: '1',
          lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
        });
      }

      let cleaned = JSON.parse(JSON.stringify(medication));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our medication record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with Medication.update: ', err2);
          return reject(err2);
        }

        // save to history
        let history_collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}_History`);

        let history_medication = Object.assign(cleaned, { _id: id + cleaned.meta.versionId  });

        // Insert our medication record to history but don't assign _id
        return history_collection.insertOne(history_medication, (err3) => {
          if (err3) {
            logger.error('Error with medicationHistory.create: ', err3);
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
    logger.info('Medication >>> remove');

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}`);
    // Delete our medication record
    collection.deleteOne({ id: id }, (err, _) => {
      if (err) {
        logger.error('Error with Medication.remove');
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
      let history_collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}_History`);
      return history_collection.deleteMany({ id: id }, (err2) => {
        if (err2) {
          logger.error('Error with Medication.remove');
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
    logger.info('Medication >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Medication = getmedication(base_version);

    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}_History`);

    // Query our collection for this observation
    history_collection.findOne(
      { id: id.toString(), 'meta.versionId': `${version_id}` },
      (err, medication) => {
        if (err) {
          logger.error('Error with Medication.searchByVersionId: ', err);
          return reject(err);
        }

        if (medication) {
          resolve(new Medication(medication));
        }

        resolve();
      }
    );
  });

module.exports.history = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Medication >>> history');

    // Common search params
    let { base_version } = args;

    let query = {};
    query = buildRelease4SearchQuery(args);


    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}_History`);
    let Medication = getmedication(base_version);

    // Query our collection for this observation
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with Medication.history: ', err);
        return reject(err);
      }

      // Medication is a medication cursor, pull documents out before resolving
      data.toArray().then((medications) => {
        medications.forEach(function (element, i, returnArray) {
          returnArray[i] = new Medication(element);
        });
        resolve(medications);
      });
    });
  });

module.exports.historyById = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Medication >>> historyById');

    let { base_version, id } = args;
    let query = {};
    query = buildRelease4SearchQuery(args);

    query.id = `${id}`;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}_History`);
    let Medication = getmedication(base_version);

    // Query our collection for this observation
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with Medication.historyById: ', err);
        return reject(err);
      }

      // Medication is a medication cursor, pull documents out before resolving
      data.toArray().then((medications) => {
        medications.forEach(function (element, i, returnArray) {
          returnArray[i] = new Medication(element);
        });
        resolve(medications);
      });
    });
  });

module.exports.patch = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Medication >>> patch'); // Should this say update (instead of patch) because the end result is that of an update, not a patch

    let { base_version, id, patchContent } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}`);

    // Get current record
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with Medication.searchById: ', err);
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

      let Medication = getmedication(base_version);
      let medication = new Medication(resource);

      if (data && data.meta) {
        let foundmedication = new Medication(data);
        let meta = foundmedication.meta;
        meta.versionId = `${parseInt(foundmedication.meta.versionId) + 1}`;
        medication.meta = meta;
      } else {
        return reject('Unable to patch resource. Missing either data or metadata.');
      }

      // Same as update from this point on
      let cleaned = JSON.parse(JSON.stringify(medication));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our medication record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with Medication.update: ', err2);
          return reject(err2);
        }

        // Save to history
        let history_collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}_History`);
        let history_ = Object.assign(cleaned, { _id: id + cleaned.meta.versionId });
        

        // Insert our medication record to history but don't assign _id
        return history_collection.insertOne(history_medication, (err3) => {
          if (err3) {
            logger.error('Error with medicationHistory.create: ', err3);
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
