const {
  unknownParameterError,
  cannotCombineParameterError
} = require('./error.util');

// _elements,_sumary,_sortに関してはqueryを作成, _elements&_summaryは一緒に使えない事に注意
// _include,_revincludeは他のリソースを読み取るためのパラメーターを配列として返却
// _countはクエリ作成が必要ないためそのまま使用
// https://www.hl7.org/fhir/search.html#elements
// https://www.mongodb.com/community/forums/t/projection-does-not-allow-exclusion-inclusion-together/31756
// https://chaika.hatenablog.com/entry/2019/05/07/083000

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

const _includeParamsBuilder = (target) => {
  //正規表現: カンマ区切りで分割  eg: Patient:organization -> match1=Patient, match2=organization
  const reg = /\w+[^:]+/g; ///\w+\s*(?:(?:;(?:\s*\w+\s*)?)+)?/
  const commaSplitter = target.split(',');
  return commaSplitter.filter(Boolean).map(elm => { return elm.match(reg).slice(1); });
};

const _revincludeParamsBuilder = (target) => {
  const reg = /\w+[^:]+/g; ///\w+\s*(?:(?:;(?:\s*\w+\s*)?)+)?/
  const commaSplitter = target.split(',');
  return commaSplitter.filter(Boolean).map(elm => { return elm.match(reg); });
};

const _sortQueryBuilder = (target, srchParams) =>{
  const hasHyphen = /^([-])([a-zA-Z0-9.,$;-]+$)/;
  const specifySortOrder = { $sort: {} };
  const existChecker = {};
  const caseInsensitive = { collation: { locale: 'en', strength: 2 } };

  const commaSeparateArr = target.split(',');
  const refSrchParams = srchParams.reduce((obj, data) => ({...obj, [data.name]: data}), {});
  const sortOptions = commaSeparateArr.map(str => {
    const pathBuilder = (path) => path?.split('.').slice(1).join('.');

    if (hasHyphen.test(str) && str.substr(1) in refSrchParams){
        return { targetPath: pathBuilder(refSrchParams[str.substr(1)].xpath), sortOrder: -1};
    } else if (!hasHyphen.test(str) && str in refSrchParams){
        return { targetPath: pathBuilder(refSrchParams[str].xpath), sortOrder: 1};
    } else {
      throw (unknownParameterError('_sort', str, Object.keys(refSrchParams)));
    }
  });

  sortOptions.map(valueOf => {
    specifySortOrder.$sort[valueOf.targetPath] = valueOf.sortOrder;
    existChecker[valueOf.targetPath] = { $exists: true };
  });
  return {specifySortOrder, existChecker, caseInsensitive};
};

const _summaryQueryBuilder = (target, fieldType) =>{
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

// _sort logic is still so annyoing.
const r4ResultParamsBuilder = (args, srchParams) => {
  const defaultRecordCounts = 10;
  let query = {};
  let { _count, _sort, _elements, _include, _revinclude, _summary } = args;

  if (_elements && _summary){ throw (cannotCombineParameterError(['_elements', '_summary'])); }

  if (_elements) { query._filter = _elementsQueryBuilder(_elements, 'fields'); }
  if (_summary) { query._filter = _summaryQueryBuilder(_summary, 'fields' ); }
  if (_count) { query._count = _count; }
  if (_include) { query._include = _includeParamsBuilder(_include); }
  if (_revinclude) { query._revinclude = _revincludeParamsBuilder(_revinclude); }

  return {
    _count: query._count || defaultRecordCounts, // defaultRecordCounts = 10
    _filter: query._filter,
    _include: query._include,
    _revinclude: query._revinclude,
  };
};

module.exports = {
  r4ResultParamsBuilder,
};
