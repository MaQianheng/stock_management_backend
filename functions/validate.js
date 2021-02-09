const mongoose = require('mongoose')
const {funcConvertFormat} = require("./utils");
const {UserModel} = require('../db/db_models')
let filter = {password: 0, __v: 0}

function isId(key) {
    if (key === '_id') return true
    return key.substring(key.length - 3) === 'Ref';
}

function validateObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id)
}

exports.validate = async (userId) => {
    let user
    try {
        user = await UserModel.findById(userId, '_id username').exec();
    } catch (e) {
        return {err_code: 1, message: e.message}
    }
    if (user) {
        return {err_code: 0, user}
    }
    return {err_code: 2, message: 'User does not existed'}
}

// remove defined KV
exports.filterObjValue = (obj) => {
    let resObj = {}
    let keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i]
        if (obj[key] === undefined) continue
        resObj[key] = obj[key]
    }
    return resObj
}

exports.validateRequiredQueryParameters = (req, res, objParameters, isGet = true) => {
    const objResult = {}
    const dataSource = isGet ? req.query : req.body
    let keys = Object.keys(objParameters)
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i]
        let objValue = objParameters[key]
        let value = dataSource[key]
        if ((objValue.isRequired === true) && (!value)) throw `缺少必要参数：${objValue.str}`
        if ((objValue.isRequired === false) && (!value)) continue
        if (isId(key)) {
            if (value === "0" || !value) continue
            if (!validateObjectId(value) && value.indexOf(',') === -1) throw `非有效id：${objValue.str}`
        }

        try {
            value = funcConvertFormat(value, objValue.type)
        } catch (err) {
            throw `转型失败：${err}`
        }
        objResult[key] = value
    }
    return objResult
}
