const express = require('express');
const {ProductSubModel} = require("../db/db_models");
const {dbQueryListCountSync} = require("../functions/db_func");
const {dbQueryListSync} = require("../functions/db_func");
const {dbQueryOptions} = require("../functions/db_func");
const router = express.Router();
const mongoose = require('mongoose')
const {undefinedShelfId} = require("../db/db_models");

const {WarehouseModel, ShelfModel} = require('../db/db_models')
const {validateRequiredQueryParameters} = require('../functions/validate')

const {dbUpdateUniqueById} = require('../functions/db_func')

/**
 * err_code:
 *  0: no error
 *  1: server error
 *  2: user error
 */

router.get('/query', async (req, res) => {
    let objParameters = {}
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            warehouseRef: {
                type: 'String',
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
    try {
        const dataCount = await dbQueryListCountSync(ShelfModel, objParameters)
        const arrData = await dbQueryListSync(req, res, ShelfModel, 5, objParameters, "", [
            {
                path: 'warehouseRef', model: 'warehouse',
                select: {
                    _id: 1,
                    warehouse: 1,
                    relatedShelfCount: 1
                }
            }
        ])
        const arrResult = []
        let objWarehouseIdIndex = {}
        for (let i = 0; i < arrData.length; i++) {
            const objOri = arrData[i]
            const warehouseRef = objOri.warehouseRef === null ? `undefined_${i}` : objOri.warehouseRef._id
            if (!(warehouseRef in objWarehouseIdIndex)) {
                objWarehouseIdIndex[warehouseRef] = arrResult.length
                arrResult.push({
                    warehouseRef,
                    status: 0,
                    warehouseName: objOri.warehouseRef ? objOri.warehouseRef.warehouse : '未定义',
                    relatedShelfCount: objOri.warehouseRef ? objOri.warehouseRef.relatedShelfCount : '未定义',
                    sub: []
                })
            }
            const arrResultIndex = objWarehouseIdIndex[warehouseRef]
            let objShelfSub = {
                _id: objOri._id,
                status: 0,
                shelfName: objOri.shelf,
                relatedProductCount: objOri.relatedProductCount
            }
            arrResult[arrResultIndex].sub.push(objShelfSub)
        }
        return res.status(200).json({
            err_code: 0,
            message: '请求成功',
            dataCount,
            data: arrResult
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `读取数据失败：${err.message}`
        })
    }
})

router.get('/query_shelf_options', (req, res) => {
    dbQueryOptions(req, res, ShelfModel, {}, "shelf")
})

router.get('/query_cascading_warehouse_shelf', (req, res) => {
    ShelfModel.find({}, (err, data) => {
        if (err) {
            return res.status(500).json({
                err_code: 1,
                message: err.message
            })
        }
        const objCascading = {}
        const objShelfWarehouseKV = {}
        const arrWarehouseData = []
        for (let i = 0; i < data.length; i++) {
            const obj = data[i]
            const {_id, warehouse} = obj.warehouseRef
            const shelfRef = {value: obj._id, text: obj.shelf}
            objShelfWarehouseKV[obj._id] = {
                warehouseRef: {value: _id, text: warehouse},
                shelfRef
            }
            if (!(_id in objCascading)) {
                objCascading[_id] = {
                    warehouse,
                    sub: [
                        shelfRef
                    ]
                }
                arrWarehouseData.push({value: _id, text: warehouse})
                continue
            }
            objCascading[_id].sub.push({value: obj._id, text: obj.shelf})
        }
        objCascading.warehouseData = arrWarehouseData
        return res.status(200).json({
            err_code: 0,
            objCascading,
            objShelfWarehouseKV
        })
    }).populate([
        {
            path: 'warehouseRef',
            model: 'warehouse',
            select: {
                _id: 1,
                warehouse: 1
            }
        }
    ])
})

// router.get('/query_shelf_warehouse_KV', (req, res) => {
//     ShelfModel.find({}, {}, {}, (err, data) => {}).populate([{
//         path: 'warehouseRef',
//         model: 'warehouse',
//     }])
// })

router.get('/add', async (req, res) => {
    let objParameters = {}
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            warehouseRef: {
                type: 'String',
                isRequired: true,
                str: '库房id'
            },
            shelf: {
                type: 'String',
                isRequired: true,
                str: '货架'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }

    const session = await ShelfModel.startSession()
    await session.withTransaction(async () => {
        const shelfDoc = await ShelfModel.findOne({
            warehouseRef: objParameters.warehouseRef,
            shelf: objParameters.shelf
        }, {}, {session})
        if (shelfDoc) throw {message: `${objParameters.shelf}在该库房下已存在`}
        const warehouseDoc = await WarehouseModel.findOneAndUpdate({_id: objParameters.warehouseRef}, {$inc: {relatedShelfCount: +1}}, {session})
        if (!warehouseDoc) throw {message: `该库房不存在`}
        const addRes = await ShelfModel({warehouseRef: objParameters.warehouseRef, shelf: objParameters.shelf}).save()
        return res.status(200).json({
            err_code: 0,
            message: '添加成功'
        })
    }).catch((err) => {
        return res.status(500).json({
            err_code: 1,
            message: `添加失败：${err.message}`
        })
    })
})

router.get('/update', (req, res) => {
    let objParameters = {}
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            warehouseRef: {
                type: 'String',
                isRequired: true,
                str: '库房id'
            },
            _id: {
                type: 'String',
                isRequired: true,
                str: '货架id'
            },
            shelfName: {
                type: 'String',
                isRequired: true,
                str: '货架'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    if (objParameters._id.indexOf(undefinedShelfId) !== -1) {
        return res.status(500).json({
            err_code: 2,
            message: '该数据不可被操作'
        })
    }
    dbUpdateUniqueById(req, res, ShelfModel, objParameters._id, {
        warehouseRef: objParameters.warehouseRef,
        shelf: objParameters.shelfName
    }, {shelf: objParameters.shelfName})
})

// router.get('/delete', async (req, res) => {
//     let objParameters = {}
//     try {
//         objParameters = validateRequiredQueryParameters(req, res, {
//             _id: {
//                 type: 'StringArray',
//                 isRequired: true,
//                 str: '库房id'
//             }
//         })
//     } catch (err) {
//         return res.status(500).json({
//             err_code: 1,
//             message: `${err}`
//         })
//     }
//     if (objParameters._id.indexOf(undefinedShelfId) !== -1) {
//         return res.status(500).json({
//             err_code: 2,
//             message: '该数据不可被操作'
//         })
//     }
//
//     let shelfDeleteSessionIsAborted = false
//     let shelfDeleteSession = await mongoose.startSession()
//     shelfDeleteSession.startTransaction()
//
//     let remainingParallelTasks = 3
//     // 1. update productSub shelf to undefined
//     ProductSubModel.updateMany({shelfRef: {$in: objParameters._id}}, {$set: {shelfRef: undefinedShelfId}}, {session: shelfDeleteSession}, (err) => {
//         if (err) {
//             if (shelfDeleteSessionIsAborted) return
//             shelfDeleteSessionIsAborted = true
//             shelfDeleteSession.abortTransaction().then(() => {
//                 shelfDeleteSession.endSession()
//             })
//             return res.status(500).json({
//                 err_code: 1,
//                 message: `删除失败：${err.message}`
//             })
//         }
//         if (shelfDeleteSessionIsAborted) return
//         remainingParallelTasks -= 1
//         if (remainingParallelTasks === 0) {
//             shelfDeleteSession.commitTransaction().then(() => {
//                 shelfDeleteSession.endSession()
//                 return res.status(200).json({
//                     err_code: 0,
//                     message: `删除成功`
//                 })
//             })
//         }
//     })
//     // 2. find warehouse and update shelf count
//     ShelfModel.find({_id: {$in: objParameters._id}}, {}, {session: shelfDeleteSession}, (err, data) => {
//         if (err) {
//             if (shelfDeleteSessionIsAborted) return
//             shelfDeleteSessionIsAborted = true
//             shelfDeleteSession.abortTransaction().then(() => {
//                 shelfDeleteSession.endSession()
//             })
//             return res.status(500).json({
//                 err_code: 1,
//                 message: `删除失败：${err.message}`
//             })
//         }
//         if (data.length === 0) {
//             if (shelfDeleteSessionIsAborted) return
//             shelfDeleteSessionIsAborted = true
//             shelfDeleteSession.abortTransaction().then(() => {
//                 shelfDeleteSession.endSession()
//             })
//             return res.status(500).json({
//                 err_code: 1,
//                 message: `删除失败：无对应库房`
//             })
//         }
//         let _id = []
//         for (let i = 0; i < data.length; i++) {
//             _id.push(data[i].warehouseRef)
//         }
//         WarehouseModel.updateMany({_id: {$in: _id}}, {$inc: {relatedShelfCount: -1}}, {session: shelfDeleteSession}, (err, data) => {
//             if (err) {
//                 if (shelfDeleteSessionIsAborted) return
//                 shelfDeleteSessionIsAborted = true
//                 shelfDeleteSession.abortTransaction().then(() => {
//                     shelfDeleteSession.endSession()
//                 })
//                 return res.status(500).json({
//                     err_code: 1,
//                     message: `删除失败：${err.message}`
//                 })
//             }
//             if (shelfDeleteSessionIsAborted) return
//             remainingParallelTasks -= 1
//             if (remainingParallelTasks === 0) {
//                 shelfDeleteSession.commitTransaction().then(() => {
//                     shelfDeleteSession.endSession()
//                     return res.status(200).json({
//                         err_code: 0,
//                         message: `删除成功`
//                     })
//                 })
//             }
//         })
//     })
//     // 3. delete
//     ShelfModel.deleteMany({_id: {$in: objParameters._id}}, {session: shelfDeleteSession}, (err, data) => {
//         if (err) {
//             if (shelfDeleteSessionIsAborted) return
//             shelfDeleteSessionIsAborted = true
//             shelfDeleteSession.abortTransaction().then(() => {
//                 shelfDeleteSession.endSession()
//             })
//             return res.status(500).json({
//                 err_code: 1,
//                 message: `删除失败：${err.message}`
//             })
//         }
//         if (shelfDeleteSessionIsAborted) return
//         remainingParallelTasks -= 1
//         if (remainingParallelTasks === 0) {
//             shelfDeleteSession.commitTransaction().then(() => {
//                 shelfDeleteSession.endSession()
//                 return res.status(200).json({
//                     err_code: 0,
//                     message: `删除成功`
//                 })
//             })
//         }
//     })
// })

router.get('/delete', async (req, res) => {
    let objParameters = {}
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'StringArray',
                isRequired: true,
                str: '货架id'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    if (objParameters._id.indexOf(String(undefinedShelfId)) !== -1) {
        return res.status(500).json({
            err_code: 2,
            message: '该数据不可被操作'
        })
    }
    const session = await ShelfModel.startSession()
    await session.withTransaction(async () => {
        // find shelf's warehouseRef
        const shelfDoc = await ShelfModel.find({_id: {$in: objParameters._id}}, {}, {session})
        if (shelfDoc.length === 0) throw {message: '货架数据不存在'}
        const objWarehouseRefDecCount = {}
        for (let i = 0; i < shelfDoc.length; i++) {
            let {warehouseRef} = shelfDoc[i]
            if (!(warehouseRef in objWarehouseRefDecCount)) {
                objWarehouseRefDecCount[warehouseRef] = 1
            } else {
                objWarehouseRefDecCount[warehouseRef] += 1
            }
        }
        // update warehouse relatedShelfCount
        let arrWarehouseRef = Object.keys(objWarehouseRefDecCount)
        for (let i = 0; i < arrWarehouseRef.length; i++) {
            const idKey = arrWarehouseRef[i]
            const decVal = objWarehouseRefDecCount[idKey]
            const warehouseUpdateRes = await WarehouseModel.findOneAndUpdate({_id: arrWarehouseRef[i]}, {$inc: {relatedShelfCount: -+decVal}}, {
                session,
                new: true
            })
            if (warehouseUpdateRes.relatedShelfCount < 0) throw {message: '该库房下相关货架数量有误'}
        }
        // update productSub shelf to undefined
        await ProductSubModel.updateMany({shelfRef: {$in: objParameters._id}}, {$set: {shelfRef: undefinedShelfId}}, {session})
        // delete
        const deleteRes = await ShelfModel.deleteMany({_id: {$in: objParameters._id}}, {session})
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
