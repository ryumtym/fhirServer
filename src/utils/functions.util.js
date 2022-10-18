const capitalizeInitial = function(sentence){
    return sentence && sentence[0].toUpperCase() + sentence.slice(1);
}

module.exports = {
    capitalizeInitial
}