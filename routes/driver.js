const express = require('express');
const {authenticateJWT} = require("../functions/validate");
const router = express.Router();
const {undefinedDriverId} = require("../db/db_models");

const {DriverModel, DriverAccountingModel, SaleModel} = require('../db/db_models')
const {validateRequiredQueryParameters} = require('../functions/validate')

const {dbQueryList, dbAddUnique, dbUpdateUniqueById, dbQueryOptions} = require('../functions/db_func')

/**
 * err_code:
 *  0: no error
 *  1: server error
 *  2: user error
 */

router.get('/query', authenticateJWT,  (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'String',
                isRequired: false,
                str: '司机id'
            },
            name: {
                type: 'String',
                isRequired: false,
                str: '司机名称'
            },
            phone: {
                type: 'Number',
                isRequired: false,
                str: '电话'
            },
            plate: {
                type: 'String',
                isRequired: false,
                str: '车牌'
            },
            arrLevelRange: [0, 0]
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    objFilter._id = {$ne: undefinedDriverId}
    dbQueryList(req, res, DriverModel, 10, objFilter)
})

// router.get('/query_driver_options', authenticateJWT,  (req, res) => {
//     dbQueryOptions(req, res, DriverModel, {}, "name")
// })

router.get('/fuzzy_query_driver_name', authenticateJWT,  (req, res) => {
    let objParameters = {}
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            name: {
                type: 'String',
                isRequired: true,
                str: '司机名称'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    DriverModel.find({name: {$regex: eval(`/${objParameters.name}/`)}}, '_id name', {}, (err, data) => {
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

router.get('/add', authenticateJWT,  async (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            name: {
                type: 'String',
                isRequired: true,
                str: '司机名称'
            },
            phone: {
                type: 'Number',
                isRequired: true,
                str: '电话'
            },
            plate: {
                type: 'String',
                isRequired: true,
                str: '车牌'
            },
            arrLevelRange: [0, 0]
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    await dbAddUnique(req, res, DriverModel, {plate: objFilter.plate}, objFilter)
})

router.get('/update', authenticateJWT,  (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'String',
                isRequired: true,
                str: '司机id'
            },
            name: {
                type: 'String',
                isRequired: false,
                str: '司机名称'
            },
            phone: {
                type: 'Number',
                isRequired: false,
                str: '电话'
            },
            plate: {
                type: 'String',
                isRequired: false,
                str: '车牌'
            },
            arrLevelRange: [0, 0]
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    if (objFilter._id.indexOf(undefinedDriverId) !== -1) {
        return res.status(500).json({
            err_code: 2,
            message: '该数据不可被操作'
        })
    }
    dbUpdateUniqueById(req, res, DriverModel, objFilter._id, {plate: objFilter.plate}, objFilter)
})

router.get('/delete', authenticateJWT,  async (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'StringArray',
                isRequired: true,
                str: '司机id'
            },
            arrLevelRange: [0, 0]
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    if (objFilter._id.indexOf(String(undefinedDriverId)) !== -1) {
        return res.status(500).json({
            err_code: 2,
            message: '该数据不可被操作'
        })
    }
    const session = await DriverModel.startSession()
    await session.withTransaction(async () => {
        await SaleModel.updateMany({driverRef: {$in: objFilter._id}}, {$set: {driverRef: undefinedDriverId}}, {session})
        await DriverAccountingModel.updateMany({driverRef: {$in: objFilter._id}}, {$set: {driverRef: undefinedDriverId}}, {session})
        const deleteRes = await DriverModel.deleteMany({_id: {$in: objFilter._id}}, {session})
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

module.exports = router;
