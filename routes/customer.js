const express = require('express')
const router = express.Router()
const {undefinedCustomerId, SaleModel, CustomerModel} = require('../db/db_models')
const {validateRequiredQueryParameters, authenticateJWT} = require('../functions/validate')
const {dbQueryList, dbAddUnique, dbUpdateUniqueById, dbQueryOptions} = require('../functions/db_func')

/**
 * err_code:
 *  0: no error
 *  1: server error
 *  2: user error
 */

router.get('/query', authenticateJWT,  async (req, res) => {
    try {
        validateRequiredQueryParameters(req, res, {
            arrLevelRange: [0, 0]
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    dbQueryList(req, res, CustomerModel, 12, {_id: {$ne: undefinedCustomerId}})
})

router.get('/add', authenticateJWT,  async (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            name: {
                type: 'String',
                isRequired: true,
                str: '客户名称'
            },
            remark: {
                type: 'String',
                isRequired: false,
                str: '备注'
            },
            arrLevelRange: [0, 0]
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    await dbAddUnique(req, res, CustomerModel, {name: objFilter.name}, objFilter)
})

router.get('/query_customer_options', authenticateJWT,  (req, res) => {
    dbQueryOptions(req, res, CustomerModel, {}, "name")
})

router.get('/fuzzy_query_customer_name', authenticateJWT,  (req, res) => {
    let objParameters = {}
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            name: {
                type: 'String',
                isRequired: true,
                str: '客户名称'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    CustomerModel.find({name: {$regex: eval(`/${objParameters.name}/`)}},'_id name', {}, (err, data) => {
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
})

router.get('/update', authenticateJWT,  async (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'String',
                isRequired: true,
                str: '客户id'
            },
            name: {
                type: 'String',
                isRequired: false,
                str: '客户名称'
            },
            remark: {
                type: 'String',
                isRequired: false,
                str: '备注'
            },
            arrLevelRange: [0, 0]
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    // if (objFilter._id.indexOf(String(undefinedCustomerId)) !== -1) {
    //     return res.status(500).json({
    //         err_code: 2,
    //         message: '该数据不可被操作'
    //     })
    // }
    dbUpdateUniqueById(req, res, CustomerModel, objFilter._id, {name: objFilter.name}, objFilter)
})

router.get('/delete', authenticateJWT,  async (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'StringArray',
                isRequired: true,
                str: '客户id'
            },
            arrLevelRange: [0, 0]
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    if (objFilter._id.indexOf(String(undefinedCustomerId)) !== -1) {
        return res.status(500).json({
            err_code: 2,
            message: '该数据不可被操作'
        })
    }
    const session = await CustomerModel.startSession()
    await session.withTransaction(async () => {
        await SaleModel.updateMany({customerRef: {$in: objFilter._id}}, {customerRef: undefinedCustomerId}, {session})
        const deleteRes = await CustomerModel.deleteMany({_id: {$in: objFilter._id}}, {session})
        return res.status(200).json({
            err_code: 0,
            message: `成功删除${deleteRes.deletedCount}条数据。`
        })
    }).catch((err) => {
        return res.status(500).json({
            err_code: 1,
            message: `删除失败：${err.message}`
        })
    })
})

module.exports = router
