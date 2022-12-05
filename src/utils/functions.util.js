/**
 * @name capitalizeInitial
 * @description 最初の一文字目を大文字にする
 * @param {string} sentence 大文字にしたい文字列
*/
const capitalizeInitial = (sentence) => {
	if (typeof sentence !== 'string' || !sentence) { return sentence; }
	return sentence.charAt(0).toUpperCase() + sentence.slice(1).toLowerCase();
};

/**
 * @name splitter
 * @description splitに失敗した際nullを返す
 * @param {string} str 渡す文字列
 * @param {string} delimited 区切りたい文字
*/
const splitter = (str, delimited) => {
	try {
		return str.split(delimited);
	} catch {
		return null;
	}
  };

// return bundleBuilder(getUuid(orgDatas+req.req.url) , moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'), req.req.url, orgDatas)
const bundleBuilder = (id, currentTime, selfUrl, datas) =>{
	return {
		'resourceType': 'Bundle',
		'id': id,
		'meta': {
			'lastUpdated': currentTime
		},
		'type': 'searchset',
		'link': [
			{
				'relation': 'self',
				'url': selfUrl
			}
		],
		'entry': datas
	};
};

// const url = `${req.req.protocol}://${req.req.headers.host}${req.req._parsedUrl.pathname}`
// bundleEntryBuilder(`${url}/${item.id}`, new Patient(item), 'match');
const bundleEntryBuilder = (url, resource, srchType) => {
	return {
		fullUrl: url,
		resouces: resource,
		search: {
			mode: srchType
		}
	};
};

module.exports = {
    capitalizeInitial,
	bundleBuilder,
	bundleEntryBuilder,
	splitter
};