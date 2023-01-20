const moment = require('moment-timezone');
const { invalidParameterError, unknownParameterError } = require('./error.util');

/**
 * @name dateQB
 * @description _lastUpdated has any dateformat pattern. most likely yyyy, yyyymm, yyyymmdd, ltyyyy, gtyyyymm, etc... so frustrated!
 * @param {string} target what we are querying for
 * @param {string} path JSON path
 * @return a mongo regex query
 */
let dateQB = function (target, type, path) {
  // const regex = /^(\D{2})?(\d{4})(-\d{2})?(-\d{2})?(?:(T\d{2}:\d{2})(:\d{2})?)?(Z|(\+|-|\s)(\d{2}):(\d{2}))?$/;
  // const regex = /^(^[a-zA-Z]*)?(\d{4})(-\d{2})?(-\d{2})?(?:(T\d{2}:\d{2})(:\d{2})?)?(Z|(\+|-|\s)(\d{2})(:\d{2}))?$/;

  // regex1 => 比較演算子と日付に分割  eg: gt2005-03-04 => ['gt2005-03-04', 'gt', '20152005-03-04'] https://regex101.com/
  // regex2 => 日付を更に分割  eg: lt2015-02-14 => ['lt2015-02', 'lt', '2015', '-02', '-14',....]
  const regex1 = /(^[a-zA-Z]*)(.*)/;
  const regex2 = /^(\d{4})(-\d{2})?(-\d{2})?(?:(T\d{2}:\d{2})(:\d{2})?)?(Z|(\+|-|\s)(\d{2})(:\d{2}))?$/;

  const targetToArray = Array.isArray(target) ? target : [target];
  const mongoQuery = {}; //この関数から最終的に吐き出されるmongoQuery

  const validComparator = (input) => { //使用可能な比較演算子かを確認して、使用可能ならmongoDBに合う形で返却、使用不可ならエラー処理
    const validComparisonOperators = [
      { Arg: 'eq', mongoOperator: '$eq' },
      { Arg: undefined, mongoOperator: '$eq' },
      { Arg: '', mongoOperator: '$eq' },
      { Arg: 'ne', mongoOperator: '$ne' },
      { Arg: 'gt', mongoOperator: '$gt' },
      { Arg: 'lt', mongoOperator: '$lt' },
      { Arg: 'ge', mongoOperator: '$ge' },
      { Arg: 'le', mongoOperator: '$le' },
    ];

    //引数がcomparisonOperatorsのArgsにあるか確認
    const valid = validComparisonOperators.find(item => item.Arg === input);
    if (!valid){
      throw (unknownParameterError('comparison operator', input, validComparisonOperators.map(item => item.Arg).filter(Boolean)));
    }
    return valid.mongoOperator;

  };

  const validFormat = (value) => { //date formatが正しい確認、正しければそのformatを返す、間違っていたらエラー処理
    const validFormats = ['YYYY', 'YYYY-MM', 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ssZ'];
    const isValid = moment(value, validFormats, true).isValid();
    if (isValid) { return moment(value).creationData().format; }
    if (!isValid){ throw (invalidParameterError('date/time format', value, 'https://www.hl7.org/fhir/search.html#date' )); }
  };

  targetToArray.map(elm => {
    const separator = elm.match(regex1);

    const comparator = validComparator(separator[1]);
    const targetDate = separator[2].replace(/\s/, '+');

    // formatチェック
    validFormat(targetDate); // console.log(regex2.test(targetDate));
    const match = targetDate.match(regex2);

    // 秒数(match[8])まで指定されていたら秒以下含めて結合、指定されていなければ秒以下含めないで結合
    const toUTC = match[8] ? `${match.slice(1, 6).join('')}+${match[8]}${match[9]}` : match.slice(1, 6).join('');

    // toUTCがfhirのdateTime型に準じているかvalidFormat関数で確認後、YYYY-MM-DDTHH:mm:ssZ形式かどうかをbool型で返す
    const hasSecondSpecified = ['YYYY-MM-DDTHH:mm:ssZ'].some(v => v === validFormat(toUTC));

    if (comparator === '$eq' && hasSecondSpecified) {
      Object.assign(mongoQuery, {[path]: {[comparator]: toUTC } });
    } else if (comparator !== '$eq' && !hasSecondSpecified) {
        const datetime_utc = moment.utc(toUTC).format('YYYY-MM-DDTHH:mm:ssZ');
        Object.assign(mongoQuery, { [path]: { [comparator]: datetime_utc } });
    } else {
        Object.assign(mongoQuery, {[path]: {$regex: toUTC } });
    }

  });

  return mongoQuery;
};


/**
 * @name addressAndNameQueryBuilder
 * @type function
 * @description brute force method of matching human names. Splits the input and checks to see if every piece matches to
 * at least 1 part of the name field using regexs. Ignores case
 * @param {string} target
 * @param {string} type 'address' or 'name'
 * @param {string} modif https://www.hl7.org/fhir/search.html#string
 * @return {array} ors
 */
let addressAndNameQueryBuilder = function (target, type, modifier) {

  // targetを配列化した後、括弧「(」「)」、ハイフン「-」、アンダースコア「_」、プラス「+」、イコール「=」、スラッシュ「/」、ドット「.」を全てエスケープする
  const targetToArray = [].concat(target);
  const targetTerms = targetToArray.map(elm => elm.replace(/[\\(\\)\\-\\_\\+\\=\\/\\.]/g, '\\$&')); // 引数targetを配列化

  const nameFields = ['name.text', 'name.family', 'name.given', 'name.suffix', 'name.prefix'];
  const addressFields = ['address.line', 'address.city', 'address.district', 'address.state', 'address.postalCode', 'address.country'];
  const fields = type === 'name' ? nameFields : addressFields;

  const andQueryBundle = [];
  const orQueryBundle = [];
  const resultQuery = [];


  /**
   * @name buildPatternMatchQuery
   * @type function
   * @description  modifierに応じて、前方一致、部分一致、完全一致検索のためのmongoクエリを作成する
   * @abstract https://www.mongodb.com/docs/manual/reference/operator/query/regex/
   * @param {string} value 検索値
   * @param {string} modif '' => 前方一致, contains => 部分一致, exact => 完全一致
  */
  const buildPatternMatchQuery = (value, modif) => {
    if (modif === '') { return { $regex: '^' + value, $options: 'i' }; }
    if (modif === 'contains') { return { $regex: value, $options: 'i' }; }
    if (modif === 'exact') { return { $regex: '^' + value + '$' }; }
  };

  /**
   * @name buildQueryBundle
   * @type function
   * @description  searchTermを基にmongoクエリを複数作成し、insertionArrayにまとめる
   * @param {array} insertionArray 挿入先の配列
   * @param {array} searchTerm 挿入元の配列、nameFieldsかaddressFieldsを使用
   * @param {string} modif buildPatternMatchQuery関数を呼ぶ際に使用
   */
  const buildQueryBundle = (insertionArray, searchTerm, value, modif) => {
    searchTerm.map(field => {
      insertionArray.push({[field]: buildPatternMatchQuery(value, modif)});
    });
  };

  // 渡された値(target)をもとに、もし配列数が1ならandQueryBundleに、配列数が1以外なら orQueryBundleに格納
  targetTerms.map(value => {
    const splitTerms = value.split(/,/);
    splitTerms.map(term => {
      const arrayToInsert = splitTerms.length === 1 ? andQueryBundle : orQueryBundle;
      buildQueryBundle(arrayToInsert, fields, term, modifier);
    });
  });

  if (andQueryBundle.length){ resultQuery.push({'$or': andQueryBundle}); }
  if (orQueryBundle.length ){ resultQuery.push({'$or': orQueryBundle }); }

  return resultQuery;

};

/**
 * @name stringQueryBuilder
 * @description builds mongo default query for string inputs, no modifiers
 * @param {string} target what we are querying for
 * @param {string} modif modifier contains->部分一致, exact->完全一致, それ以外->前方一致
 * @return a mongo regex query
 */
 let stringQueryBuilder = function (target, field, modifier) {
  const targetToArray = [].concat(target);
  const targetTerms = targetToArray.map(elm => elm.replace(/[\\(\\)\\-\\_\\+\\=\\/\\.]/g, '\\$&')); // 引数targetを配列化

  const andQueryBundle = [];
  const orQueryBundle = [];
  const resultQuery = [];

  /**
   * @name buildPatternMatchQuery
   * @description  modifierに応じて、前方一致、部分一致、完全一致検索のためのmongoクエリを作成する
   * @abstract https://www.mongodb.com/docs/manual/reference/operator/query/regex/
   * @param {string} value 検索値
   * @param {string} modif '' => 前方一致, contains => 部分一致, exact => 完全一致
  */
  const buildPatternMatchQuery = (value, modif) => {
    if (modif === '') { return { $regex: '^' + value, $options: 'i' }; }
    if (modif === 'contains') { return { $regex: value, $options: 'i' }; }
    if (modif === 'exact') { return { $regex: '^' + value + '$' }; }
  };

  // 渡された値(target)をもとに、もし配列数が1ならandQueryBundleに、配列数が1以外なら orQueryBundleに格納
  targetTerms.map(value => {
    const splitTerms = value.split(/,/);
    splitTerms.map(term => {
      const arrayToInsert = splitTerms.length === 1 ? andQueryBundle : orQueryBundle;
      arrayToInsert.push({ [field]: buildPatternMatchQuery(term, modifier)});
    });
  });

  if (andQueryBundle.length){ resultQuery.push({'$or': andQueryBundle}); }
  if (orQueryBundle.length ){ resultQuery.push({'$or': orQueryBundle }); }

  return resultQuery;
};

/**
 * @name tokenQueryBuilder
 * @param {string} target what we are searching for
 * @param {string} type codeable concepts use a code field and identifiers use a value
 * @param {string} field path to system and value from field
 * @param {string} required the required system if specified
 * @param {string} detaType token's detaType https://www.hl7.org/fhir/search.html#token
 * @param {string} modifier If it has a modifier, it will move with it.
 * @return {JSON} queryBuilder
 *  // https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Set/has
    // https://stackoverflow.com/questions/263965/how-can-i-convert-a-string-to-boolean-in-javascript
*/
let tokenQueryBuilder = function (target, type, field, required, dataType, modifier) {
  const targetTerms = [].concat(target); // 引数targetを配列化

  const andQueryBundle = [];
  const orQueryBundle = [];
  const resultQuery = [];

  // 引数で渡された型に応じてmondoDBで使用するクエリのvalueを作成する
  const buildQueryValues = (v) => {
    if (dataType === 'boolean'){
      // 文字列を真偽値に置き換え、もしできなかったらerror処理
      try {
        return {[field]: JSON.parse(v.toLowerCase())};
      } catch {
        throw unknownParameterError(field, target, 'boolean type');
      }
    } else if (dataType === 'string' || dataType === 'identifier' && modifier === 'text'){
      return {[field]: v };
    } else {
      // "|" が存在する場合は、v の値を "|" の左右に分ける
      // 存在しない場合は、system は null にする
      const arr = [];
      const pipeSeparator = v.indexOf('|');
      const system = pipeSeparator ? v.substring(0, pipeSeparator) : null;
      const value = pipeSeparator ? v.substring(pipeSeparator + 1) : v;

      if (system){ arr.push({ [`${field}.system` ]: system}); }
      if (value) { arr.push({ [`${field}.${type}`]: value }); }
      return arr;
    }
  };

  // 渡された値(target)をもとに、もし配列数が1ならandQueryBundleに、配列数が1以外なら orQueryBundleに格納
  targetTerms.map(obj => {
    const splitTerms = obj.split(/,/);
    splitTerms.map(term => {
      const arrayToInsert = splitTerms.length === 1 ? andQueryBundle : orQueryBundle;
      arrayToInsert.push(buildQueryValues(term));
    })
    ;});

  // console.log(andQueryBundle);
  // console.log(orQueryBundle);

  /*
    modif == '' or text => $andか$orを使用してクエリ作成
    modif == not        => $norを使用してクエリ作成
  */
  const createQuery = (operator, source, modif) => {
    if (modif === '' || modif === 'text') { return {[operator]: source}; }
    if (modif === 'not') { return {['$nor']: source}; }
  };

  if (andQueryBundle?.length){ resultQuery.push( createQuery(['$and'], andQueryBundle.flat(), modifier) ); }
  if (orQueryBundle?.length) { resultQuery.push( createQuery(['$or'], orQueryBundle.flat(), modifier) ); }

  return resultQuery;

};

/**
 * @name referenceQueryBuilder
 * @param {string} target
 * @param {string} field
 * @return {JSON} queryBuilder
 */
let referenceQueryBuilder = function (target, field) {
  const regex = /http(.*)?\/(\w+\/.+)$/; //https?:(.*)?\/(.+)\/(.+)\?(.+)=(.+)$
  // const regex = /(.+)\/(.+)$/;
  const match = target.match(regex);
  let queryBuilder = {};

  // Check if target is a url
  if (match) {
    queryBuilder[field] = match[2];
  }
  // target = type/id
  else if (target.includes('/')) {
    let [type, id] = target.split('/');
    queryBuilder[field] = `${type}/${id}`;
  }
  // target = id The type may be there so we need to check the end of the field for the id
  else {
    queryBuilder[field] = { $regex: new RegExp(`${target}$`) };
  }
  return queryBuilder;
};

/**
 * @name numberQueryBuilder
 * @description takes in number query and returns a mongo query. The target parameter can have a 2 letter prefix to
 *              specify a specific kind of query. Else, an approximation query will be returned.
 * @param target
 * @returns {JSON} a mongo query
 */
let numberQueryBuilder = function (target) {
  let prefix = '';
  let number = '';
  let sigfigs = '';

  // Check if there is a prefix
  if (isNaN(target)) {
    prefix = target.substring(0, 2);
    number = parseFloat(target.substring(2));
    sigfigs = target.substring(2);
  } else {
    number = parseFloat(target);
    sigfigs = target;
  }

  // Check for prefix and return the appropriate query
  // Missing eq(default), sa, eb, and ap prefixes
  switch (prefix) {
    case 'lt':
      return { $lt: number };
    case 'le':
      return { $lte: number };
    case 'gt':
      return { $gt: number };
    case 'ge':
      return { $gte: number };
    case 'ne':
      return { $ne: number };
  }

  // Return an approximation query
  let decimals = sigfigs.split('.')[1];
  if (decimals) {
    decimals = decimals.length + 1;
  } else {
    decimals = 1;
  }
  let aprox = (1 / 10 ** decimals) * 5;

  return { $gte: number - aprox, $lt: number + aprox };
};

/**
 * @name quantityQueryBuilder
 * @description builds quantity data types
 * @param target [prefix][number]|[system]|[code]
 * @param field path to specific field in the resource
 */
let quantityQueryBuilder = function (target, field) {
  // console.log("qb.quantityQbFunc,args->target:" +target)
  // console.log("qb.quantityQbFunc,args->field:" + field)

  let qB = {};
  //split by the two pipes
  let [num, system, code] = target.split('|');

  if (system) {
    qB[`${field}.system`] = system;
  }
  if (code) {
    qB[`${field}.code`] = code;
  }

  if (isNaN(num)) {
    //with prefixes
    let prefix = num.substring(0, 2);
    num = Number(num.substring(2));

    // Missing eq(default), sa, eb, and ap prefixes
    switch (prefix) {
      case 'lt':
        qB[`${field}.value`] = { $lt: num };
        break;
      case 'le':
        qB[`${field}.value`] = { $lte: num };
        break;
      case 'gt':
        qB[`${field}.value`] = { $gt: num };
        break;
      case 'ge':
        qB[`${field}.value`] = { $gte: num };
        break;
      case 'ne':
        qB[`${field}.value`] = { $ne: num };
        break;
    }
  } else {
    //no prefixes
    qB[`${field}.value`] = Number(num);
  }

  return qB;
};

//for modular arithmetic because % is just for remainder -> JS is a cruel joke
function mod(n, m) {
  return ((n % m) + m) % m;
}

//gives the number of days from year 0, used for adding or subtracting days from a date
let getDayNum = function (year, month, day) {
  month = mod(month + 9, 12);
  year = year - Math.floor(month / 10);
  return (
    365 * year +
    Math.floor(year / 4) -
    Math.floor(year / 100) +
    Math.floor(year / 400) +
    Math.floor((month * 306 + 5) / 10) +
    (day - 1)
  );
};

//returns a date given the number of days from year 0;
let getDateFromNum = function (days) {
  let year = Math.floor((10000 * days + 14780) / 3652425);
  let day2 =
    days - (365 * year + Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400));
  if (day2 < 0) {
    year = year - 1;
    day2 =
      days - (365 * year + Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400));
  }
  let m1 = Math.floor((100 * day2 + 52) / 3060);
  let month = mod(m1 + 2, 12) + 1;
  year = year + Math.floor((m1 + 2) / 12);
  let rDay = day2 - Math.floor((m1 * 306 + 5) / 10) + 1;
  return year.toString() + '-' + ('0' + month).slice(-2) + '-' + ('0' + rDay).slice(-2);
};

