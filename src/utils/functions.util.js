/**
 * @name capitalizeInitial
 * @description 最初の一文字目を大文字にする
 * @param {string} sentence 大文字にしたい文字列
*/
const capitalizeInitial = (sentence) => {
    return sentence && sentence[0].toUpperCase() + sentence.slice(1);
}

module.exports = {
    capitalizeInitial
}