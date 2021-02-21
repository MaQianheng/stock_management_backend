const express = require('express');
const router = express.Router();
const jst = require('jsonwebtoken');
const {authenticateJWT} = require("../functions/validate");
// filter:过滤数据
const filter = {password: 0, __v: 0};

const {dbUpdateUniqueById, dbQueryOptions, dbAddUnique} = require("../functions/db_func");
const {funcCurrentPage} = require("../functions/utils");
const {filterObjValue, validateRequiredQueryParameters} = require("../functions/validate");
const {undefinedUserId, UserModel} = require("../db/db_models");


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
    UserModel.countDocuments(objFilter, function (err, dataCount) {
        if (err) {
            return res.status(500).json({
                err_code: 1,
                message: `读取数据失败：${err.message}`
            })
        }
        UserModel.find(objFilter, {__v: 0}, (err, data) => {
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
    // dbQueryList(req, res, UserModel, 10, objFilter)
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
    UserModel.find({name: {$regex: eval(`/${objParameters.name}/`)}}, '_id name', {}, (err, data) => {
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

// router.get('/query_user_options', authenticateJWT, (req, res) => {
//     dbQueryOptions(req, res, UserModel, {}, "name")
// })

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
    await dbAddUnique(req, res, UserModel, {username: objFilter.username}, objFilter)
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
    dbUpdateUniqueById(req, res, UserModel, objFilter._id, {username: objFilter.username}, objFilter)
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
    UserModel.findOne(objFilter, filter, (err, user) => {
        if (err) {
            return res.status(500).json({
                err_code: 1,
                message: err.message
            })
        }
        if (!user || user._id === undefinedUserId) {
            return res.status(500).json({
                err_code: 2,
                message: '用户名或密码错误'
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

module.exports = router;
