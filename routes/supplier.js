const express = require('express')
const router = express.Router()
const {SaleModel, undefinedSupplierId, SupplierModel} = require("../db/db_models")
const {validateRequiredQueryParameters, authenticateJWT} = require('../functions/validate')
const {dbQueryList, dbAddUnique, dbUpdateUniqueById, dbQueryOptions} = require('../functions/db_func')

/**
 * err_code:
 *  0: no error
 *  1: server error
 *  2: user error
 */

router.get('/query', authenticateJWT, (req, res) => {
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
    dbQueryList(req, res, SupplierModel, 12, {_id: {$ne: undefinedSupplierId}})
})

router.get('/query_supplier_options', authenticateJWT, (req, res) => {
    dbQueryOptions(req, res, SupplierModel, {}, "supplierName")
})

router.get('/fuzzy_query_supplier_name', authenticateJWT, (req, res) => {
    let objParameters = {}
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            supplierName: {
                type: 'String',
                isRequired: true,
                str: '供应商名称'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    SupplierModel.find({supplierName: {$regex: eval(`/${objParameters.supplierName}/`)}}, '_id name supplierName', {}, (err, data) => {
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

router.get('/add', authenticateJWT, async (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            supplierName: {
                type: 'String',
                isRequired: true,
                str: '供应商名称'
            },
            name: {
                type: 'String',
                isRequired: true,
                str: '供应商联系人'
            },
            phone: {
                type: 'String',
                isRequired: false,
                str: '电话'
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
    await dbAddUnique(req, res, SupplierModel, {supplierName: objFilter.supplierName}, objFilter)
})

router.get('/update', authenticateJWT, (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'String',
                isRequired: true,
                str: '供应商id'
            },
            supplierName: {
                type: 'String',
                isRequired: false,
                str: '供应商名称'
            },
            name: {
                type: 'String',
                isRequired: false,
                str: '供应商联系人'
            },
            phone: {
                type: 'String',
                isRequired: false,
                str: '电话'
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
    dbUpdateUniqueById(req, res, SupplierModel, objFilter._id, {supplierName: objFilter.supplierName}, objFilter)
})

router.get('/delete', authenticateJWT, async (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'StringArray',
                isRequired: true,
                str: '供应商id'
            },
            arrLevelRange: [0, 0]
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    if (objFilter._id.indexOf(String(undefinedSupplierId)) !== -1) {
        return res.status(500).json({
            err_code: 2,
            message: '该数据不可被操作'
        })
    }
    const session = await SupplierModel.startSession()
    await session.withTransaction(async () => {
        await SaleModel.updateMany({supplierRef: {$in: objFilter._id}}, {supplierRef: undefinedSupplierId}, {session})
        const deleteRes = await SupplierModel.deleteMany({_id: {$in: objFilter._id}}, {session})
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
