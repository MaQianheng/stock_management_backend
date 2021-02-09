const express = require('express');
const router = express.Router();
const mongoose = require('mongoose')
const {ProductModel} = require("../db/db_models");
const {undefinedColorId} = require("../db/db_models");

const {ColorModel} = require('../db/db_models')
const {validateRequiredQueryParameters} = require('../functions/validate')

const {dbQueryList, dbAddUnique, dbUpdateUniqueById, dbQueryOptions} = require('../functions/db_func')

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
                isRequired: false,
                str: '颜色id'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    dbQueryList(req, res, ColorModel, 10, objFilter)
})

router.get('/query_color_options', (req, res) => {
    dbQueryOptions(req, res, ColorModel, {}, "color")
})

router.get('/add', async (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            color: {
                type: 'String',
                isRequired: true,
                str: '颜色'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    await dbAddUnique(req, res, ColorModel, {'color': objFilter.color}, {color: objFilter.color})
})

router.get('/update', (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'String',
                isRequired: true,
                str: '颜色id'
            },
            color: {
                type: 'String',
                isRequired: true,
                str: '颜色'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    dbUpdateUniqueById(req, res, ColorModel, objFilter._id, {'color': objFilter.color}, {color: objFilter.color})
})

router.get('/delete', async (req, res) => {
    let objParameters = {}
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'StringArray',
                isRequired: true,
                str: '颜色id'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    if (objParameters._id.indexOf(String(undefinedColorId)) !== -1) {
        return res.status(500).json({
            err_code: 2,
            message: '该数据不可被操作'
        })
    }
    const session = await ColorModel.startSession()
    await session.withTransaction(async () => {
        // update productSub color to undefined
        await ProductModel.updateMany({colorRef: {$in: objParameters._id}}, {$set: {colorRef: undefinedColorId}}, {session})
        // delete
        const deleteRes = await ColorModel.deleteMany({_id: {$in: objParameters._id}}, {session})
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
