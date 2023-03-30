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

  // constructor(args, srchableParams){
  //   this.args = args;
  //   this.srchableParams = srchableParams;
  // }

  #build_countParams(count) {
    //_countで指定された値が100以上でも最大表示数は100まで
    return (count > 100) ? 100 : Number(count);
  }

  #build_summaryQuery(summary, targetType){
    //https://build.fhir.org/search.html#_summary
    const r4TextTypeSummary = ['id', 'meta', 'text'];
    const r4DataTypeSummary = ['text'];
    // test for patient resource
    // todo: Support for other resources
    const r4TrueTypeSummary = [ 'identifier', 'active', 'name', 'telecom', 'gender', 'birthDate', 'address', 'managingOrganization', 'link'];

    const queryBuilder = (queryValue, isExistNum) => { return queryValue.reduce((obj, data) => ({...obj, [data]: isExistNum}), {}); };

    if (summary === 'count') { return 'count'; } // ?_summary=count -> データ数返却
    if (summary === 'data' ) { return { [targetType]: queryBuilder(r4DataTypeSummary, 0) }; } // ?_summary=data -> text要素を省いたデータを返却
    if (summary === 'false') { return 'false'; } // ?_summary=data -> データ全て返却
    if (summary === 'text' ) { return { [targetType]: queryBuilder(r4TextTypeSummary, 1) }; } // ?_summary=text -> id, metaとその他最上位要素を返却
    if (summary === 'true' ) { return { [targetType]: queryBuilder([...r4TextTypeSummary, ...r4TrueTypeSummary], 1)}; } // ?_summary=true -> fhirでsummaryとして定義されているデータを返却
    // if (summary === 'data' ) { return queryBuilder(r4DataTypeSummary, 0); } // this will be work for mongo(v5.0.9 or latest)
    // if (summary === 'text' ) { return queryBuilder(r4TextTypeSummary, 1); } // this will be work for mongo(v5.0.9 or latest)
    // if (summary === 'true' ) { return queryBuilder([...r4TextTypeSummary, ...r4TrueTypeSummary], 1); } // this will be work for mongo(v5.0.9 or latest)
  }

  #build_elementsQuery(elements) { // ?_elements=active
      const target = elements.split(',');
      const hasHyphenInitial = /^([-])([a-zA-Z0-9.,$;]+$)/; //1文字目がハイフンかどうか正規表現で確認

      const visibleItem = target.filter(value => !hasHyphenInitial.exec(value) ); //ハイフンなし -> visibleItemに格納
      const hiddenItem = target.filter(value => hasHyphenInitial.exec(value) ); //ハイフンあり -> hiddenItemに格納

      //visibleItemとhiddenItem両方に値が入っている or visibleItemにのみ値が入っている  -> visibleItemとid,metaを基にクエリをつくる
      //hiddenItemにのみ値が入っている -> ハイフンを取り除いてhiddenItemを基にクエリをつくる
      if (visibleItem.length && hiddenItem.length || visibleItem.length && !hiddenItem.length) {

        const visibleMongoField = visibleItem.reduce((obj, elm) => ({...obj, [elm]: 1}), {'id': 1, 'meta': 1});
        return { 'fields': visibleMongoField };
        // return visibleItem.reduce((obj, elm) => ({...obj, [elm]: 1}), {'id': 1, 'meta': 1}); // this will be work for mongo(v5.0.9 or latest)

      } else if (!visibleItem.length && hiddenItem.length ) {

        // substringでハイフン(1文字目)を取り除いてクエリ作成
        const hiddenMongoField = hiddenItem.reduce((obj, elm) => ({...obj, [elm.substring(1)]: 0}), {});
        return { 'fields': hiddenMongoField };
        // return hiddenItem.reduce((obj, elm) => ({...obj, [elm.substring(1)]: 0}), {}); // this will be work for mongo(v5.0.9 or latest)

      }
  }

  #build_includeParams(include, srchableParams){
  //正規表現: カンマ区切りで分割  eg: Patient:organization -> match1=Patient, match2=organization
  const reg = /\w+[^:]+/g; // /\w+\s*(?:(?:;(?:\s*\w+\s*)?)+)?/
  const targetToArray = [].concat(include);
  const refTypesList = srchableParams;

  const includeTarget = targetToArray.filter(Boolean).map(elm => {
    if (elm.match(reg)[1] in refTypesList){
      return elm.match(reg).slice(1);
    } else {
      throw (unknownParameterError('_include', elm, Object.keys(refTypesList)));
    }
  });

  return includeTarget.map(queryKey => {
    const isSingle = queryKey.length === 1; //配列の数が1かどうか
    const pathBuilder = (dataName) => dataName?.xpath?.split('.').slice(1).join('.'); // Eg: Patient.link.other => link.other

    return isSingle
      ? { 'targetPath': pathBuilder(refTypesList[queryKey]), 'targetCollection': capitalizeInitial(queryKey[0]) }
      : { 'targetPath': pathBuilder(refTypesList[queryKey[0]]), 'targetCollection': capitalizeInitial(queryKey[1]) };
  });
  }

  #build_revincludeParams(revinclude){
    const reg = /\w+[^:]+/g; ///\w+\s*(?:(?:;(?:\s*\w+\s*)?)+)?/
    const commaSplitter = revinclude.split(',');
    const revincludeTarget = commaSplitter.filter(Boolean).map(elm => { return elm.match(reg); });

    return revincludeTarget.map(item => {
      return { 'targetPath': item[1], 'targetCollection': item[0] };
    });
  }

  bundle(args, srchableParams) {
  // bundle() {
    const defaultRecordCount = 10;
    let { _count, _elements, _include, _revinclude, _summary } = args;
    // let { _count, _elements, _include, _revinclude, _summary } = this.args
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

    if (_count) { query._count = this.#build_countParams(_count); }
    if (_summary) { query._filter = this.#build_summaryQuery(_summary, 'fields'); }
    if (_elements) { query._filter = this.#build_elementsQuery(_elements); }
    if (_include) { query._include = this.#build_includeParams(_include, srchableParams); }
    // if (_include) { query._include = this.#_includeParamsBuilder(_include, this.srchableParams); }
    if (_revinclude) { query._revinclude = this.#build_revincludeParams(_revinclude); }
    return query;
  }
}

module.exports = {
  R4ResultParamsBuilder,
};