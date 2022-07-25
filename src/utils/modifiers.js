const modifiersChecker = function (target) {
  const reg = new RegExp(/([^"]*)(:)([^"]*)/)
  const keyObj = Object.keys(target);
  const keyArr = Object.entries(keyObj)

  let newArr = {}
  let query 
  let modif

  for(let i=0; i<keyArr.length; i++){
    if(reg.test(keyArr[i]) == true){
      query = keyArr[i][1].split(':')[0]
      modif = keyArr[i][1].split(':')[1]
      newArr[query]=modif
    }
  }
  return newArr
}

const modifCheck = function(target){
  const reg = new RegExp(/([^"]*)(:[^"]*)/)  // ([^"]*)(:[^"]*)(=)([^"]*)
  regCheck = reg.exec(target)
  return regCheck
}

const tokenModifiers = ['', ':not', ':text', ':above', ':below', ':in', ':not-in', ':of-type'];


module.exports = {
  modifiersChecker,
  tokenModifiers,
  modifCheck
}