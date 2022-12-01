const e = require('express');
const {
  unknownParameterError,
  cannotCombineParameterError
} = require('./error.util');

// _elements,_sumary,_sortに関してはqueryを作成, _elements&_summaryは一緒に使えない事に注意
// _include,_revincludeは他のリソースを読み取るためのパラメーターを配列として返却
// _countはクエリ作成が必要ないためデフォルトで10件まで表示、最大100まで
// ↑ Azureはデフォルト10&最大1000, hapifhirはデフォルト20最大500まで
// https://www.hl7.org/fhir/search.html#elements
// https://www.mongodb.com/community/forums/t/projection-does-not-allow-exclusion-inclusion-together/31756
// https://chaika.hatenablog.com/entry/2019/05/07/083000


/**
 * @name _elementsQueryBuilder
 * @url https://www.hl7.org/fhir/search.html#elements
 * @description _elementsパラメーターを基にQueryを作成
 * @param {string} target what we are querying for
 * @param {string} fieldType find,aggregateに応じて変更
 * @return a mongo query
 */
const _elementsQueryBuilder = (target, fieldType) => {
  const validValues = target.split(',').filter(Boolean);

  //1文字目がハイフンでないならvisibleElm 1文字目がハイフンならhiddenElm
  const hasHyphen = /^([-])([a-zA-Z0-9.,$;]+$)/;
  const visibleElm = validValues.filter(value => !hasHyphen.exec(value) );
  const hiddenElm = validValues.filter(value => hasHyphen.exec(value) );

  //もし配列両方に値が入ってたら or もしvisibleElm配列にのみ値が入ってたら  -> visibleElmのみでクエリをつくる
  //もしhiddenElmにのみ値が入っていたなら -> ハイフンを取り除いてhiddenElmのみでクエリをつくる
  if (visibleElm.length && hiddenElm.length || visibleElm.length && !hiddenElm.length){
    return { [fieldType]: visibleElm.reduce((obj, elm) => ({...obj, [elm]: 1}), {'id': 1, 'meta': 1}) };
  } else if (!visibleElm.length && hiddenElm.length ){
    return { [fieldType]: hiddenElm.reduce((obj, elm) => ({...obj, [elm.substr(1)]: 0}), {'id': 1, 'meta': 1}) };
  }
};

/**
 * @name _includeParamsBuilder
 * @url https://www.hl7.org/fhir/search.html#include
 * @description _includeパラメーターを基に配列を作成
 * @param {string} target what we are querying for
 * @return an array
 */
const _includeParamsBuilder = (target, srchableParams) => {
  //正規表現: カンマ区切りで分割  eg: Patient:organization -> match1=Patient, match2=organization
  const reg = /\w+[^:]+/g; // /\w+\s*(?:(?:;(?:\s*\w+\s*)?)+)?/
  const commaSplitter = target.split(',');
  const refTypesList = Object.keys(srchableParams.filter(valueOf => valueOf.fhirtype === 'reference').reduce((obj, data) => ({...obj, [data.name]: data}), {}));
  // console.log(commaSplitter);
  // console.log(Object.keys(refTypeParams));

  return commaSplitter.filter(Boolean).map(elm =>{
    if (refTypesList.includes(elm.match(reg)[1])){
      return elm.match(reg).slice(1);
    } else {
      throw (unknownParameterError('_include', elm, refTypesList));
    }
  });
  // return commaSplitter.filter(Boolean).map(elm => { return elm.match(reg).slice(1); });
};

// /**
//  * @name _revincludeParamsBuilder
//  * @url https://www.hl7.org/fhir/search.html#revinclude
//  * @description _revincludeパラメーターを基に配列を作成
//  * @param {string} target what we are querying for
//  * @return an array
//  */
const _revincludeParamsBuilder = (target) => {
  const reg = /\w+[^:]+/g; ///\w+\s*(?:(?:;(?:\s*\w+\s*)?)+)?/
  const commaSplitter = target.split(',');
  return commaSplitter.filter(Boolean).map(elm => { return elm.match(reg); });
};

