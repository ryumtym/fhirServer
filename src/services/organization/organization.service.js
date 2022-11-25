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

let getOrganization = (base_version) => {
  return resolveSchema(base_version, 'Organization');
};

let getMeta = (base_version) => {
  return resolveSchema(base_version, 'Meta');
};


let buildRelease4SearchQuery = (args) => {
  // Organization search params
  let address = args['address'];

  let query = {};
  let ors = [];

  if (address){
    let queryBuilder = addressQueryBuilder(address);
    for (let i in queryBuilder) {
      ors.push({'$or': queryBuilder[i] });
    }
  }

  // https://stackoverflow.com/questions/5150061/mongodb-multiple-or-operations
  if (ors.length !== 0) {
    query.$and = ors;
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
   logger.info('Organization >>> search');

   let { base_version } = args;
   let query = {};
   query = buildRelease4SearchQuery(args);


   // Grab an instance of our DB and collection
   let db = globals.get(CLIENT_DB);
   let collection = db.collection(`${COLLECTION.ORGANIZATION}_${base_version}`);
   let Organization = getOrganization(base_version);

   console.log(query);

   collection.find(query).toArray().then(
     (organizations) => {
       organizations.forEach(function (element, i, returnArray) {
         returnArray[i] = new Organization(element);
       });
       resolve(organizations);
     },
     err => {
       logger.error('Error with Organization.search: ', err);
       return reject(err);
     }
   );
 });

 module.exports.create = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('Organization >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ORGANIZATION}_${base_version}`);

    // Get current record
    let Organization = getOrganization(base_version);
    let organization = new Organization(resource);

    // If no resource ID was provided, generate one.
    let id = getUuid(organization);
    console.log(id);
    // Create the resource's metadata
    let Meta = getMeta(base_version);
    organization.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Create the document to be inserted into Mongo
    let doc = JSON.parse(JSON.stringify(organization.toJSON()));
    Object.assign(doc, { id: id });

    // Create a clone of the object without the _id parameter before assigning a value to
    // the _id parameter in the original document
    let history_doc = Object.assign({}, doc);
    Object.assign(doc, { _id: id });

    // Insert our organization record
    collection.insertOne(doc, (err) => {
      if (err) {
        logger.error('Error with Organization.create: ', err);
        return reject(err);
      }

      // Save the resource to history
      let history_collection = db.collection(`${COLLECTION.ORGANIZATION}_${base_version}_History`);

      // Insert our organization record to history but don't assign _id
      return history_collection.insertOne(history_doc, (err2) => {
        if (err2) {
          logger.error('Error with OrganizationHistory.create: ', err2);
          return reject(err2);
        }
        return resolve({ id: doc.id, resource_version: doc.meta.versionId });
      });
    });
  });