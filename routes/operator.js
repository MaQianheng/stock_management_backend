const express = require('express');
const router = express.Router();
const jst = require('jsonwebtoken');
const {dbUpdateManyById} = require("../functions/db_func");
// filter:过滤数据
const filter = {password: 0, __v: 0};

const {dbUpdateUniqueById, dbQueryOptions, dbAddUnique} = require("../functions/db_func");
const {funcCurrentPage} = require("../functions/utils");
const {filterObjValue, validateRequiredQueryParameters, authenticateJWT} = require("../functions/validate");
const {undefinedUserId, OperatorModel} = require("../db/db_models");


/**
 * err_code:
 *  0: no error
 *  1: server error
 *  2: user error
 */

router.get('/query', authenticateJWT, async (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'String',
                isRequired: false,
                str: '管理员id'
            },
            name: {
                type: 'String',
                isRequired: false,
                str: '管理员姓名'
            },
            arrLevelRange: [0, 0]
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    objFilter._id = {$ne: undefinedUserId}
    objFilter = filterObjValue(objFilter)
    let intCurrentPageCount = funcCurrentPage(req)
    OperatorModel.countDocuments(objFilter, function (err, dataCount) {
        if (err) {
            return res.status(500).json({
                err_code: 1,
                message: `读取数据失败：${err.message}`
            })
        }
        OperatorModel.find(objFilter, {__v: 0}, (err, data) => {
            if (err) {
                return res.status(500).json({
                    err_code: 1,
                    message: `读取数据失败：${err.message}`
                })
            }
            for (let i = 0; i < data.length; i++) {
                // 0: no action, 1: edited, 2: uploading
                const {level} = data[i]._doc
                let text = ''
                switch (level) {
                    case 0:
                        text = '一级管理员'
                        break
                    case 1:
                        text = '二级管理员'
                        break
                    default:
                        break
                }
                data[i]["_doc"]["level"] = {value: level, text: text}
                data[i]["_doc"]["status"] = 1
                data[i]["_doc"]["row"] = i
            }
            // level: {value: "0", text: '根级管理员'}
            return res.status(200).json({
                err_code: 0,
                message: "请求成功",
                dataCount,
                data
            })
        }).skip(((intCurrentPageCount === 0 ? 1 : intCurrentPageCount) - 1) * 10).limit(intCurrentPageCount === 0 ? 0 : 10);
    });
    // dbQueryList(req, res, OperatorModel, 10, objFilter)
    // const {userId} = req.body
    // let validationRes = await validate(userId)
    // switch (validationRes.err_code) {
    //     case 0:
    //         return res.status(200).json({
    //             err_code: 0,
    //             user: validationRes.user
    //         })
    //     default:
    //         return res.status(200).json({
    //             err_code: validationRes.err_code,
    //             message: validationRes.message
    //         })
    // }
})

router.get('/fuzzy_query_operator_name', authenticateJWT, (req, res) => {
    let objParameters = {}
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            name: {
                type: 'String',
                isRequired: true,
                str: '管理员名称'
            },
            // arrLevelRange: [0, 0]
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    OperatorModel.find({name: {$regex: eval(`/${objParameters.name}/`)}}, '_id name', {}, (err, data) => {
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

router.get('/query_operator_options', authenticateJWT, (req, res) => {
    dbQueryOptions(req, res, OperatorModel, {}, "name")
})

router.post('/add', authenticateJWT, async (req, res, next) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            username: {
                type: 'String',
                isRequired: true,
                str: '用户名'
            },
            password: {
                type: 'String',
                isRequired: true,
                str: '密码'
            },
            name: {
                type: 'String',
                isRequired: true,
                str: '姓名'
            },
            level: {
                type: 'Number',
                isRequired: true,
                str: '等级'
            },
            arrLevelRange: [0, 0]
        }, false)
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    await dbAddUnique(req, res, OperatorModel, {username: objFilter.username}, objFilter)
})

router.post('/update', authenticateJWT, async (req, res, next) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'String',
                isRequired: true,
                str: '用户名id'
            },
            username: {
                type: 'String',
                isRequired: true,
                str: '用户名'
            },
            password: {
                type: 'String',
                isRequired: true,
                str: '密码'
            },
            name: {
                type: 'String',
                isRequired: true,
                str: '姓名'
            },
            level: {
                type: '',
                isRequired: true,
                str: '等级'
            },
            arrLevelRange: [0, 0]
        }, false)
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    // if (objFilter._id.indexOf(undefinedUserId) !== -1) {
    //     return res.status(500).json({
    //         err_code: 2,
    //         message: '该数据不可被操作'
    //     })
    // }
    objFilter.level = objFilter.level.value
    dbUpdateUniqueById(req, res, OperatorModel, objFilter._id, {username: objFilter.username}, objFilter)
})

router.post('/login', function (req, res, next) {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            username: {
                type: 'String',
                isRequired: true,
                str: '用户名'
            },
            password: {
                type: 'String',
                isRequired: true,
                str: '密码'
            }
        }, false)
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    OperatorModel.findOne(objFilter, filter, (err, user) => {
        if (err) {
            return res.status(500).json({
                err_code: 1,
                message: err.message
            })
        }
        if (!user || user._id === undefinedUserId) {
            return res.status(412).json({
                err_code: 2,
                message: '用户名或密码错误'
            })
        }
        if (user.isDeleted === true) {
            return res.status(403).json({
                err_code: 2,
                message: '该账户已被删除'
            })
        }
        const token = jst.sign({_id: user._id,username: objFilter.username}, 'qianhengma')
        // try {
        //     jst.verify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluMSIsImlhdCI6MTYxMjg2MjQ0OH0._b0UCkA7V8ZDIcfoRkhzd9_T_lw-35ppKvJFf26Y67A', 'qianhengma')
        // } catch (err) {
        //     console.log(err.message)
        // }
        //
        // http://192.168.1.244:3000/sale/query_history?action=&startedTimeStamp=1609459200000&endedTimeStamp=1613007763765&productCode=&productName=&colorRef=&warehouseRef=&shelfRef=&operatorRef=60224ab95d935cbe5b33ff63&driverRef=&currentPageCount=1
        // res.cookie('userid',user._id,{maxAge:1000*60*60*24})
        return res.status(200).json({
            err_code: 0,
            token,
            username: user.username,
            name: user.name,
            level: user.level,
            message: '登陆成功'
        })
    })
})

router.get('/update_delete_marker', authenticateJWT, async (req, res) => {
    let objParameters = {}
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'StringArray',
                isRequired: true,
                str: '管理员id'
            },
            // 0: false, 1: true
            action: {
                type: 'Number',
                isRequired: true,
                str: '操作'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    await dbUpdateManyById(req, res, OperatorModel, objParameters, {$set: {isDeleted: objParameters.action !== 1}})
})

module.exports = router;
