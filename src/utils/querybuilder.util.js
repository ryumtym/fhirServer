const moment = require('moment-timezone');
const Big = require('big.js');
const { invalidParameterError, unknownParameterError } = require('./error.util');

/**
 * @name isValidModifier
 * @description 検索パラメーター(type)内でクエリ修飾子(modifier)が使用可能かチェック
 * @param {string} type 検索パラメーター
 * @param {string} modifier 修飾子
 * @return a mongo regex query
 * @see http://community.fhir.org/t/searching-dates-and-time-zone/547
 */
const isValidModifier = (type, modifier) => {
  const validModifiers = {
    date: ['', 'missing'],
    string: ['', 'missing', 'contains', 'exact'],
    token: ['', 'missing', 'not', 'text'],
    uri: ['', 'missing', 'below'],
  };

  const isValid = validModifiers[type].some(item => item === modifier);
  if (isValid){ return isValid; }
  if (!isValid){ throw (unknownParameterError('Modifier', modifier, validModifiers[type].filter(Boolean))); }
};

const uriQB = (target, field, modifier) => {
  isValidModifier('uri', modifier);
  const andQueryBundle = [];
  const orQueryBundle = [];
  const mongoQuery = [];
  const targetTerms = target.split(/[\s,]+/).filter(Boolean);
  const insertionArray = (targetTerms.length === 1) ? andQueryBundle : orQueryBundle; //配列数が1ならandQueryBundleに、配列数が1以外なら orQueryBundleに格納

  const patternMatchQuery = (value, modif) => { // 修飾子に応じて検索値を作成する
    //todo above検索(ドキュメント読んでも意味不明)
    if (modif === '') { return { $regex: '^' + value + '$' }; } //完全一致
    if (modif === 'below') { return { $regex: '^' + value, $options: 'i' }; } // 前方一致
    if (modif === 'missing' && target === 'true') { return null; }
    if (modif === 'missing' && target === 'false') { return {$ne: null}; }
  };

  for ( const item of targetTerms ) { insertionArray.push({[field]: patternMatchQuery(item, modifier)}); }

  if (andQueryBundle.length){ mongoQuery.push({'$and': andQueryBundle}); }
  if (orQueryBundle.length ){ mongoQuery.push({'$or': orQueryBundle }); }

  return mongoQuery;
};


const numQB = (target, field) => {
  //num型かstr型ならok 他はエラー処理
  if ( typeof (target) !== 'string' && typeof (target) !== 'number'){ throw (invalidParameterError('', target, 'Str or Number eg: eq200, 0.9')); }
  const targetTerms = target.split(/[\s,]+/).filter(Boolean);
  const andQueryBundle = [];
  const orQueryBundle = [];
  const mongoQuery = [];
  const regex = /(^[a-zA-Z]*)(.*)/;
  const insertionArray = (targetTerms.length === 1) ? andQueryBundle : orQueryBundle; //配列数が1ならandQueryBundleに、配列数が1以外なら orQueryBundleに格納

  // https://www.hl7.org/fhir/search.html#number
  const buildRangeValue = (num) => { //引数を基に範囲検索用の数値をつくる eg:[100 -> 0.5], [0.8 -> 0.05]
    const decimals = num.toString().split('.')[1];
    const decimalDigit = (decimals) ? decimals.length + 1 : 1;
    return (1 / 10 ** decimalDigit) * 5;
  };

  const isValidPrefix = (prefix) => { //演算子が使用可能な値か確認してbool型で返す
    const validPrefix = [ 'eq', 'ne', 'gt', 'lt', 'ge', 'le'];
    return validPrefix.some(item => item === prefix);
  };

  const toMongoPrefix = (prefix) => { // 渡された演算子をmongoDBに沿う形で返却
    if (prefix === 'eq'){return '$eq';}
    if (prefix === 'ne'){return '$ne';}
    if (prefix === 'gt'){return '$gt';}
    if (prefix === 'lt'){return '$lt';}
    if (prefix === 'ge'){return '$gte';}
    if (prefix === 'le'){return '$lte';}
  };

  for ( const item of targetTerms ) {
    const [prefix, srchNum] = item.toString().match(regex).slice(1).map(x => isNaN(x) ? x : Number(x));

    if (prefix && !isValidPrefix(prefix)){ throw (invalidParameterError('不正なprefix')); }
    if (isNaN(srchNum)){ throw (invalidParameterError('アラビア数字か指数表記以外使用不可')); }

    const mongoPrefix = toMongoPrefix(prefix);

    if (mongoPrefix){ //prefixの指定がある -> そのままの値を使い検索
      insertionArray.push({[field]: { [mongoPrefix]: srchNum }});
    }

    if (!mongoPrefix) { //prefixの指定がない場合 ->buildRangeValue関数を使い範囲検索化
      const x = new Big(srchNum); //IEEE754に対応するためにBig.jsを使用 console.log(0.8+0.05) https://neightbor.net/blog/javascript-calculation-error/
      const searchRange = buildRangeValue(srchNum);
      insertionArray.push({ [field]: { $gt: x.minus(searchRange).toNumber(), $lt: x.plus(searchRange).toNumber() } });
    }
  }

  if (andQueryBundle.length){ mongoQuery.push({'$and': andQueryBundle}); }
  if (orQueryBundle.length ){ mongoQuery.push({'$or': orQueryBundle }); }
  console.log(JSON.stringify(mongoQuery));
  return mongoQuery;
};