/**
 * @name _countParamsBuilder
 * @url https://www.hl7.org/fhir/search.html#count
 * @description _countパラメーターを基に数値を返却
 * @param {number} target Number of data desired
 * @return {number} If the value is over 100 => return 100, else => return Unchanged value
 */
const _countParamsBuilder = (target) => {
  return target > 100 ? 100 : target;
};

// const _sortQueryBuilder = (target, srchParams) => {
// //   const hasHyphen = /^([-])([a-zA-Z0-9.,$;-]+$)/;
// //   const specifySortOrder = { $sort: {} };
// //   const existChecker = {};
// //   const caseInsensitive = { collation: { locale: 'en', strength: 2 } };

// //   const commaSeparateArr = target.split(',');
// //   const refSrchParams = srchParams.reduce((obj, data) => ({...obj, [data.name]: data}), {});
// //   const sortOptions = commaSeparateArr.map(str => {
// //     const pathBuilder = (path) => path?.split('.').slice(1).join('.');

// //     if (hasHyphen.test(str) && str.substr(1) in refSrchParams){
// //         return { targetPath: pathBuilder(refSrchParams[str.substr(1)].xpath), sortOrder: -1};
// //     } else if (!hasHyphen.test(str) && str in refSrchParams){
// //         return { targetPath: pathBuilder(refSrchParams[str].xpath), sortOrder: 1};
// //     } else {
// //       throw (unknownParameterError('_sort', str, Object.keys(refSrchParams)));
// //     }
// //   });

// //   sortOptions.map(valueOf => {
// //     specifySortOrder.$sort[valueOf.targetPath] = valueOf.sortOrder;
// //     existChecker[valueOf.targetPath] = { $exists: true };
// //   });
// //   return {specifySortOrder, existChecker, caseInsensitive};
// // };


// /**
//  * @name _summaryQueryBuilder
//  * @description _summaryパラメーターを基にクエリを作成
//  * @url https://www.hl7.org/fhir/search.html#summary
//  * @param {string} target what we are querying for
//  * @param {string} fieldType _sort指定があったら{$project}、なければ{fields}
//  * @return 引数targetが data,text,trueのいずれかなら mongoqueryを返す count,falseなら文字列を返す
//  */
const _summaryQueryBuilder = (target, fieldType) => {
  const r4SummaryTextValues = ['id', 'meta', 'text'];
  const r4SummaryDataValues = ['text'];
  // test for patient resource
  const r4SummaryTrueValues = [ 'identifier', 'active', 'name', 'telecom', 'gender', 'birthDate', 'address', 'managingOrganization', 'link'];

  const qB = (arr, orderNum) => { return arr.reduce((obj, data) => ({...obj, [data]: orderNum}), {}); };

  if (target === 'count') { return 'count'; }
  if (target === 'data' ) { return { [fieldType]: qB(r4SummaryDataValues, 0) }; }
  if (target === 'false') { return 'false'; }
  if (target === 'text' ) { return { [fieldType]: qB(r4SummaryTextValues, 1) }; }
  if (target === 'true' ) { return { [fieldType]: qB([...r4SummaryTextValues, ...r4SummaryTrueValues], 1)}; }
};

/**
 * @name r4ResultParamsBuilder
 * @description パラメーターを基に関数を呼び出してobjectを作成
 * @param {string} args parameter
 * @return an object
 */
// _sort logic is still so annyoing.
const r4ResultParamsBuilder = (args, srchableParams) => {
  const defaultRecordCount = 10;
  let query = {};
  let { _count, _elements, _include, _revinclude, _summary } = args;

  if (_elements && _summary) { throw (cannotCombineParameterError(['_elements', '_summary'])); }

  query._count = _count ? _countParamsBuilder(_count) : defaultRecordCount;
  if (_elements) { query._filter = _elementsQueryBuilder(_elements, 'fields'); }
  if (_summary) { query._filter = _summaryQueryBuilder(_summary, 'fields' ); }
  if (_include) { query._include = _includeParamsBuilder(_include, srchableParams); }
  if (_revinclude) { query._revinclude = _revincludeParamsBuilder(_revinclude); }

  return {
    _count: query._count,
    _filter: query._filter,
    _include: query._include,
    _revinclude: query._revinclude,
  };
};


