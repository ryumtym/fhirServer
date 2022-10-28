/**
 * @name capitalizeInitial
 * @description 最初の一文字目を大文字にする
 * @param {string} sentence 大文字にしたい文字列
*/
const capitalizeInitial = (sentence) => {
	if (typeof sentence !== 'string' || !sentence) return sentence;
	return sentence.charAt(0).toUpperCase() + sentence.slice(1).toLowerCase();
}

module.exports = {
    capitalizeInitial
}