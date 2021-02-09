const express = require('express');
const router = express.Router();
const mongoose = require('mongoose')
const {ShelfModel} = require("../db/db_models");
const {undefinedWarehouseId} = require("../db/db_models");

const {WarehouseModel} = require('../db/db_models')
const {validateRequiredQueryParameters} = require('../functions/validate')

const {dbQueryList, dbAddUnique, dbQueryOptions, dbUpdateUniqueById, dbDeleteById} = require('../functions/db_func')

/**
 * err_code:
 *  0: no error
 *  1: server error
 *  2: user error
 */

router.get('/query', (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'String',
                isRequired: true,
                str: 'id'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    dbQueryList(req, res, WarehouseModel, 5, objFilter)
})

router.get('/query_warehouse_options', (req, res) => {
    dbQueryOptions(req, res, WarehouseModel, {}, "warehouse")
})

router.get('/add', async (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            warehouse: {
                type: 'String',
                isRequired: true,
                str: '库房'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    await dbAddUnique(req, res, WarehouseModel, {warehouse: objFilter.warehouse}, {warehouse: objFilter.warehouse})
})

router.get('/update', (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'String',
                isRequired: true,
                str: '库房id'
            },
            warehouse: {
                type: 'String',
                isRequired: true,
                str: '库房'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    if (objFilter._id.indexOf(undefinedWarehouseId) !== -1) {
        return res.status(500).json({
            err_code: 2,
            message: '该数据不可被操作'
        })
    }
    dbUpdateUniqueById(req, res, WarehouseModel, objFilter._id, {warehouse: objFilter.warehouse}, {warehouse: objFilter.warehouse})
})

router.get('/delete', async (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'StringArray',
                isRequired: true,
                str: '库房id'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    if (objFilter._id.indexOf(String(undefinedWarehouseId)) !== -1) {
        return res.status(500).json({
            err_code: 2,
            message: '该数据不可被操作'
        })
    }

    const session = await ShelfModel.startSession()
    await session.withTransaction(async () => {
        await ShelfModel.updateMany({warehouseRef: {$in: objFilter._id}}, {warehouseRef: undefinedWarehouseId}, {session})
        const deleteRes = await WarehouseModel.deleteMany({_id: {$in: objFilter._id}}, {session})
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
