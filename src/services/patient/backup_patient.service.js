/*eslint no-unused-vars: "warn"*/
    // https://devsakaso.com/javascript-flat-flatmap-methods/
    // https://qiita.com/shuichi0712/items/cf966ad8bae9e610ea32
    // https://qiita.com/Yametaro/items/17f5a0434afa9b88c3b1
    // https://maku77.github.io/js/array/concat.html
    // https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Set
    // https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Conditional_Operator
    // https://stackoverflow.com/questions/48668232/recursive-function-and-map-for-accessing-elements-in-nested-array
const { VERSIONS } = require('@asymmetrik/node-fhir-server-core').constants;
const { resolveSchema } = require('@asymmetrik/node-fhir-server-core');
const { COLLECTION, CLIENT_DB } = require('../../constants');
const moment = require('moment-timezone');
const globals = require('../../globals');
const jsonpatch = require('fast-json-patch');

const { getUuid } = require('../../utils/uid.util');
const { capitalizeInitial, } = require('../../utils/functions.util');

const logger = require('@asymmetrik/node-fhir-server-core').loggers.get();

const fhirParams = require('@asymmetrik/node-fhir-server-core').getSearchParameters;
const r4PatientSrchParams = fhirParams.getSearchParameters('Patient', '4_0_0');
const refTypeSrchableParams = r4PatientSrchParams.filter(valueOf => valueOf.fhirtype === 'reference').reduce((obj, data) => ({...obj, [data.name]: data}), {});

const { R4ResultParamsBuilder} = require('../../utils/searchResultParams.util');
const r4ResultParamsBuilder = new R4ResultParamsBuilder();

const {
  stringQueryBuilder,
  tokenQueryBuilder,
  referenceQueryBuilder,
  addressOrNameQueryBuilder,
  dateQueryBuilder,
  dateQB,
  numQB
} = require('../../utils/querybuilder.util');


// const { forEach } = require('../../globals');
// const { link } = require('@asymmetrik/node-fhir-server-core/dist/server/resources/4_0_0/parameters/patient.parameters');

let getPatient = (base_version) => {
  return resolveSchema(base_version, 'Patient');
};

let getMeta = (base_version) => {
  return resolveSchema(base_version, 'Meta');
};

