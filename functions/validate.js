const mongoose = require('mongoose')
const {funcConvertFormat} = require("./utils");
const {UserModel} = require('../db/db_models')
// const jwt = require('express-jwt')
const jwt = require('jsonwebtoken')
let filter = {password: 0, __v: 0}

function isId(key) {
    if (key === '_id') return true
    return key.substring(key.length - 3) === 'Ref';
}

function validateObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id)
}

exports.authenticateJWT = (req, res, next) => {
    const token = req.headers.authorization;
    if (token) {
        jwt.verify(token, 'qianhengma', (err, tokenResult) => {
            if (err) {
                return res.status(403).json({message: '无效的token'});
            }
            console.log(tokenResult)
            UserModel.findOne({_id: tokenResult._id}, {}, {}, (err, user) => {
                if (err) {
                    return res.status(403).json({message: '用户查找失败'});
                }
                if (!user) {
                    return res.status(401).json({message: '无效的用户'})
                }
                req.userLevel = user.level;
                next();
            })
        });
    } else {
        return res.status(401).json({message: '请验证身份'});
    }
};

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
    if (!('arrLevelRange' in objParameters)) {
        objParameters.arrLevelRange = [0, 3]
    }
    let keys = Object.keys(objParameters)
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i]
        let objValue = objParameters[key]
        if (key === 'arrLevelRange') {
            const {userLevel} = req
            if (userLevel < objValue[0] || userLevel > objValue[1]) throw `无权访问此页面`
            continue
        }
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