//deals with date, dateTime, instant, period, and timing
//use like this: query['whatever'] = dateQueryBuilder(whatever, 'dateTime'), but it's different for period and timing
//the condition service has some examples you might want to look at.
//can't handle prefixes yet!
//Also doesn't work foe when things are stored in different time zones in the .json files (with the + or -)
//  UNLESS, the search parameter is teh exact same as what is stored.  So, if something is stored as 2016-06-03T05:00-03:00, then the search parameter must be 2016-06-03T05:00-03:00
//It's important to make sure formatting is right, dont forget a leading 0 when dealing with single digit times.
let dateQueryBuilder = function (date, type, path) { //fork元のコードがかなりやばいので1から書き直したい
  let regex = /^(\D{2})?(\d{4})(-\d{2})?(-\d{2})?(?:(T\d{2}:\d{2})(:\d{2})?)?(Z|(\+|-|\s)(\d{2}):(\d{2}))?$/;
  const dateTerms = [].concat(date);
  let match = dateTerms.length === 1 ? date.match(regex) : dateTerms.map(elm => elm.match(regex));
  // let match = dateTerms.map(elm => elm.match(regex));
  let str = '';
  let toRet = [];
  let pArr = []; //will have other possibilities such as just year, just year and month, etc
  let prefix = '$eq';

  let dateArr = [];
  const arr = {};
  dateArr = dateTerms;
  // console.log(dateTerms.length);
  // console.log(match);

  if (dateArr.length === 1){
    if (match && match.length >= 1) {
        if (match[1]) { // replace prefix with mongo specific comparators
          prefix = '$' + match[1].replace('ge', 'gte').replace('le', 'lte');
        }
        if (type === 'date') { //if its just a date, we don't have to worry about time components
          if (prefix === '$eq' || prefix === '$ne') { //add parts of date that are available
            for (let i = 2; i < 5; i++) { //add up the date parts in a string
              if (match[i]) {
                str = str + match[i];
                pArr[i - 2] = str + '$';
              }
            }
            return prefix === '$eq' ? {'$regex': '^' + str} : { $not: {'$regex': '^' + str} };
          } else {
            for (let i = 2; i < 10; i++) {
                if (match[i]) {
                  str = str + match[i];
                }
            }
            const moment_dt = moment.utc(str);// convert to format that mongo uses to store
            const datetime_utc = moment_dt.utc().format('YYYY-MM-DDTHH:mm:ssZ');
            Object.assign(arr, {[`${prefix}`]: datetime_utc});
          }
        }

        if (type === 'dateTime' || type === 'instant' || type === 'period' || type === 'timing') {
          //now we have to worry about hours, minutes, seconds, and TIMEZONES
          if (prefix === '$eq') {
            if (match[5]) {
              //to see if time is included
              for (let i = 2; i < 6; i++) {
                str = str + match[i];
                if (i === 5) {
                  pArr[i - 2] = str + 'Z?$';
                } else {
                  pArr[i - 2] = str + '$';
                }
              }
              if (type === 'instant') {
                if (match[6]) {
                  //to check if seconds were included or not
                  str = str + match[6];
                }
              }
              if (match[9]) {
                // we know there is a +|-hh:mm at the end
                let mins = 0;
                let hrs = 0;
                if (match[8] === '+') {
                  //time is ahead of UTC so we must subtract
                  let hM = match[5].split(':');
                  hM[0] = hM[0].replace('T', '');
                  mins = Number(hM[1]) - Number(match[10]);
                  hrs = Number(hM[0]) - Number(match[9]);
                  if (mins < 0) {
                    //when we subtract the minutes and go below zero, we need to remove an hour
                    mins = mod(mins, 60);
                    hrs = hrs - 1;
                  }
                  if (hrs < 0) {
                    //when hours goes below zero, we have to adjust the date
                    hrs = mod(hrs, 24);
                    str = getDateFromNum(
                      getDayNum(
                        Number(match[2]),
                        Number(match[3].replace('-', '')),
                        Number(match[4].replace('-', ''))
                      ) - 1
                    );
                  } else {
                    str = getDateFromNum(
                      getDayNum(
                        Number(match[2]),
                        Number(match[3].replace('-', '')),
                        Number(match[4].replace('-', ''))
                      )
                    );
                  }
                } else {
                  //time is behind UTC so we add
                  let hM = match[5].split(':');
                  hM[0] = hM[0].replace('T', '');
                  mins = Number(hM[1]) + Number(match[10]);
                  hrs = Number(hM[0]) + Number(match[9]);
                  if (mins > 59) {
                    //if we go above 59, we need to increase hours
                    mins = mod(mins, 60);
                    hrs = hrs + 1;
                  }
                  if (hrs > 23) {
                    //if we go above 23 hours, new day
                    hrs = mod(hrs, 24);
                    str = getDateFromNum(
                      getDayNum(
                        Number(match[2]),
                        Number(match[3].replace('-', '')),
                        Number(match[4].replace('-', ''))
                      ) + 1
                    );
                  } else {
                    str = getDateFromNum(
                      getDayNum(
                        Number(match[2]),
                        Number(match[3].replace('-', '')),
                        Number(match[4].replace('-', ''))
                      )
                    );
                  }
                }
                pArr[5] = str + '$';
                str = str + 'T' + ('0' + hrs).slice(-2) + ':' + ('0' + mins).slice(-2); //proper formatting for leading 0's
                let match2 = str.match(/^(\d{4})(-\d{2})?(-\d{2})(?:(T\d{2}:\d{2})(:\d{2})?)?/);
                if (match2 && match2.length >= 1) {
                  pArr[0] = match2[1] + '$'; //YYYY
                  pArr[1] = match2[1] + match2[2] + '$'; //YYYY-MM
                  pArr[2] = match2[1] + match2[2] + match2[3] + '$'; //YYYY-MM-DD
                  pArr[3] =
                    match2[1] +
                    match2[2] +
                    match2[3] +
                    'T' +
                    ('0' + hrs).slice(-2) +
                    ':' +
                    ('0' + mins).slice(-2) +
                    'Z?$';
                }
                if (match[6]) {
                  //to check if seconds were included or not
                  pArr[4] = str + ':' + ('0' + match[6]).slice(-2) + 'Z?$';
                  str = str + match[6];
                }
                if (!pArr[4]) {
                  //fill empty spots in pArr with ^$ to make sure it can't just match with nothing
                  pArr[4] = '^$';
                }
              }
            } else {
              for (let i = 2; i < 5; i++) {
                //add up the date parts in a string, done to make sure to update anything if timezone changed anything
                if (match[i]) {
                  str = str + match[i];
                  pArr[i - 2] = str + '$';
                }
              }
            }
            let regPoss = {
              $regex: new RegExp(
                '^' +
                  '(?:' +
                  pArr[0] +
                  ')|(?:' +
                  pArr[1] +
                  ')|(?:' +
                  pArr[2] +
                  ')|(?:' +
                  pArr[3] +
                  ')|(?:' +
                  pArr[4] +
                  ')'
              ),
            };
            if (type === 'period') {
              str = str + 'Z';
              let pS = path + '.start';
              let pE = path + '.end';
              toRet = [
                {
                  $and: [
                    { [pS]: { $lte: str } },
                    { $or: [{ [pE]: { $gte: str } }, { [pE]: regPoss }] },
                  ],
                },
                { $and: [{ [pS]: { $lte: str } }, { [pE]: undefined }] },
                { $and: [{ $or: [{ [pE]: { $gte: str } }, { [pE]: regPoss }] }, { [pS]: undefined }] },
              ];
              return toRet;
            }
            let tempFill = pArr.toString().replace(/,/g, ')|(?:') + ')'; //turning the pArr to a string that can be used as a regex
            if (type === 'timing') {
              let pDT = path + '.event';
              let pBPS = path + '.repeat.boundsPeriod.start';
              let pBPE = path + '.repeat.boundsPeriod.end';
              toRet = [
                {
                  [pDT]: {
                    $regex: new RegExp(
                      '^' + '(?:' + str + ')|(?:' + match[0].replace('+', '\\+') + ')|(?:' + tempFill,
                      'i'
                    ),
                  },
                },
                {
                  $and: [
                    { [pBPS]: { $lte: str } },
                    { $or: [{ [pBPE]: { $gte: str } }, { [pBPE]: regPoss }] },
                  ],
                },
                { $and: [{ [pBPS]: { $lte: str } }, { [pBPE]: undefined }] },
                {
                  $and: [
                    { $or: [{ [pBPE]: { $gte: str } }, { [pBPE]: regPoss }] },
                    { [pBPS]: undefined },
                  ],
                },
              ];
              return toRet;
            }

            return {
              [path]: {
                $regex: '^' + '(?:' + str + ')|(?:' + match[0].replace('+', '\\+') + ')|(?:' + tempFill,
                $options: 'i'
              }
            };

          } else {
            if (match[5]){
              for (let i = 2; i < 7; i++) {
                str = str + match[i];
              }
              if (match[9]) {
                str = str + '+' + match[9] + ':' + match[10];
              }
            } else {
              for (let i = 2; i < 5; i++) {
                //add up the date parts in a string, done to make sure to update anything if timezone changed anything
                if (match[i]) {
                  str = str + match[i];
                }
              }
            }
            console.log(str);

            return {[path]: {[`$${match[1]}`]: str}};
          }
        }
      }
  } else {
    dateArr.forEach(elm => {
      const matchs = elm.match(regex);
      prefix = matchs[1];
      for (let i2 = 2; i2 < 10; i2++) {
        if (matchs[`${i2}`]) {
          str = str + matchs[`${i2}`];
        }
      }
      const moment_dt = moment.utc(str); // convert to format that mongo uses to store
      const datetime_utc = moment_dt.utc().format('YYYY-MM-DDTHH:mm:ssZ');
      str = '';
      Object.assign(arr, {[`$${prefix}`]: datetime_utc});
    });
  }

  // return {[path]:arr}
    return arr;
};
/**
 * @name compositeQueryBuilder
 * @description from looking at where composites are used, the fields seem to be implicit
 * @param target What we're querying for
 * @param field1 contains the path and search type
 * @param field2 contains the path and search type
 */