let buildStu3SearchQuery = (args) => {

  // Common search params
  let { _id, _lastUpdated, _tag } = args;

  // Patient search params
  let active = args['active'];
  let activeNot = args['active:not'];
  let activeMissing = args['active:missing'];

  let address = args['address'];
  let addressContains = args['address:contains'];
  let addressExact = args['address:exact'];

  let addressCity = args['address-city'];
  let addressCityContains = args['address-city:contains'];
  let addressCityExact = args['address-city:exact'];

  let addressCountry = args['address-country'];
  let addressCountryContains = args['address-country:contains'];
  let addressCountryExact = args['address-country:exact'];

  let addressPostalcode = args['address-postalcode'];
  let addressPostalcodeContains = args['address-postalcode:contains'];
  let addressPostalcodeExact = args['address-postalcode:exact'];

  let addressState = args['address-state'];
  let addressStateContains = args['address-state:contains'];
  let addressStateExact = args['address-state:exact'];

  let addressUse = args['address-use'];
  let addressUseContains = args['address-use:contains'];
  let addressUseExact = args['address-use:exact'];

  let birthdate = args['birthdate'];
  let death_date = args['death-date'];

  let deceased = args['deceased'];
  let deceasedNot = args['deceased:not'];

  let gender = args['gender'];
  let genderNot = args['gender:not'];

  let general_practitioner = args['general-practitioner'];

  let identifier = args['identifier'];
  let identifierNot = args['identifier:not'];
  let identifierText = args['identifier:text'];


  let link = args['link'];

  let name = args['name'];
  let nameContains = args['name:contains'];
  let nameExact = args['name:exact'];

  let nameFamily = args['family'];
  let nameFamilyContains = args['family:contains'];
  let nameFamilyExact = args['family:exact'];

  let nameGiven = args['given'];
  let nameGivenContains = args['given:contains'];
  let nameGivenExact = args['given:exact'];

  let organization = args['organization'];

  let telecom = args['telecom'];


  let query = {};
  let ors = [];

  console.log(numQB('eq8e-1', 'test'));

  if (_id) {
    const queryBuilder = tokenQueryBuilder(_id, '', 'id', '', 'string', '');
    ors.push(...queryBuilder.map(item => item));
    // query.id = _id;
  }

  if (_lastUpdated){
    const queryBuilder = dateQB(_lastUpdated, 'dateTime', 'meta.lastUpdated');
    ors.push(...queryBuilder.map(item => item));
  }

  if (_tag) {
    const queryBuilder = tokenQueryBuilder(_tag, '', 'meta.tag', '', '', '');
    ors.push(...queryBuilder.map(item => item));
  }

  if (active) {
    const queryBuilder = tokenQueryBuilder(active, '', 'active', '', 'boolean', '');
    ors.push(...queryBuilder.map(item => item));
  }
  if (activeNot){
    const queryBuilder = tokenQueryBuilder(activeNot, '', 'active', '', 'boolean', 'not');
    ors.push(...queryBuilder.map(item => item));
  }
  if (activeMissing){ //https://www.mongodb.com/community/forums/t/query-performance-with-null-vs-exists/108103/3
    const queryBuilder = tokenQueryBuilder(activeMissing, '', 'active', '', 'boolean', 'missing');
    ors.push(...queryBuilder.map(item => item));
  }

  if (address){
    const queryBuilder = addressOrNameQueryBuilder(address, 'address', '');
    ors.push(...queryBuilder.map(item => item));
  }
  if (addressContains){
    const queryBuilder = addressOrNameQueryBuilder(addressContains, 'address', 'contains');
    ors.push(...queryBuilder.map(item => item));
  }
  if (addressExact){
    const queryBuilder = addressOrNameQueryBuilder(addressExact, 'address', 'exact');
    ors.push(...queryBuilder.map(item => item));
  }

  if (addressCity){
    const queryBuilder = stringQueryBuilder(addressCity, 'address.city', '');
    ors.push(...queryBuilder.map(item => item));
  }
  if (addressCityContains){
    const queryBuilder = stringQueryBuilder(addressCityContains, 'address.city', 'contains');
    ors.push(...queryBuilder.map(item => item));
  }
  if (addressCityExact){
    const queryBuilder = stringQueryBuilder(addressCityExact, 'address.city', 'exact');
    ors.push(...queryBuilder.map(item => item));
  }

  if (addressCountry){
    const queryBuilder = stringQueryBuilder(addressCountry, 'address.country', '');
    ors.push(...queryBuilder.map(item => item));
  }
  if (addressCountryContains){
    const queryBuilder = stringQueryBuilder(addressCountryContains, 'address.country', 'contains');
    ors.push(...queryBuilder.map(item => item));
  }
  if (addressCountryExact){
    const queryBuilder = stringQueryBuilder(addressCountryExact, 'address.country', 'exact');
    ors.push(...queryBuilder.map(item => item));
  }

  if (addressPostalcode){
    const queryBuilder = stringQueryBuilder(addressPostalcode, 'address.postalcode', '');
    ors.push(...queryBuilder.map(item => item));
  }
  if (addressPostalcodeContains){
    const queryBuilder = stringQueryBuilder(addressPostalcodeContains, 'address.postalcode', 'contains');
    ors.push(...queryBuilder.map(item => item));
  }
  if (addressPostalcodeExact){
    const queryBuilder = stringQueryBuilder(addressPostalcodeExact, 'address.postalcode', 'exact');
    ors.push(...queryBuilder.map(item => item));
  }

  if (addressState){
    const queryBuilder = stringQueryBuilder(addressState, 'address.state', '');
    ors.push(...queryBuilder.map(item => item));
  }
  if (addressStateContains){
    const queryBuilder = stringQueryBuilder(addressStateContains, 'address.state', 'contains');
    ors.push(...queryBuilder.map(item => item));
  }
  if (addressStateExact){
    const queryBuilder = stringQueryBuilder(addressStateExact, 'address.state', 'exact');
    ors.push(...queryBuilder.map(item => item));
  }

  if (addressUse){
    const queryBuilder = stringQueryBuilder(addressUse, 'address.use', '');
    ors.push(...queryBuilder.map(item => item));
  }
  if (addressUseContains){
    const queryBuilder = stringQueryBuilder(addressUseContains, 'address.use', 'contains');
    ors.push(...queryBuilder.map(item => item));
  }
  if (addressUseExact){
    const queryBuilder = stringQueryBuilder(addressUseExact, 'address.use', 'exact');
    ors.push(...queryBuilder.map(item => item));
  }

  if (birthdate) {
    query.birthDate = dateQueryBuilder(birthdate, 'date', 'birthDate');
  }

  if (death_date) {
    const queryBuilder = dateQB(death_date, 'dateTime', 'deceasedDateTime');
    ors.push(...queryBuilder.map(item => item));
    // query = dateQB(death_date, 'dateTime', 'deceasedDateTime');
  }

  if (deceased) {
    const queryBuilder = tokenQueryBuilder(deceased, '', 'deceased', '', 'boolean', '');
    ors.push(...queryBuilder.map(item => item));
  }
  if (deceasedNot){
    const queryBuilder = tokenQueryBuilder(deceasedNot, '', 'deceased', '', 'boolean', 'not');
    ors.push(...queryBuilder.map(item => item));
  }

  if (gender) {
    const queryBuilder = tokenQueryBuilder(gender, '', 'gender', '', 'string', '');
    ors.push(...queryBuilder.map(item => item));
  }
  if (genderNot){
    const queryBuilder = tokenQueryBuilder(genderNot, '', 'gender', '', 'string', 'not');
    ors.push(...queryBuilder.map(item => item));
  }

  if (general_practitioner) {
    const queryBuilder = referenceQueryBuilder(general_practitioner, 'generalPractitioner.reference');
    ors.push(...queryBuilder.map(item => item));
    // let queryBuilder = referenceQueryBuilder(general_practitioner, 'generalPractitioner.reference');
    // for (let i in queryBuilder) {
    //   query[i] = queryBuilder[i];
    // }
  }

  if (name) {
    const queryBuilder = addressOrNameQueryBuilder(name, 'name', '');
    ors.push(...queryBuilder.map(item => item));
  }
  if (nameContains) {
    const queryBuilder = addressOrNameQueryBuilder(nameContains, 'name', 'contains');
    ors.push(...queryBuilder.map(item => item));
  }
  if (nameExact) {
    const queryBuilder = addressOrNameQueryBuilder(nameExact, 'name', 'exact');
    ors.push(...queryBuilder.map(item => item));
  }

  if (nameFamily) {
    const queryBuilder = stringQueryBuilder(nameFamily, 'name.family', '');
    ors.push(...queryBuilder.map(item => item));
  }
  if (nameFamilyContains) {
    const queryBuilder = stringQueryBuilder(nameFamilyContains, 'name.family', 'contains');
    ors.push(...queryBuilder.map(item => item));
  }
  if (nameFamilyExact){
    const queryBuilder = stringQueryBuilder(nameFamilyExact, 'name.family', 'exact');
    ors.push(...queryBuilder.map(item => item));
  }

  if (nameGiven) {
    const queryBuilder = stringQueryBuilder(nameGiven, 'name.given', '');
    ors.push(...queryBuilder.map(item => item));
  }
  if (nameGivenContains) {
    const queryBuilder = stringQueryBuilder(nameGivenContains, 'name.given', 'contains');
    ors.push(...queryBuilder.map(item => item));
  }
  if (nameGivenExact){
    const queryBuilder = stringQueryBuilder(nameGivenExact, 'name.given', 'exact');
    ors.push(...queryBuilder.map(item => item));
  }

  if (identifier) {
    const queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier', '', 'identifier', '');
    ors.push(...queryBuilder.map(item => item));
    // for (let i in queryBuilder) {
    //   ors.push(queryBuilder[i]);
    //   // query[i] = queryBuilder[i];
    // }
  }
  if (identifierNot){
    const queryBuilder = tokenQueryBuilder(identifierNot, 'value', 'identifier', '', 'identifier', 'not');
    ors.push(...queryBuilder.map(item => item));
  }
  if (identifierText){
    const queryBuilder = tokenQueryBuilder(identifierText, 'value', 'identifier.type.text', '', 'identifier', 'text');
    ors.push(...queryBuilder.map(item => item));
  }


  if (link){
    const queryBuilder = referenceQueryBuilder(link, 'link.other.reference');
    ors.push(...queryBuilder.map(item => item));
  }

  if (organization) {
    const queryBuilder = referenceQueryBuilder(organization, 'managingOrganization.reference');
    ors.push(...queryBuilder.map(item => item));
  }


  if (telecom){
    const queryBuilder = tokenQueryBuilder(telecom, 'value', 'telecom', '', '', '');
    ors.push(...queryBuilder.map(item => item));
  }

  // https://stackoverflow.com/questions/5150061/mongodb-multiple-or-operations
  if (ors.length !== 0) {
    query.$and = ors.flat();
  }
  console.log(JSON.stringify(query));

  return query;
};