class R4ResultParamsBuilder {

  constructor(args){
    this.args = args;
  }

  _countParamsBuilder(count) {
    return count > 100 ? 100 : count;
  }

  _summaryQueryBuilder(summary){
    const r4SummaryTextValues = ['id', 'meta', 'text'];
    const r4SummaryDataValues = ['text'];
    // test for patient resource
    const r4SummaryTrueValues = [ 'identifier', 'active', 'name', 'telecom', 'gender', 'birthDate', 'address', 'managingOrganization', 'link'];

    const qB = (arr, orderNum) => { return arr.reduce((obj, data) => ({...obj, [data]: orderNum}), {}); };

    if (summary === 'count') { return 'count'; }
    if (summary === 'data' ) { return { 'fields': qB(r4SummaryDataValues, 0) }; }
    if (summary === 'false') { return 'false'; }
    if (summary === 'text' ) { return { 'fields': qB(r4SummaryTextValues, 1) }; }
    if (summary === 'true' ) { return { 'fields': qB([...r4SummaryTextValues, ...r4SummaryTrueValues], 1)}; }
  }

  _elementsQueryBuilder(elements, targetType){
      const validValues = elements.split(',').filter(Boolean);

      //1文字目がハイフンでないならvisibleElm 1文字目がハイフンならhiddenElm
      const hasHyphen = /^([-])([a-zA-Z0-9.,$;]+$)/;
      const visibleElm = validValues.filter(value => !hasHyphen.exec(value) );
      const hiddenElm = validValues.filter(value => hasHyphen.exec(value) );

      //もし配列両方に値が入ってたら or もしvisibleElm配列にのみ値が入ってたら  -> visibleElmのみでクエリをつくる
      //もしhiddenElmにのみ値が入っていたなら -> ハイフンを取り除いてhiddenElmのみでクエリをつくる
      if (visibleElm.length && hiddenElm.length || visibleElm.length && !hiddenElm.length){
        return { [targetType]: visibleElm.reduce((obj, elm) => ({...obj, [elm]: 1}), {'id': 1, 'meta': 1}) };
      } else if (!visibleElm.length && hiddenElm.length ){
        return { [targetType]: hiddenElm.reduce((obj, elm) => ({...obj, [elm.substr(1)]: 0}), {'id': 1, 'meta': 1}) };
      }
  }

  _includeParamsBuilder(include){
      //正規表現: カンマ区切りで分割  eg: Patient:organization -> match1=Patient, match2=organization
      const reg = /\w+[^:]+/g; ///\w+\s*(?:(?:;(?:\s*\w+\s*)?)+)?/
      const commaSplitter = include.split(',');
      return commaSplitter.filter(Boolean).map(elm => { return elm.match(reg).slice(1); });
  }

  _revincludeParamsBuilder(revinclude){
      const reg = /\w+[^:]+/g; ///\w+\s*(?:(?:;(?:\s*\w+\s*)?)+)?/
      const commaSplitter = revinclude.split(',');
      return commaSplitter.filter(Boolean).map(elm => { return elm.match(reg); });
  }

  bundle(){
    const defaultRecordCount = 10;
    let query = {};
    let { _count, _elements, _include, _revinclude, _summary } = this.args;

    if (_elements && _summary) { throw (cannotCombineParameterError(['_elements', '_summary'])); }

    query._count = _countParamsBuilder(_count) || defaultRecordCount;
    if (_summary) { query._summary = _summaryQueryBuilder(_summary); }
    if (_elements) { query._elements = _elementsQueryBuilder(_elements, 'fields'); }
    if (_include) { query._include = _includeParamsBuilder(_include); }
    if (_revinclude) { query._revinclude = _revincludeParamsBuilder(_revinclude); }

    return query;
  }
}

module.exports = {
  R4ResultParamsBuilder,
  r4ResultParamsBuilder,
};