/**
 * @name dateQB
 * @description targetで与えられた値を基にmongoQueryを作成する
 * @param {string} target what we are querying for
 * @param {string} path JSON path
 * @return a mongo regex query
 * @see http://community.fhir.org/t/searching-dates-and-time-zone/547
 */
let dateQB = function (target, type, path, modifier) {
  const targetTerms = [].concat(target); //配列化
  const regex = /(^[a-zA-Z]*)(.*)/; // https://regex101.com/ eg: gt2005-03-04 => ['gt2005-03-04', 'gt', '20152005-03-04']
  const mongoQuery = []; //この関数から最終的に吐き出されるmongoQuery
  if (!target){ return mongoQuery; }

  const findDateBoundary = (prefix, dateStr, dateFormat) => { // 比較演算子,日付,フォーマットを基にstartOf,endOf化した日付を返す
    // eg: moment('2022').startOf('day') -> 2022-01-01
    // eg: moment('2022').endOf('day') -> 2022-12-31
    const granularityMap = {
      'YYYY': 'year',
      'YYYY-MM': 'month',
      'YYYY-MM-DD': 'day',
      'YYYY-MM-DDTHH': 'hour',
      'YYYY-MM-DDTHH:mm': 'minute',
      'YYYY-MM-DDTHH:mm:ss': 'second',
    };

    const dateGranularity = granularityMap[dateFormat];
    // 比較演算子が $gt -> startOf $lt -> endOf
    if (prefix === '$gt' || prefix === '$gte'){ return moment(dateStr).startOf(dateGranularity).format('YYYY-MM-DDTHH:mm:ssZ'); }
    if (prefix === '$lt' || prefix === '$lte'){ return moment(dateStr).endOf(dateGranularity).format('YYYY-MM-DDTHH:mm:ssZ'); }
  };

  const isISO8601 = (dateStr) => { // iso8601形式か確認
    const isUTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/.test(dateStr);
    const isOtherTimeZone = /^(\d{4})(-\d{2})?(-\d{2})?(?:(T\d{2}:\d{2})(:\d{2})?)?(Z|(\+|-|\s)(\d{2})(:\d{2}))?$/.test(dateStr);
    if (!isUTC && !isOtherTimeZone){ return false; }
    else { return true; }
  };

  const isValidPrefix = (prefix) => { //演算子が使用可能な値か確認してbool型で返す
    const validPrefix = [ 'eq', 'ne', 'gt', 'lt', 'ge', 'le', undefined, ''];
    const isValid = validPrefix.some(item => item === prefix);
    return isValid;
  };

  const isValidFormat = (dateStr) => { // 日付値が使用可能なフォーマットか確認 後でbool返す形に直す
    const validFormats = ['YYYY', 'YYYY-MM', 'YYYY-MM-DD', 'YYYY-MM-DDTHH', 'YYYY-MM-DDTHH:mm', 'YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSSZ'];
    const isValid = moment(dateStr, validFormats, true).isValid();
    if (isValid) { return moment(dateStr).creationData().format; }
    if (!isValid){ throw (invalidParameterError('date/time format', dateStr, validFormats )); }
  };

  const toMongoPrefix = (prefix) => { // 渡された演算子をmongoDBに沿う形で返却
    if (prefix === 'eq' || prefix === undefined || prefix === ''){return '$eq';}
    // if (prefix === 'eq'){return '$eq';}
    if (prefix === 'ne'){return '$ne';}
    if (prefix === 'gt'){return '$gt';}
    if (prefix === 'lt'){return '$lt';}
    if (prefix === 'ge'){return '$gte';}
    if (prefix === 'le'){return '$lte';}
  };

  const toFormat = (dateStr) => moment(dateStr).creationData().format; // 日付をフォーマット化 eg: 2000-01-01 -> YYYY-MM-DD

  for ( const elm of targetTerms ) {

    if (modifier === 'missing'){ // modifierがmissingで値がtrueかfalseならこれ実行して終了
      if (elm === 'true') {mongoQuery.push({[path]: null}); }
      if (elm === 'false') {mongoQuery.push({[path]: {$ne: null}}); }
      return mongoQuery;
    }

    const [, prefixValue, dateValue] = elm.match(regex); // 入ってきた値をregexで分割

    // 使用可能なprefixか、iso8601か、それぞれboolチェック falseならエラー処理
    if (!isValidPrefix(prefixValue)) { throw (unknownParameterError('Prefix', prefixValue, ['eq', 'ne', 'gt', 'lt', 'ge', 'le'] )); }
    if (!isISO8601(dateValue)){ throw (invalidParameterError('date/time format', dateValue, 'ISO8601 formats only' ));}
    if (!isValidFormat(dateValue)){ throw (invalidParameterError('date/time format', dateValue, ['YYYY', 'YYYY-MM', 'YYYY-MM-DD', 'YYYY-MM-DDTHH', 'YYYY-MM-DDTHH:mm', 'YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSSZ'] ));}

    // prefixをmongoで検索する形に変更
    const mongoPrefix = toMongoPrefix(prefixValue);

    // クエリ値を作成、検索値が分以下を含んでいて、offsetがない場合は09:00(Asia/Tokyo)に変換
    // fhirの日付&offset仕様がまだ固まっていないので暫定的な処理 http://community.fhir.org/t/searching-dates-and-time-zone/547
    const queryValue = (() => {
      const validFormat1 = ['YYYY', 'YYYY-MM', 'YYYY-MM-DD', 'YYYY-MM-DDTHH', 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSSZ'];
      const validFormat2 = ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DDTHH:mm:ss'];
      if (validFormat1.some(v => v === toFormat(dateValue) )){ return dateValue; }
      if (validFormat2.some(v => v === toFormat(dateValue) )){ return moment(dateValue).utcOffset('+09:00').format('YYYY-MM-DDTHH:mm:ssZ'); }
      throw (invalidParameterError('date/time format', dateValue, [...validFormat1, ...validFormat2] ));
    })();

    // moment(elements[2]).format();
    // moment(elements[2]).utcOffset('+01:00').format('YYYY-MM-DDTHH:mm:ssZ');

    // 秒以下の指定があるかを確認してbool型で返す
    const hasTimeZone = ['YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSSZ'].some(v => v === toFormat(queryValue) );

    const queryTerm = (() => { // queryを作成
      if (mongoPrefix === '$eq' && hasTimeZone) { return { [mongoPrefix]: queryValue }; }
      else if (mongoPrefix === '$eq' && !hasTimeZone){ return { $regex: '^' + queryValue }; }
      else if (mongoPrefix === '$ne' && hasTimeZone){ return { [mongoPrefix]: queryValue }; }
      else if (mongoPrefix === '$ne' && !hasTimeZone) { return { $not: { $regex: '^' + queryValue} }; }
      else { return { [mongoPrefix]: findDateBoundary(mongoPrefix, queryValue, toFormat(queryValue))}; }
    })();

    mongoQuery.push({[path]: queryTerm});
  }

  return mongoQuery;
};


/**
 * @name addressAndNameQueryBuilder
 * @type function
 * @description brute force method of matching human names. Splits the input and checks to see if every piece matches to
 * at least 1 part of the name field using regexs. Ignores case
 * @param {string} target
 * @param {string} field 'address' or 'name'
 * @param {string} modif https://www.hl7.org/fhir/search.html#string
 * @return {array} ors
 */
let addressOrNameQueryBuilder = function (target, field, modifier) {
  isValidModifier('string', modifier);
  const andQueryBundle = [];
  const orQueryBundle = [];
  const mongoQuery = [];
  const targetToArray = [].concat(target); //配列化
  const targetTerms = targetToArray.map(elm => elm.replace(/[\\(\\)\\-\\_\\+\\=\\/\\.]/g, '\\$&')); // ()^_+=/.を全てエスケープ
  if (!target){ return mongoQuery; }

  const buildQueryValue = (value, modif) => { // 修飾子に応じて検索値を作成する
    if (modif === '') { return { $regex: '^' + value, $options: 'i' }; } //前方一致
    if (modif === 'contains') { return { $regex: value, $options: 'i' }; } // 部分一致
    if (modif === 'exact') { return { $regex: '^' + value + '$' }; } //完全一致
    if (modif === 'missing' && value === 'true') { return null; }
    if (modif === 'missing' && value === 'false') { return { '$ne': null }; }
  };

  const queryKeyFields = (() => {
    if (modifier === 'missing') { return [field]; }
    if (field === 'name'){ return ['name.text', 'name.family', 'name.given', 'name.suffix', 'name.prefix']; }
    if (field === 'address'){ return ['address.line', 'address.city', 'address.district', 'address.state', 'address.postalCode', 'address.country']; }
  })();

  for (const term of targetTerms) {
    // const itemList = decodeURI(term).split(/,/);
    const itemList = term.split(/,/);
    const insertionArray = (itemList.length === 1) ? andQueryBundle : orQueryBundle;
    for (const item of itemList){
      const value = buildQueryValue(item, modifier);
      const resultQuery = queryKeyFields.map(key => ({ [key]: value }));
      insertionArray.push({'$or': resultQuery});
    }
  }

  if (andQueryBundle.length){ mongoQuery.push({'$and': andQueryBundle}); }
  if (orQueryBundle.length ){ mongoQuery.push({'$or': orQueryBundle }); }

  return mongoQuery;
};

/**
 * @name stringQueryBuilder
 * @description builds mongo default query for string inputs, no modifiers
 * @param {string} target what we are querying for
 * @param {string} field mongo field(path)
 * @param {string} modif modifier contains->部分一致, exact->完全一致, それ以外->前方一致
 * @return a mongo regex query
 */
 let stringQueryBuilder = function (target, field, modifier) {
  isValidModifier('string', modifier);
  const andQueryBundle = [];
  const orQueryBundle = [];
  const mongoQuery = [];
  const targetToArray = [].concat(target); //配列化
  const targetTerms = targetToArray.map(elm => elm.replace(/[\\(\\)\\-\\_\\+\\=\\/\\.]/g, '\\$&')); // ()^_+=/.を全てエスケープ
  if (!target){ return mongoQuery; }

  const buildQueryValue = (value, modif) => { // modifierに応じた検索値を作成する
    if (modif === '') { return { $regex: '^' + value, $options: 'i' }; } //前方一致
    if (modif === 'contains') { return { $regex: value, $options: 'i' }; } // 部分一致
    if (modif === 'exact') { return { $regex: '^' + value + '$' }; } //完全一致
    if (modif === 'missing' && value === 'true') { return null; } // https://www.hl7.org/fhir/search.html#modifiers
    if (modif === 'missing' && value === 'false') { return {$ne: null}; }
  };


  for (const term of targetTerms){ // 渡された値(target)をカンマでsplitし、もし配列数が1ならandQueryBundleに、配列数が1以外なら orQueryBundleに格納
    const itemList = term.split(/,/);
    const insertionArray = itemList.length === 1 ? andQueryBundle : orQueryBundle;
    for (const item of itemList){
      insertionArray.push({
        [field]: buildQueryValue(item, modifier)
      });
    }
  }

  if (andQueryBundle.length){ mongoQuery.push({'$and': andQueryBundle}); }
  if (orQueryBundle.length ){ mongoQuery.push({'$or': orQueryBundle }); }
  return mongoQuery;
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
 * @see https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Set/has
 * @see https://stackoverflow.com/questions/263965/how-can-i-convert-a-string-to-boolean-in-javascript
*/

let tokenQueryBuilder = function (target, type, field, required, dataType, modifier) {
  isValidModifier('token', modifier);
  const andQueryBundle = [];
  const orQueryBundle = [];
  const mongoQuery = [];
  const targetTerms = [].concat(target);
  if (!target){ return mongoQuery; }

  const buildQuery = (v, path, modif) => { // dataTypeに応じてmondoDBで使用するクエリのvalueを作成する
    if (modif === 'missing' && v === 'true') { return {[path]: null}; }
    if (modif === 'missing' && v === 'false') { return {[path]: {$ne: null}}; }

    if (dataType === 'boolean'){ // 文字列を真偽値に置き換え、もしできなかったらerror処理
      try { return {[path]: JSON.parse(v.toLowerCase())}; }
      catch { throw unknownParameterError(path, target, 'boolean type'); }
    }

    if (dataType === 'string' || dataType === 'identifier' && modif === 'text'){
      return {[path]: v };
    }

    // "|" が存在する場合は、v の値を "|" の左右に分ける 存在しない場合は、system=null
    const result = [];
    const [system, value] = v.includes('|') ? v.split('|') : [null, v];
    if (system){ result.push({ [`${path}.system` ]: system}); }
    if (value) { result.push({ [`${path}.${type}`]: value }); }
    return result;

  };

  for (const term of targetTerms){
    const itemList = term.split(/,/);
    const insertionArray = itemList.length === 1 ? andQueryBundle : orQueryBundle;
    for (const item of itemList){
      insertionArray.push(buildQuery(item, field, modifier));
    }
  }

  if (andQueryBundle?.length && modifier === 'not'){ mongoQuery.push( {['$nor']: andQueryBundle.flat()} ); }
  if (andQueryBundle?.length && modifier !== 'not'){ mongoQuery.push( {['$and']: andQueryBundle.flat()} ); }
  if (orQueryBundle?.length && modifier === 'not') { mongoQuery.push( {['$nor']: orQueryBundle.flat()} ); }
  if (orQueryBundle?.length && modifier !== 'not') { mongoQuery.push( {['$or']: orQueryBundle.flat()} ); }
  return mongoQuery;
};

/**
 * @name referenceQueryBuilder
 * @param {string} target
 * @param {string} field
 * @return {JSON} queryBuilder
 */
let referenceQueryBuilder = function (target, field, modifier) {
  const andQueryBundle = [];
  const orQueryBundle = [];
  const mongoQuery = [];
  const targetTerms = [].concat(target);
  if (!target){ return mongoQuery; }

  const buildQueryValue = (v, modif) => {
    const isURL = /^https?:\/\/[\w/:%#$&?()~.=+-]+$/.test(v); //https?:(.*)?\/(.+)\/(.+)\?(.+)=(.+)$

    if (modif === 'missing' && v === 'true') {
      return null;
    } else if (modif === 'missing' && v === 'false') {
      return { $ne: null };
    } else if (isURL) {
      return v; // Check if target is a url  //return {[path]: match[2]};
    } else if (v.includes('/')) { // target = type/id
      let [type, id] = v.split('/');
      return `${type}/${id}`;
    } else {
      return { $regex: new RegExp(`${v}$`) }; // else -> target = id The type may be there so we need to check the end of the field for the id
    }
  };

  for (const term of targetTerms) { // 渡された値(target)をカンマでsplitし、もし配列数が1ならandQueryBundleに、配列数が1以外なら orQueryBundleに格納
    const itemList = term.split(/,/);
    const insertionArray = itemList.length === 1 ? andQueryBundle : orQueryBundle;
    for (const item of itemList){
      insertionArray.push({ [field]: buildQueryValue(item, modifier) });
    }
  }

  if (andQueryBundle?.length){ mongoQuery.push({['$and']: andQueryBundle}); }
  if (orQueryBundle?.length) { mongoQuery.push({['$or']: orQueryBundle}); }
  return mongoQuery;
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
  addressOrNameQueryBuilder,
  numberQueryBuilder,
  quantityQueryBuilder,
  compositeQueryBuilder,
  dateQueryBuilder,
  dateQB,
  // numQB,
  // uriQB
};
