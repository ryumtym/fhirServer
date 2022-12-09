const { unknownParameterError, cannotCombineParameterError } = require('./error.util');
const { capitalizeInitial, splitter } = require('./functions.util');

// _elements,_sumary,_sortに関してはqueryを作成, _elements&_summaryは一緒に使えない事に注意
// _include,_revincludeは他のリソースを読み取るためのパラメーターを配列として返却
// _countはクエリ作成が必要ないためデフォルトで10件まで表示、最大100まで
// ↑ Azureはデフォルト10&最大1000, hapifhirはデフォルト20最大500まで
// https://www.hl7.org/fhir/search.html#elements
// https://www.mongodb.com/community/forums/t/projection-does-not-allow-exclusion-inclusion-together/31756
// https://chaika.hatenablog.com/entry/2019/05/07/083000


// const _sortQueryBuilder = (target, srchParams) => {
//   const hasHyphen = /^([-])([a-zA-Z0-9.,$;-]+$)/;
//   const specifySortOrder = { $sort: {} };
//   const existChecker = {};
//   const caseInsensitive = { collation: { locale: 'en', strength: 2 } };

//   const commaSeparateArr = target.split(',');
//   const refSrchParams = srchParams.reduce((obj, data) => ({...obj, [data.name]: data}), {});
//   const sortOptions = commaSeparateArr.map(str => {
//     const pathBuilder = (path) => path?.split('.').slice(1).join('.');

//     if (hasHyphen.test(str) && str.substr(1) in refSrchParams){
//         return { targetPath: pathBuilder(refSrchParams[str.substr(1)].xpath), sortOrder: -1};
//     } else if (!hasHyphen.test(str) && str in refSrchParams){
//         return { targetPath: pathBuilder(refSrchParams[str].xpath), sortOrder: 1};
//     } else {
//       throw (unknownParameterError('_sort', str, Object.keys(refSrchParams)));
//     }
//   });

//   sortOptions.map(valueOf => {
//     specifySortOrder.$sort[valueOf.targetPath] = valueOf.sortOrder;
//     existChecker[valueOf.targetPath] = { $exists: true };
//   });
//   return {specifySortOrder, existChecker, caseInsensitive};
// };

class R4ResultParamsBuilder {

  constructor(args, srchableParams){
    this.args = args;
    this.srchableParams = srchableParams;
  }

  #_countParamsBuilder(count) {
    return count > 100 ? 100 : count;
  }

  #_summaryQueryBuilder(summary, targetType){
    const r4SummaryTextValues = ['id', 'meta', 'text'];
    const r4SummaryDataValues = ['text'];
    // test for patient resource
    const r4SummaryTrueValues = [ 'identifier', 'active', 'name', 'telecom', 'gender', 'birthDate', 'address', 'managingOrganization', 'link'];

    const qB = (arr, orderNum) => { return arr.reduce((obj, data) => ({...obj, [data]: orderNum}), {}); };

    if (summary === 'count') { return 'count'; }
    if (summary === 'data' ) { return { [targetType]: qB(r4SummaryDataValues, 0) }; }
    if (summary === 'false') { return 'false'; }
    if (summary === 'text' ) { return { [targetType]: qB(r4SummaryTextValues, 1) }; }
    if (summary === 'true' ) { return { [targetType]: qB([...r4SummaryTextValues, ...r4SummaryTrueValues], 1)}; }
  }

  #_elementsQueryBuilder(elements, targetType){
      // const validValues = elements.split(/,/).filter(Boolean);
      let validValues = Array.isArray(elements) ? elements : [elements];
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

  #_includeParamsBuilder(include, srchableParams){
  //正規表現: カンマ区切りで分割  eg: Patient:organization -> match1=Patient, match2=organization
  const reg = /\w+[^:]+/g; // /\w+\s*(?:(?:;(?:\s*\w+\s*)?)+)?/
  const commaSplitter = splitter(include, ',');
  const refTypesList = srchableParams;

  const includeTarget = commaSplitter.filter(Boolean).map(elm => {
    if (elm.match(reg)[1] in refTypesList){
      return elm.match(reg).slice(1);
    } else {
      throw (unknownParameterError('_include', elm, Object.keys(refTypesList)));
    }
  });

  return includeTarget.map(queryKey => {
    const isSingle = queryKey.length === 1; //配列の数が1かどうか
    const pathBuilder = (dataName) => dataName?.xpath?.split('.').slice(1).join('.'); // Eg: Patient.link.other => link.other

    return isSingle ?
      { 'targetPath': pathBuilder(refTypesList[queryKey]), 'targetCollection': capitalizeInitial(queryKey[0]) } :
      { 'targetPath': pathBuilder(refTypesList[queryKey[0]]), 'targetCollection': capitalizeInitial(queryKey[1]) };
  });
  }

  #_revincludeParamsBuilder(revinclude){
    const reg = /\w+[^:]+/g; ///\w+\s*(?:(?:;(?:\s*\w+\s*)?)+)?/
    const commaSplitter = revinclude.split(',');
    const revincludeTarget = commaSplitter.filter(Boolean).map(elm => { return elm.match(reg); });

    return revincludeTarget.map(item => {
      return { 'targetPath': item[1], 'targetCollection': item[0] };
    });
  }

  bundle(){
    const defaultRecordCount = 10;
    let { _count, _elements, _include, _revinclude, _summary } = this.args;
    let query = {
      _count: defaultRecordCount,
      _filter: undefined, // _elements or _summary
      _include: undefined,
      _revinclude: undefined
    };

    if (_elements && _summary) { throw (cannotCombineParameterError(['_elements', '_summary'])); }

    const commaSplitter = splitter(_summary, ',');
    if (commaSplitter?.length >= 2 && commaSplitter?.includes('text')){
      throw (cannotCombineParameterError('_summary=text with other values for _summary'));
    }

    if (_count) { query._count = this.#_countParamsBuilder(_count); }
    if (_summary) { query._filter = this.#_summaryQueryBuilder(_summary, 'fields'); }
    if (_elements) { query._filter = this.#_elementsQueryBuilder(_elements, 'fields'); }
    if (_include) { query._include = this.#_includeParamsBuilder(_include, this.srchableParams); }
    if (_revinclude) { query._revinclude = this.#_revincludeParamsBuilder(_revinclude); }

    return query;
  }
}

module.exports = {
  R4ResultParamsBuilder,
};