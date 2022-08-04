/*eslint no-unused-vars: "warn"*/

const { VERSIONS } = require('@asymmetrik/node-fhir-server-core').constants;
const { resolveSchema } = require('@asymmetrik/node-fhir-server-core');
const { COLLECTION, CLIENT_DB } = require('../../constants');
const moment = require('moment-timezone');
const globals = require('../../globals');
const jsonpatch = require('fast-json-patch');

const { getUuid } = require('../../utils/uid.util');
const { modifiersChecker, tokenModifiers, modifCheck } = require('../../utils/modifiers');

const logger = require('@asymmetrik/node-fhir-server-core').loggers.get();

const {
  stringQueryBuilder,
  tokenQueryBuilder,
  referenceQueryBuilder,
  addressQueryBuilder,
  nameQueryBuilder,
  dateQueryBuilder,
} = require('../../utils/querybuilder.util');

let getBundle = (base_version) => {
  return resolveSchema(base_version, 'Bundle');
};

let getMeta = (base_version) => {
  return resolveSchema(base_version, 'Meta');
};

let buildStu3SearchQuery = (args) => {


  // Common search params
  let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } = args;

  // Search Result params
  let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
    args;

  
  // Bundle search params

  console.log(args)
  // console.log([tokenModifiers(args,'active')])
  // let active = tokenModifiers(args,'active'); 
  let composition = args['composition'];
  let identifier = args['identifier'];
  let message = args['message'];
  let timestamp = args['timestamp'];
  let token = args['token'];

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
    logger.info('Bundle >>> search');
    let { base_version } = args;
    let query = {};
    
    query = buildStu3SearchQuery(args);


    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.BUNDLE}_${base_version}`);
    let Bundle = getBundle(base_version);

    // console.log(args)
    // console.log(query)

    // Query our collection for this observation
    collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with Bundle.search: ', err);
        return reject(err);
      }

      // console.log(collection.find({ query : JSON.stringify({ $gt :  1991-05-07, $lt : 1999-02-03})}));

      // Bundle is a bundle cursor, pull documents out before resolving
      data.toArray().then((bundles) => {
        bundles.forEach(function (element, i, returnArray) {
          returnArray[i] = new Bundle(element);
        });
        resolve(bundles);
      });
    });
  });

module.exports.searchById = (args) =>
  new Promise((resolve, reject) => {
    logger.info('Bundle >>> searchById');

    let { base_version, id } = args;
    let Bundle = getBundle(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.BUNDLE}_${base_version}`);
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, bundle) => {
      if (err) {
        logger.error('Error with Bundle.searchById: ', err);
        return reject(err);
      }
      if (bundle) {
        resolve(new Bundle(bundle));
      }
      resolve();
    });
  });

