/*eslint no-unused-vars: "warn"*/

const { VERSIONS } = require('@asymmetrik/node-fhir-server-core').constants;
const { resolveSchema } = require('@asymmetrik/node-fhir-server-core');
const { COLLECTION, CLIENT_DB } = require('../../constants');
const moment = require('moment-timezone');
const globals = require('../../globals');
const jsonpatch = require('fast-json-patch');

const { getUuid } = require('../../utils/uid.util');
const { capitalizeInitial } = require('../../utils/functions.util');

const logger = require('@asymmetrik/node-fhir-server-core').loggers.get();

const {
  stringQueryBuilder,
  tokenQueryBuilder,
  referenceQueryBuilder,
  addressQueryBuilder,
  nameQueryBuilder,
  dateQueryBuilder,
  dateQB,
} = require('../../utils/querybuilder.util');
const { forEach } = require('../../globals');

const defaultRecordCounts = 10;

let getPatient = (base_version) => {
  return resolveSchema(base_version, 'Patient');
};

let getMeta = (base_version) => {
  return resolveSchema(base_version, 'Meta');
};


let buildStu3ResultQuery = (args) => {
  let query = {};
  let { _count, _sort, _elements, _include } = args;

  if(_count) { query.count  = _count }

  if(_sort ) { query.sort   =  { [_sort] : 1 } }

  if(_include ) { 
    //正規表現: カンマ区切りで分割  eg: Patient:organization -> match1=Patient, match2=organization
    const reg = /\w+[^:]+/g  ///\w+\s*(?:(?:;(?:\s*\w+\s*)?)+)?/
    query.include = _include.match(reg).slice(1)
  }
  
  if(_elements){
    //https://www.hl7.org/fhir/search.html#elements
    //https://www.mongodb.com/community/forums/t/projection-does-not-allow-exclusion-inclusion-together/31756
    //https://chaika.hatenablog.com/entry/2019/05/07/083000

    // _elements検索ができる値を格納
    const _elementsSearchableValues = [ 
      "address", 
      "-address",  
      "address.line", 
      "-address.line" ,
      "address.city", 
      "-address.city" ,
      "address.district", 
      "-address.district" ,
      "address.state", 
      "-address.state" ,
      "address.country", 
      "-address.country" ,
      "address.postalCode", 
      "-address.postalCode" ,
      "identifier", 
      "-identifier",  
      "name", 
      "-name", 
      "name.family", 
      "-name.family", 
      "name.give", 
      "-name.give", 
      "name.prefix", 
      "-name.prefix", 
      "name.suffix", 
      "-name.suffix", 
      "telecom", 
      "-telecom" ,
      "link", 
      "-link" 
    ]

    //_elementsの値をカンマ区切りでsplitし、_elementsSearchableValuesと照らし合わせて使用可能な値のみ返す(undefinedも除外)
    const validValues = _elements.split(',').filter((elm) => _elementsSearchableValues.includes(elm) && elm !== undefined);
    
    //1文字目がハイフンでないならvisibleElm 1文字目がハイフンならhiddenElm
    const hyphenCheck = /^([-])([a-zA-Z0-9.,$;]+$)/
    const visibleElm  = validValues.filter(value => !hyphenCheck.exec(value) );
    const hiddenElm   = validValues.filter(value =>  hyphenCheck.exec(value) );

    //もし配列両方に値が入ってたら or もしvisibleElm配列にのみ値が入ってたら  -> visibleElmのみでクエリをつくる
    //もしhiddenElmにのみ値が入っていたなら -> ハイフンを取り除いてhiddenElmのみでクエリをつくる
    if(visibleElm.length && hiddenElm.length  || visibleElm.length  && !hiddenElm.length){ 
      query.element   =  { fields: visibleElm.reduce((obj, elm) => ({...obj, [elm]: 1}), {"_id":1}) } 
    } else if (!visibleElm.length  && hiddenElm.length ){  
      query.element   =  { fields: hiddenElm.reduce((obj, elm) => ({...obj, [elm.substr(1)]: 0}), {"_id":1}) }
    }

  }
  
  return query

};

