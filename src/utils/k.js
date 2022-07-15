let dateQueryBuilder = function (date, type, path) {
    let regex = /^(\D{2})?(\d{4})(-\d{2})?(-\d{2})?(?:(T\d{2}:\d{2})(:\d{2})?)?(Z|(\+|-)(\d{2}):(\d{2}))?$/;
    let match
    let splitDate = date.split(',')
    let str = '';
    let toRet = [];
    let pArr = []; //will have other possibilities such as just year, just year and month, etc
    let prefix = '$eq';
  
    if(splitDate.length >= 1){
      splitDate.forEach(elm => {
        match = elm.match(regex)
                console.log("match:" + match,  "type:" + type, "path:" + path)
                if (match && match.length >= 1) {
                  if (match[1]) {
                    // replace prefix with mongo specific comparators
                    prefix = '$' + match[1].replace('ge', 'gte').replace('le', 'lte');
                  }
                  console.log("match[1]:" + match[1])        
                  if (type === 'date') {
                    //if its just a date, we don't have to worry about time components
                    if (prefix === '$eq') {
                        //add parts of date that are available
                        for (let i = 2; i < 5; i++) {
                          //add up the date parts in a string
                          if (match[i]) {
                            str = str + match[i];
                            pArr[i - 2] = str + '$';
                          }
                        }
                        return {
                          $regex: new RegExp(
                            '^' + '(?:' + str + ')|(?:' + pArr[0] + ')|(?:' + pArr[1] + ')|(?:' + pArr[2] + ')',
                            'i'
                          ),
                        };
                    } else {
                        for (let i = 2; i < 10; i++) {
                            if (match[`${i}`]) {
                                str = str + match[`${i}`];
                                const moment_dt = moment.utc(str);// convert to format that mongo uses to store
                                const datetime_utc = moment_dt.utc().format('YYYY-MM-DDTHH:mm:ssZ');
                                return {
                                    [prefix]: datetime_utc
                                };
                            }
                        }
                    }
                  }
                }
      }
  
      )
    }
  
    
  
  }