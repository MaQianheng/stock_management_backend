exports.objectToString = (obj) => {
    let keys = Object.keys(obj)
    let str = ""
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i]
        let tmp = `${key}: ${obj[key]},`
        str += tmp
    }
    return str.substr(0, str.length - 1)
}

exports.funcCurrentPage = (req, isGet = true) => {
    let dataSource = isGet ? req.query : req.body
    const {currentPageCount} = dataSource
    let intCurrentPageCount
    try {
        if (!currentPageCount) {
            intCurrentPageCount = 1
        } else {
            intCurrentPageCount = parseInt(currentPageCount)
        }
    } catch (err) {
        intCurrentPageCount = 1
    }
    return intCurrentPageCount
}

exports.funcConvertFormat = (data, directive) => {
    switch (directive) {
        case 'Number': {
            try {
                data = parseInt(data)
            } catch (err) {
                throw {message: err}
            }
            break
        }
        case 'String': {
            try {
                data = String(data)
            } catch (err) {
                throw {message: err}
            }
            break
        }
        case 'StringArray': {
            try {
                data = data.split(',').map(String)
            } catch (err) {
                throw {message: err}
            }
            break
        }
        case 'NumberArray': {
            try {
                data = data.split(',').map(Number)
            } catch (err) {
                throw {message: err}
            }
            break
        }
        case 'Object': {
            try {
                data = JSON.parse(data)
            } catch (err) {
                throw {message: err}
            }
            break
        }
        default: {
            break
        }
    }
    return data
}

function add0(m) {
    return m < 10 ? '0' + m : m
}

exports.fromTimeStampToString = (timeStamp) => {
    let time = new Date(timeStamp)
    let y = time.getFullYear();
    let m = time.getMonth() + 1;
    let d = time.getDate();
    let h = time.getHours();
    let mm = time.getMinutes();
    let s = time.getSeconds();
    return `${y}-${add0(m)}-${add0(d)} ${add0(h)}:${add0(mm)}:${add0(s)}`
}
