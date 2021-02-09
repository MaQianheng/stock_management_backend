const express = require('express');
const {dbQueryOptions} = require("../functions/db_func");
const router = express.Router();

// filter:过滤数据
let filter = {password: 0, __v: 0};
const {UserModel} = require('../db/db_models');
const {validate, validateRequiredQueryParameters} = require('../functions/validate')

const {dbAddUnique} = require('../functions/db_func')

/**
 * err_code:
 *  0: no error
 *  1: server error
 *  2: user error
 */

router.post('/query', async (req, res) => {
    const {userId} = req.body
    let validationRes = await validate(userId)
    switch (validationRes.err_code) {
        case 0:
            return res.status(200).json({
                err_code: 0,
                user: validationRes.user
            })
        default:
            return res.status(200).json({
                err_code: validationRes.err_code,
                message: validationRes.message
            })
    }
})

router.get('/fuzzy_query_operator_name', (req, res) => {
    let objParameters = {}
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            name: {
                type: 'String',
                isRequired: true,
                str: '管理员名称'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    UserModel.find({name: {$regex: eval(`/${objParameters.name}/`)}},'_id name', {}, (err, data) => {
        if (err) {
            console.log(err)
            return res.status(500).json({
                err_code: 1,
                data: []
            })
        }
        return res.status(200).json({
            err_code: 0,
            data
        })
    }).limit(5)
    // clubName: `/${clubName}/`
})

router.get('/query_user_options', (req, res) => {
    dbQueryOptions(req, res, UserModel, {}, "name")
})

router.post('/register', function (req, res, next) {
    let {username, password, name, level, isValid} = validateRequiredQueryParameters(req, res, {username: 'String', password: 'String', name: 'String', level: 'Number'}, false)
    if (isValid) dbAddUnique(req, res, UserModel, {'username': username, 'name': name}, {username, password, name, level})
})

router.post('/login', function (req, res, next) {
    const {username, password, isValid} = validateRequiredQueryParameters(req, res, {username: 'String', password: 'String'}, false)
    if (isValid) {
        UserModel.findOne({username: username, password: password}, filter, (err, user) => {
            if (err) {
                return res.status(500).json({
                    err_code: 1,
                    message: err.message
                })
            }
            if (!user) {
                return res.status(200).json({
                    err_code: 2,
                    message: '用户名或密码错误'
                })
            }
            // res.cookie('userid',user._id,{maxAge:1000*60*60*24})
            return res.status(200).json({
                err_code: 0,
                user
            })
        })
    }
})

module.exports = router;