/**
 * @param {*} args
 * @param {*} context
 * @param {*} logger
 */
module.exports.search = (args, req) =>
  new Promise((resolve, reject) => {
    logger.info('Patient >>> search');
    let { base_version } = args;
    let query = {};
    query = buildStu3SearchQuery(args);
    // const resultOptions = r4ResultParamsBuilder(args, refTypeSrchableParams);
    const resultOptions = r4ResultParamsBuilder.bundle(args, refTypeSrchableParams);

    // console.log(Object.keys(args));
    console.log(resultOptions);
    console.log(args);
    // console.log(query);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PATIENT}_${base_version}`);
    let Patient = getPatient(base_version);


    //データを取得する もしクエリストリングに_includeか_revincludeがあった際これを基にinclude,revinclude関数を動かす
    const fetchOrginalDatas = async() => {
      const orgDatas = await collection.find(query, resultOptions._filter).limit(resultOptions._count).collation().toArray();
      return orgDatas.map(item => new Patient(item)); //schema process
    };

    // データ数を取得 _summary=count用 class
    const fetchDatasCount = async() => {
      return {'total': await collection.find(query).count()};
    };

    // const fetchSortedDatas = async() => {
    //   const matchQuery = { $match: {...resultOptions._sort.existChecker, ...query} };
    //   const orgDatas = await collection.aggregate([resultOptions._sort.specifySortOrder, matchQuery, resultOptions._filter], resultOptions._sort.caseInsensitive)
    //      .limit(resultOptions._count).toArray();
    //   return orgDatas.map(item => new Patient(item)); //schema process
    // };

    // fetchOrginalDatasで取得したデータを基に、別データを取得

    const fetch_includeDatas = async(datas) => {
      //1. queryを基にデータをとってくる
      const originalDatas = datas;
      const nestPath = 'reference';


      // 2. originalDatasからinclude queryに当てはまるものを取得
      const datasOfFitTheQueryStrs = resultOptions._include.map(valueOf => {
        const findNestedData = (node, pathArr, index = 0) => {
          const path = pathArr[index];
          const entry = node.map(e => e[path]).flat().filter(Boolean);
          if (!entry) { return null; }
          ++index;
          return index < pathArr.length ? findNestedData(entry, pathArr, index) : entry.filter(item => item[nestPath].split('/')[0] === valueOf.targetCollection );
        };
        return findNestedData(originalDatas, valueOf.targetPath.split('.'));
      }).flat().map(item => typeof (item) === 'object' ? item[nestPath] : item );

      // 3. datasOfFitTheQueryStrsを整形(重複を削除、ネストを取り除く)
      const toDedupeAndFlattenDatas = [...new Set(datasOfFitTheQueryStrs.flat().map(item => item))];

      // 4. toDeduplicateAndFlattenの値を基にDB検索/取得
      const fetchDatasFromMongo = toDedupeAndFlattenDatas.map(async(item) =>{
        const [refcollection, refid] = item.split('/');
        const RefSchema = resolveSchema(base_version, capitalizeInitial(refcollection));
        const includedata = await db.collection( `${capitalizeInitial(refcollection)}_${base_version}` ).find( { id: refid } ).toArray();
        return includedata.map(includeitem => new RefSchema(includeitem));
      });

      // 5. 値返却
      const result = await Promise.all(fetchDatasFromMongo);
      return [].concat(...result.map(item => item));
    };

    // fetchOrginalDatasで取得したデータを基に、別データを取得
    const fetch_revincludeDatas = async(datas) => {
      const nestPath = 'reference';
      const originalDatas = datas;

      try {
        //3. originalDatasからidを取り出して加工する
        const shapingOrgDatas = originalDatas.map(valueOf => { return `Patient/${valueOf.id}`; });
        //4. クエリを作成してmongoDBで検索
        const fetchDatasFromMongo = resultOptions._revinclude.map(async(valueOf) => {
          const revincludeCollection = `${valueOf.targetCollection}_${base_version}`;
          const path = `${valueOf.targetPath}.${nestPath}`;
          const mongoQuery = { $or: shapingOrgDatas.map(id => { return { [path]: id }; }) };
          return await db.collection(revincludeCollection).find( mongoQuery ).toArray();
        });

        //4. 結合
        const result = await Promise.all(fetchDatasFromMongo);
        return [].concat(...result.map(item => item));
      } catch {
        return [];
      }

    };

    const search = async() => {
      try {

        if (resultOptions._filter === 'count') {
          return await fetchDatasCount();
        }
        // else
        const orgDatas = await fetchOrginalDatas();
        // const orgDatas = resultOptions._sort ? await fetchSortedDatas() : await fetchOrginalDatas();
        const arr = [];
        arr.push(orgDatas);
        if (resultOptions._include) { arr.push(await fetch_includeDatas(orgDatas)); }
        if (resultOptions._revinclude) { arr.push(await fetch_revincludeDatas(orgDatas)); }
        return arr.flat();

      } catch (err) {
        reject(new Error(err));
      }

    };

    resolve(search());

  });