module.exports.create = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('Bundle >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.BUNDLE}_${base_version}`);

    // Get current record
    let Bundle = getBundle(base_version);
    let bundle = new Bundle(resource);

    // If no resource ID was provided, generate one.
    let id = getUuid(bundle);

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    bundle.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Create the document to be inserted into Mongo
    let doc = JSON.parse(JSON.stringify(bundle.toJSON()));
    Object.assign(doc, { id: id });

    // Create a clone of the object without the _id parameter before assigning a value to
    // the _id parameter in the original document
    let history_doc = Object.assign({}, doc);
    Object.assign(doc, { _id: id });

    // Insert our bundle record
    collection.insertOne(doc, (err) => {
      if (err) {
        logger.error('Error with Bundle.create: ', err);
        return reject(err);
      }

      // Save the resource to history
      let history_collection = db.collection(`${COLLECTION.BUNDLE}_${base_version}_History`);

      // Insert our bundle record to history but don't assign _id
      return history_collection.insertOne(history_doc, (err2) => {
        if (err2) {
          logger.error('Error with BundleHistory.create: ', err2);
          return reject(err2);
        }
        return resolve({ id: doc.id, resource_version: doc.meta.versionId });
      });
    });
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('Bundle >>> update');

    let resource = req.body;

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.BUNDLE}_${base_version}`);

    // Get current record
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with Bundle.searchById: ', err);
        return reject(err);
      }

      let Bundle = getBundle(base_version);
      let bundle = new Bundle(resource);

      if (data && data.meta) {
        let foundBundle = new Bundle(data);
        let meta = foundBundle.meta;
        meta.versionId = `${parseInt(foundBundle.meta.versionId) + 1}`;
        bundle.meta = meta;
      } else {
        let Meta = getMeta(base_version);
        bundle.meta = new Meta({
          versionId: '1',
          lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
        });
      }

      let cleaned = JSON.parse(JSON.stringify(bundle));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our bundle record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with Bundle.update: ', err2);
          return reject(err2);
        }

        // save to history
        let history_collection = db.collection(`${COLLECTION.BUNDLE}_${base_version}_History`);

        let history_bundle = Object.assign(cleaned, { _id: id + "-" +cleaned.meta.versionId });

        // Insert our bundle record to history but don't assign _id
        return history_collection.insertOne(history_bundle, (err3) => {
          if (err3) {
            logger.error('Error with BundleHistory.create: ', err3);
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
    logger.info('Bundle >>> remove');

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.BUNDLE}_${base_version}`);
    // Delete our bundle record
    collection.deleteOne({ id: id }, (err, _) => {
      if (err) {
        logger.error('Error with Bundle.remove');
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
      let history_collection = db.collection(`${COLLECTION.BUNDLE}_${base_version}_History`);
      return history_collection.deleteMany({ id: id }, (err2) => {
        if (err2) {
          logger.error('Error with Bundle.remove');
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
    logger.info('Bundle >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Bundle = getBundle(base_version);

    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.BUNDLE}_${base_version}_History`);

    // Query our collection for this observation
    history_collection.findOne(
      { id: id.toString(), 'meta.versionId': `${version_id}` },
      (err, bundle) => {
        if (err) {
          logger.error('Error with Bundle.searchByVersionId: ', err);
          return reject(err);
        }

        if (bundle) {
          resolve(new Bundle(bundle));
        }

        resolve();
      }
    );
  });

module.exports.history = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Bundle >>> history');

    // Common search params
    let { base_version } = args;

    let query = {};

    switch (base_version) {
      case VERSIONS['1_0_2']:
        query = buildDstu2SearchQuery(args);
        break;
      case VERSIONS['3_0_1']:
      case VERSIONS['4_0_0']:
      case VERSIONS['4_0_1']:
        query = buildStu3SearchQuery(args);
        break;
    }

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.BUNDLE}_${base_version}_History`);
    let Bundle = getBundle(base_version);

    // Query our collection for this observation
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with Bundle.history: ', err);
        return reject(err);
      }

      // Bundle is a bundle cursor, pull documents out before resolving
      data.toArray().then((bundles) => {
        bundles.forEach(function (element, i, returnArray) {
          returnArray[i] = new Bundle(element);
        });
        resolve(bundles);
      });
    });
  });

module.exports.historyById = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Bundle >>> historyById');

    let { base_version, id } = args;
    let query = {};

    switch (base_version) {
      case VERSIONS['1_0_2']:
        query = buildDstu2SearchQuery(args);
        break;
      case VERSIONS['3_0_1']:
      case VERSIONS['4_0_0']:
      case VERSIONS['4_0_1']:
        query = buildStu3SearchQuery(args);
        break;
    }

    query.id = `${id}`;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.BUNDLE}_${base_version}_History`);
    let Bundle = getBundle(base_version);

    // Query our collection for this observation
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with Bundle.historyById: ', err);
        return reject(err);
      }

      // Bundle is a bundle cursor, pull documents out before resolving
      data.toArray().then((bundles) => {
        bundles.forEach(function (element, i, returnArray) {
          returnArray[i] = new Bundle(element);
        });
        resolve(bundles);
      });
    });
  });

module.exports.patch = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Bundle >>> patch'); // Should this say update (instead of patch) because the end result is that of an update, not a patch

    let { base_version, id, patchContent } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.BUNDLE}_${base_version}`);

    // Get current record
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with Bundle.searchById: ', err);
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

      let Bundle = getBundle(base_version);
      let bundle = new Bundle(resource);

      if (data && data.meta) {
        let foundBundle = new Bundle(data);
        let meta = foundBundle.meta;
        meta.versionId = `${parseInt(foundBundle.meta.versionId) + 1}`;
        bundle.meta = meta;
      } else {
        return reject('Unable to patch resource. Missing either data or metadata.');
      }

      // Same as update from this point on
      let cleaned = JSON.parse(JSON.stringify(bundle));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our bundle record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with Bundle.update: ', err2);
          return reject(err2);
        }

        // Save to history
        let history_collection = db.collection(`${COLLECTION.BUNDLE}_${base_version}_History`);
        let history_bundle = Object.assign(cleaned, { _id: id + cleaned.meta.versionId });

        // Insert our bundle record to history but don't assign _id
        return history_collection.insertOne(history_bundle, (err3) => {
          if (err3) {
            logger.error('Error with BundleHistory.create: ', err3);
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