let compositeQueryBuilder = function (target, field1, field2) {

  let composite = [];
  let temp = {};
  let [target1, target2] = target.split(/[$,]/);
  let [path1, type1] = field1.split('|');
  let [path2, type2] = field2.split('|');
  console.log([target]);
  // console.log(field1)
  // console.log(field2)
  console.log([path1, type1]);
  // console.log([path2, type2])

  // Call the right queryBuilder based on type
  switch (type1) {
    case 'string':
      temp = {};
      temp[`${path1}`] = stringQueryBuilder(target1);
      composite.push(temp);
      break;
    case 'token':
      composite.push({
        $or: [
          { $and: [tokenQueryBuilder(target1, 'code', path1, '')] },
          { $and: [tokenQueryBuilder(target1, 'value', path1, '')] },
        ],
      });
      break;
    case 'reference':
      composite.push(referenceQueryBuilder(target1, path1));
      break;
    case 'quantity':
      composite.push(quantityQueryBuilder(target1, path1));
      break;
    case 'number':
      temp = {};
      temp[`${path1}`] = numberQueryBuilder(target1);
      composite.push(temp);
      break;
    case 'date':
      composite.push({
        $or: [
          { [path1]: dateQueryBuilder(target1, 'date', '') },
          { [path1]: dateQueryBuilder(target1, 'dateTime', '') },
          { [path1]: dateQueryBuilder(target1, 'instant', '') },
          { $or: dateQueryBuilder(target1, 'period', path1) },
          { $or: dateQueryBuilder(target1, 'timing', path1) },
        ],
      });
      break;
    default:
      temp = {};
      temp[`${path1}`] = target1;
      composite.push(temp);
  }
  switch (type2) {
    case 'string':
      temp = {};
      temp[`${path2}`] = stringQueryBuilder(target2);
      composite.push(temp);
      break;
    case 'token':
      composite.push({
        $or: [
          { $and: [tokenQueryBuilder(target2, 'code', path2, '')] },
          { $and: [tokenQueryBuilder(target2, 'value', path2, '')] },
        ],
      });
      break;
    case 'reference':
      composite.push(referenceQueryBuilder(target2, path2));
      break;
    case 'quantity':
      composite.push(quantityQueryBuilder(target2, path2));
      break;
    case 'number':
      temp = {};
      temp[`${path2}`] = composite.push(numberQueryBuilder(target2));
      composite.push(temp);
      break;
    case 'date':
      composite.push({
        $or: [
          { [path2]: dateQueryBuilder(target2, 'date', '') },
          { [path2]: dateQueryBuilder(target2, 'dateTime', '') },
          { [path2]: dateQueryBuilder(target2, 'instant', '') },
          { $or: dateQueryBuilder(target2, 'period', path2) },
          { $or: dateQueryBuilder(target2, 'timing', path2) },
        ],
      });
      break;
    default:
      temp = {};
      temp[`${path2}`] = target2;
      composite.push(temp);
  }
  if (target.includes('$')) {
    console.log({$and: JSON.stringify(composite)});
    return { $and: composite };
  } else {
    console.log({$or: JSON.stringify(composite)});
    return { $or: composite };
  }
};

/**
 * @todo build out all prefix functionality for number and quantity and add date queries
 */
module.exports = {
  stringQueryBuilder,
  tokenQueryBuilder,
  referenceQueryBuilder,
  addressAndNameQueryBuilder,
  numberQueryBuilder,
  quantityQueryBuilder,
  compositeQueryBuilder,
  dateQueryBuilder,
  dateQB
};