let buildStu3SearchQuery = (args) => {

  // Common search params
  let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } = args;

  // Search Result params
  let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _elements, _CONTAINED, _CONTAINEDTYPED } =
    args;

  // Patient search params

  let active = args['active'];
  let activeNot = args['active:not'];
  let activeMissing = args['active:missing'];

  let address = args['address'];

  let addressCity = args['address-city'];
  let addressCityContains = args['address-city:contains'];
  let addressCityExact = args['address-city:exact'];

  let birthdate = args['birthdate'];
  let death_date = args['death-date'];

  let deceased = args['deceased']
  let deceasedNot = args['deceased:not']

  let family = args['family'];
  let familyContains = args['family:contains'];
  let familyExact = args['family:exact'];

  let gender = args['gender'];
  let genderNot = args['gender:not'];

    
  let general_practitioner = args['general-practitioner'];

  let given = args['given'];
  let givenContains = args['given:contains'];
  let givenExact = args['given:exact'];

  let identifier = args['identifier'];
  let identifierNot = args['identifier:not'];
  let identifierText = args['identifier:text'];


  let link = args['link']

  let name = args['name'];
  let nameContains = args['name:contains'];
  let nameExact = args['name:exact'];

  let organization = args['organization']

  let telecom = args['telecom']

  let query = {};
  let ors = [];


  if (_id) {
    query.id = _id;
  }

  if(_lastUpdated){
    query =  dateQB(_lastUpdated,'meta.lastUpdated')
    // console.log(query)
  }

  if (active) { 
    console.log(active)
    let queryBuilder = tokenQueryBuilder(active,"","active","","boolean","");
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
    // query.active =  {$eq: JSON.parse(active.toLowerCase())};
  } else if (activeNot){
    let queryBuilder = tokenQueryBuilder(activeNot,"","active","","boolean","not");
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
    // query.active =  {$ne: JSON.parse(activeNot.toLowerCase())}
  } else if(activeMissing){ //https://www.mongodb.com/community/forums/t/query-performance-with-null-vs-exists/108103/3
    query = { active: null }
  }

  if(address){
    let queryBuilder = addressQueryBuilder(address);
    for (let i in queryBuilder) {
      // query[i] = queryBuilder[i];
      ors.push({"$or" : queryBuilder[i] })
    }
  }



  if (addressCity) {
    query['address.city'] = stringQueryBuilder(addressCity, "");
  } else if (addressCityContains){
    query['address.city'] = stringQueryBuilder(addressCityContains, "contains");
  } else if (addressCityExact){
    query['address.city'] = stringQueryBuilder(addressCityExact, "exact");
  }

  if (birthdate) {
    query.birthDate = dateQueryBuilder(birthdate, 'date', 'birthDate')
  }

  if (death_date) {
    query= dateQB(death_date, 'deceasedDateTime');
  }

  if (deceased) { 
    let queryBuilder = tokenQueryBuilder(deceased,"","deceased","","boolean","");
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  } else if (deceasedNot){
    let queryBuilder = tokenQueryBuilder(deceasedNot,"","deceased","","boolean","not");
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }


  if (family) {
    query['name.family'] = stringQueryBuilder(family, "");
  } else if (familyContains) {
    query['name.family'] = stringQueryBuilder(familyContains, "contains");
  } else if(familyExact){
    query['name.family'] = stringQueryBuilder(familyExact, "exact");
  } 

  if (gender) {
    let queryBuilder = tokenQueryBuilder(gender, '', 'gender',"","string","");
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
    // query.gender = { $regex: "^" + gender, $options: "i"}
  } else if (genderNot){
    let queryBuilder = tokenQueryBuilder(genderNot, '', 'gender',"","string","not");
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
    // query.gender = { $not: { $regex: "^" + genderNot, $options: "i"}}
  }

  if (general_practitioner) {
    let queryBuilder = referenceQueryBuilder(general_practitioner, 'generalPractitioner.reference');
    console.log(queryBuilder)
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }


  if (given) {
    query['name.given'] = stringQueryBuilder(given, "");
  } else if (givenContains) {
    query['name.given'] = stringQueryBuilder(givenContains, "contains");
  } else if(givenExact){
    query['name.given'] = stringQueryBuilder(givenExact, "exact");
  } 

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier', '');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }else if(identifierNot){
    let queryBuilder = tokenQueryBuilder(identifierNot, 'value', 'identifier', '','','not');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }else if(identifierText){
    let queryBuilder = tokenQueryBuilder(identifierText, 'value', 'identifier.type.text', '','','text');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }


  if(link){
    let queryBuilder = referenceQueryBuilder(link, 'link.other.reference');
    console.log(queryBuilder)
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'managingOrganization.reference');
    console.log(queryBuilder)
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }



  if (name) {
    let queryBuilder = nameQueryBuilder(name, "");
    for (let i in queryBuilder) {
      // query[i] = queryBuilder[i];
      ors.push({"$or" : queryBuilder[i] })
    }
  } else if(nameContains) {
    let queryBuilder = nameQueryBuilder(nameContains, "contains");
    for (let i in queryBuilder) {
      // query[i] = queryBuilder[i];
      ors.push({"$or" : queryBuilder[i] })
    }
  } else if(nameExact) {
    let queryBuilder = nameQueryBuilder(nameExact ,'exact');
    for (let i in queryBuilder) {
      // query[i] = queryBuilder[i];
      ors.push({"$or" : queryBuilder[i] })
    }
  }


  if(telecom){
    let queryBuilder = tokenQueryBuilder(telecom, 'value', 'telecom', '');
    console.log(telecom)
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  // https://stackoverflow.com/questions/5150061/mongodb-multiple-or-operations
  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

const patient4_0_0_ReferenceTypeParams = {
  "organization":{
    "path":"managingOrganization.reference",
    "type":"object"
  },
  "general-practitioner":{
    "path":"generalPractitioner.reference",
    "type": "array"
  },
  "link":{
    "path":"link.other",
    "type": "array"
  }
};

/**
 * @param {*} args
 * @param {*} context
 * @param {*} logger
 */
module.exports.search = (args) =>
  new Promise((resolve, reject) => {
    logger.info('Patient >>> search');
    let { base_version } = args;
    let query = {};
    query = buildStu3SearchQuery(args);

    // 20220921
    let resParams = {}
    resParams = buildStu3ResultQuery(args)

    const obj = {
      count   : resParams.count || defaultRecordCounts,
      sort    : resParams.sort,
      element : resParams.element,
      include : resParams.include
    }

    console.log(obj)
    console.log(query)  

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PATIENT}_${base_version}`);
    let Patient = getPatient(base_version);

    if(obj.include){
      
      const referPath = patient4_0_0_ReferenceTypeParams[obj.include[0]]?.path

      const referCollection = obj.include.length == 1 ?  
        `${capitalizeInitial(obj.include[0])}_${base_version}` : //when length  = 1 then
        `${capitalizeInitial(obj.include[1])}_${base_version}`;  //when length != 1 then

      // const existsQuery = {[referPath]:{ $exists: true } }
      // const includeQuery = { fields: { "_id":0, "id": 1, [referPath]: 1 } }
      
      const mergeTest = async() => {
        try {

          const originalData = await collection.find(query).limit(obj.count).toArray()
          const [a,b] = referPath.split(".")

          const mergeData = originalData.map(async(elm) => {
            if(a in elm){
              const referId = elm[a][b].split('/')[1]
              elm[a][b] = await db.collection(referCollection).find({"id":referId}).toArray()
              return elm
            } else {
              return elm
            }
          });
          
          return await Promise.all(mergeData)

        } catch (err) {
          logger.error('Error with Patient.search: ', err);
          return reject(err);
        }
     }

    resolve(mergeTest())

    } else {
      // Query our collection for this patient
      //https://stackoverflow.com/questions/32855644/mongodb-not-returning-specific-fields
      collection.find(query,obj.element).limit(obj.count).sort(obj.sort).collation().toArray().then(
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
    }
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
    console.log(id)
    // Create the resource's metadata
    let Meta = getMeta(base_version);
    patient.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
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
      let jst = moment.utc().local().format('YYYY-MM-DDTHH:mm:ssZ')

      if (data && data.meta) {
        let foundPatient = new Patient(data);
        let meta = foundPatient.meta;
        meta.versionId = `${parseInt(foundPatient.meta.versionId) + 1}`;
        meta.lastUpdated = jst,
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
      console.log(doc)

      // Insert/update our patient record
      if ('id' in doc){
        collection.replaceOne({ id: id }, doc , { upsert: true }, (err2, res) => { //overwrite
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
      } else{
          const err = new Error('Can not update resource, resource body must contain an ID element for update (PUT) operation');
          // logger.error(err)
          return reject(err)
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