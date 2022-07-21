let modifChecker = function (target) {
  const reg = new RegExp(/([^"]*)(:)([^"]*)/)
  const keyObj = Object.keys(target);
  const a = Object.entries(keyObj)

  const arr = []

  for(let i=0; i<a.length; i++){
    if(reg.test(a[i]) == true){
      arr.push(a[i][1].split(':'))
    }
  }
  return arr
}

module.exports = {
  modifChecker
}