module.exports.searchById = (args) =>
  new Promise((resolve, reject) => {
    logger.info('Patient >>> searchById');

    let { base_version, id } = args;
    let Patient = getPatient(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PATIENT}_${base_version}`);
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, patient) => {
      if (err) {
        logger.error('Error with Patient.searchById: ', err);
        return reject(err);
      }
      if (patient) {
        resolve(new Patient(patient));
      }
      resolve();
    });
  });

module.exports.create = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('Patient >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PATIENT}_${base_version}`);

    // Get current record
    let Patient = getPatient(base_version);
    let patient = new Patient(resource);

    // If no resource ID was provided, generate one.
    let id = getUuid(patient);
    console.log(id);
    // Create the resource's metadata
    let Meta = getMeta(base_version);
    patient.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().local().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Create the document to be inserted into Mongo
    let doc = JSON.parse(JSON.stringify(patient.toJSON()));
    Object.assign(doc, { id: id });

    // Create a clone of the object without the _id parameter before assigning a value to
    // the _id parameter in the original document
    let history_doc = Object.assign({}, doc);
    Object.assign(doc, { _id: id });

    // Insert our patient record
    collection.insertOne(doc, (err) => {
      if (err) {
        logger.error('Error with Patient.create: ', err);
        return reject(err);
      }

      // Save the resource to history
      let history_collection = db.collection(`${COLLECTION.PATIENT}_${base_version}_History`);

      // Insert our patient record to history but don't assign _id
      return history_collection.insertOne(history_doc, (err2) => {
        if (err2) {
          logger.error('Error with PatientHistory.create: ', err2);
          return reject(err2);
        }
        return resolve({ id: doc.id, resource_version: doc.meta.versionId });
      });
    });
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('Patient >>> update');

    let resource = req.body;

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PATIENT}_${base_version}`);

    // Get current record
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with Patient.searchById: ', err);
        return reject(err);
      }

      let Patient = getPatient(base_version);
      let patient = new Patient(resource);
      let jst = moment.utc().local().format('YYYY-MM-DDTHH:mm:ssZ');

      if (data && data.meta) {
        let foundPatient = new Patient(data);
        let meta = foundPatient.meta;
        meta.versionId = `${parseInt(foundPatient.meta.versionId) + 1}`;
        meta.lastUpdated = jst;
        patient.meta = meta;
      } else {
        let Meta = getMeta(base_version);
        patient.meta = new Meta({
          versionId: '1',
          lastUpdated: jst,
        });
      }

      let cleaned = JSON.parse(JSON.stringify(patient));
      // let doc = Object.assign(cleaned, { _id: id });
      let doc = Object.assign(cleaned);
      console.log(doc);

      // Insert/update our patient record
      if ('id' in doc){
        collection.replaceOne({ id: id }, doc, { upsert: true }, (err2, res) => { //overwrite
          if (err2) {
            logger.error('Error with Patient.update: ', err2);
            return reject(err2);
          }

          // save to history
          let history_collection = db.collection(`${COLLECTION.PATIENT}_${base_version}_History`);

          // let history_patient = Object.assign(cleaned, { _id: id + "-" +cleaned.meta.versionId });
            let history_patient = Object.assign(cleaned);

          // Insert our patient record to history but don't assign _id
          return history_collection.insertOne(history_patient, (err3) => {
            if (err3) {
              logger.error('Error with PatientHistory.create: ', err3);
              return reject(err3);
            }

            return resolve({
              id: id,
              created: res.lastErrorObject && !res.lastErrorObject.updatedExisting,
              resource_version: doc.meta.versionId,
            });
          });
        });
      } else {
          const err = new Error('Can not update resource, resource body must contain an ID element for update (PUT) operation');
          // logger.error(err)
          return reject(err);
      }

    });
  });

module.exports.remove = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Patient >>> remove');

    let { base_version, id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PATIENT}_${base_version}`);
    // Delete our patient record
    collection.deleteOne({ id: id }, (err, _) => {
      if (err) {
        logger.error('Error with Patient.remove');
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
      let history_collection = db.collection(`${COLLECTION.PATIENT}_${base_version}_History`);
      return history_collection.deleteMany({ id: id }, (err2) => {
        if (err2) {
          logger.error('Error with Patient.remove');
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
    logger.info('Patient >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Patient = getPatient(base_version);

    let db = globals.get(CLIENT_DB);
    let history_collection = db.collection(`${COLLECTION.PATIENT}_${base_version}_History`);

    // Query our collection for this observation
    history_collection.findOne(
      { id: id.toString(), 'meta.versionId': `${version_id}` },
      (err, patient) => {
        if (err) {
          logger.error('Error with Patient.searchByVersionId: ', err);
          return reject(err);
        }

        if (patient) {
          resolve(new Patient(patient));
        }

        resolve();
      }
    );
  });

module.exports.history = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Patient >>> history');

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
    let history_collection = db.collection(`${COLLECTION.PATIENT}_${base_version}_History`);
    let Patient = getPatient(base_version);

    // Query our collection for this observation
    history_collection.find(query, (err, data) => {
      if (err) {
        logger.error('Error with Patient.history: ', err);
        return reject(err);
      }

      // Patient is a patient cursor, pull documents out before resolving
      data.toArray().then((patients) => {
        patients.forEach(function (element, i, returnArray) {
          returnArray[i] = new Patient(element);
        });
        resolve(patients);
      });
    });
  });

module.exports.historyById = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Patient >>> historyById');

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
    let history_collection = db.collection(`${COLLECTION.PATIENT}_${base_version}_History`);
    let Patient = getPatient(base_version);

    // Query our collection and pull documents out of array
    // TODO: Be sure this strategy is used by other services implemented
    history_collection.find(query).toArray().then(
      (patients) => {
        patients.forEach(function (element, i, returnArray) {
          returnArray[i] = new Patient(element);
        });
        resolve(patients);
      },
      err => {
        logger.error('Error with Patient.search: ', err);
        return reject(err);
      }
    )
  });

module.exports.patch = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('Patient >>> patch'); // Should this say update (instead of patch) because the end result is that of an update, not a patch

    let { base_version, id, patchContent } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PATIENT}_${base_version}`);

    // Get current record
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err, data) => {
      if (err) {
        logger.error('Error with Patient.searchById: ', err);
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

      let Patient = getPatient(base_version);
      let patient = new Patient(resource);

      if (data && data.meta) {
        let foundPatient = new Patient(data);
        let meta = foundPatient.meta;
        meta.versionId = `${parseInt(foundPatient.meta.versionId) + 1}`;
        patient.meta = meta;
      } else {
        return reject('Unable to patch resource. Missing either data or metadata.');
      }

      // Same as update from this point on
      let cleaned = JSON.parse(JSON.stringify(patient));
      let doc = Object.assign(cleaned, { _id: id });

      // Insert/update our patient record
      collection.findOneAndUpdate({ id: id }, { $set: doc }, { upsert: true }, (err2, res) => {
        if (err2) {
          logger.error('Error with Patient.update: ', err2);
          return reject(err2);
        }

        // Save to history
        let history_collection = db.collection(`${COLLECTION.PATIENT}_${base_version}_History`);
        let history_patient = Object.assign(cleaned, { _id: id + cleaned.meta.versionId });

        // Insert our patient record to history but don't assign _id
        return history_collection.insertOne(history_patient, (err3) => {
          if (err3) {
            logger.error('Error with PatientHistory.create: ', err3);
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