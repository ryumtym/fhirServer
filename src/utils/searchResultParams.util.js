// _elements,_sortに関してはqueryを作成
// _include,_revincludeは他のリソースを読み取るためのパラメーターを配列として返却
// _countはクエリ作成が必要ないためそのまま使用

//https://www.hl7.org/fhir/search.html#elements
//https://www.mongodb.com/community/forums/t/projection-does-not-allow-exclusion-inclusion-together/31756
//https://chaika.hatenablog.com/entry/2019/05/07/083000
const _elementsQueryBuilder = (target) => {
  const validValues = target.split(',').filter((elm) => elm !== undefined);


  //1文字目がハイフンでないならvisibleElm 1文字目がハイフンならhiddenElm
  const hasHyphen = /^([-])([a-zA-Z0-9.,$;]+$)/
  const visibleElm  = validValues.filter(value => !hasHyphen.exec(value) );
  const hiddenElm   = validValues.filter(value =>  hasHyphen.exec(value) );

  //もし配列両方に値が入ってたら or もしvisibleElm配列にのみ値が入ってたら  -> visibleElmのみでクエリをつくる
  //もしhiddenElmにのみ値が入っていたなら -> ハイフンを取り除いてhiddenElmのみでクエリをつくる
  if(visibleElm.length && hiddenElm.length  || visibleElm.length  && !hiddenElm.length){ 
    return  { fields: visibleElm.reduce((obj, elm) => ({...obj, [elm]: 1}), {"id":1, "meta":1}) } 
  } else if (!visibleElm.length  && hiddenElm.length ){  
    return  { fields: hiddenElm.reduce((obj, elm) => ({...obj, [elm.substr(1)]: 0}), {"id":1, "meta":1}) }
  }
};

const _includeParamsBuilder = (target) => {
  //正規表現: カンマ区切りで分割  eg: Patient:organization -> match1=Patient, match2=organization
  const reg = /\w+[^:]+/g  ///\w+\s*(?:(?:;(?:\s*\w+\s*)?)+)?/
  const commaSplitter = target.split(',')
  return commaSplitter.map(elm => { return elm.match(reg).slice(1) })
}

const _revincludeParamsBuilder = (target) => {
  const reg = /\w+[^:]+/g  ///\w+\s*(?:(?:;(?:\s*\w+\s*)?)+)?/
  const commaSplitter = target.split(',')
  return commaSplitter.map(elm => { return elm.match(reg) })
}

const _sortQueryBuilder = (target, srchParams) =>{
  const hasHyphen = /^([-])([a-zA-Z0-9.,$;-]+$)/
  const specifySortOrder =  { $sort: {} };
  const existChecker = {};
  const caseInsensitive = { collation: { locale: "en", strength: 2 } };

  const commaSeparateArr = target.split(',');
  const refSrchParams = srchParams.reduce((obj, data) => ({...obj, [data.name]: data}), {});
  const sortOptions = commaSeparateArr.map(str => {
    const pathBuilder = (path) => path?.split(".").slice(1).join('.');

    if(hasHyphen.test(str) && str.substr(1) in refSrchParams){
        return { targetPath: pathBuilder(refSrchParams[str.substr(1)].xpath), sortOrder: -1}
    } else if(!hasHyphen.test(str) && str in refSrchParams){
        return { targetPath: pathBuilder(refSrchParams[str].xpath), sortOrder: 1}
    } else {
        throw (new Error(`Unknown _sort parameter value [${str}]. Valid values for this search are: [${Object.keys(refSrchParams)}]`));
    }
  })

  sortOptions.map(valueOf => {      
    specifySortOrder.$sort[valueOf.targetPath] = valueOf.sortOrder;
    existChecker[valueOf.targetPath] = { $exists: true };
  })
  
  return {specifySortOrder, existChecker, caseInsensitive}
}

module.exports = {
  _elementsQueryBuilder,
  _includeParamsBuilder,
  _revincludeParamsBuilder,
  _sortQueryBuilder
};
