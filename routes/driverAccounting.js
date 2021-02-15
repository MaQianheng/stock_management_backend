const express = require('express');
const {authenticateJWT} = require("../functions/validate");
const {dbAdd} = require("../functions/db_func");
const router = express.Router();

const {DriverModel, DriverAccountingModel} = require('../db/db_models')
const {validateRequiredQueryParameters} = require('../functions/validate')

const {dbQueryList} = require('../functions/db_func')

/**
 * err_code:
 *  0: no error
 *  1: server error
 *  2: user error
 */

router.get('/query', authenticateJWT, (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            // startTimeStamp: {
            //     type: 'Number',
            //     isRequired: false,
            //     str: '起始日期'
            // },
            // endTimeStamp: {
            //     type: 'Number',
            //     isRequired: false,
            //     str: '结束日期'
            // },
            driverRef: {
                type: 'String',
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
    dbQueryList(req, res, DriverAccountingModel, 10, objFilter, [{
        path: 'driverRef',
        model: 'driver',
        select: {
            _id: 1,
            name: 1
        }
    }])
})

// 给司机还款
router.get('/repayment', authenticateJWT, async (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            driverRef: {
                type: 'String',
                isRequired: true,
                str: '司机id'
            },
            action: {
                type: 'Number',
                isRequired: true,
                str: '操作类型'
            },
            price: {
                type: 'Number',
                isRequired: true,
                str: '价格'
            },
            arrLevelRange: [0, 0]
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    // 0: +, 1: -
    if (objFilter.action !== 1) {
        return res.status(500).json({
            err_code: 1,
            message: `操作不匹配`
        })
    }
    DriverModel.findOneAndUpdate({_id: objFilter.driverRef}, {$inc: {relatedShelfCount: - + objFilter.price}}, {}, (err, data) => {
        if (err) {
            return res.status(500).json({
                err_code: 1,
                message: `添加失败：${err.message}`
            })
        }
        dbAdd(req, res, DriverAccountingModel, objFilter)
    })
})

module.exports = router;
