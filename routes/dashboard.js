const express = require('express');
const {ShelfModel, undefinedProductId, ProductSubModel, undefinedSaleId, OrderModel} = require("../db/db_models");
const {funcObjSortBySpecificKey} = require("../functions/utils");
const {authenticateJWT} = require("../functions/validate");
const router = express.Router();

router.get('/query', authenticateJWT, async (req, res) => {
    let dt = new Date()
    const thisYear = dt.getFullYear()
    const nextYear = thisYear + 1
    const startedYearTimeStamp = Date.parse(`${thisYear}-01-01 00:00:00`)
    const endedYearTimeStamp = Date.parse(`${nextYear}-01-01 00:00:00`)

    const arrMonthlyInTotalWeight = Array.apply(null, Array(12)).map(() => 0)
    const arrMonthlyOutTotalWeight = Array.apply(null, Array(12)).map(() => 0)
    const objCustomerInWeight = {}
    const objProductInOutWeight = {}
    const objWarehouseShelfProductWeight = {}

    let isFinished = false
    let remainingParallelTasks = 2

    const resSucCallBack = () => {
        if (isFinished) return
        remainingParallelTasks -= 1
        if (remainingParallelTasks === 0) {
            isFinished = true
            return res.status(200).json({
                err_code: 0,
                data: {
                    arrMonthlyInTotalWeight,
                    arrMonthlyOutTotalWeight,
                    objCustomerInWeight,
                    objProductInOutWeight,
                    objWarehouseShelfProductWeight
                }
            })
        }
    }

    const resFaiCallBack = (err) => {
        if (isFinished) return
        isFinished = true
        console.log(err)
        return res.status(500).json({
            err_code: 1,
            message: '请求失败'
        })
    }

    // 本年度月出入库总重量
    // 本年度客户收货总重前五
    // 本年度出入库占比前五
    // 0: in, 1: out
    OrderModel.aggregate([
        {
            $lookup: {
                from: 'sales',
                foreignField: '_id',
                localField: 'saleRef',
                as: 'sale'
            }
        },
        {
            $lookup: {
                from: 'productsubs',
                foreignField: '_id',
                localField: 'productSubRef',
                as: 'productSub'
            }
        },
        {
            $lookup: {
                from: 'products',
                foreignField: '_id',
                localField: 'productSub.productRef',
                as: 'product'
            }
        },
        {
            $lookup: {
                from: 'customers',
                foreignField: '_id',
                localField: 'sale.customerRef',
                as: 'customer'
            }
        },
        {
            $match: {
                "sale.createdTimeStamp": {$gt: startedYearTimeStamp, $lt: endedYearTimeStamp},
                "saleRef": {$ne: undefinedSaleId}
            }
        },
        {
            "$project": {
                "_id": 1,
                "saleRef": 1,
                "operateWeight": 1,
                "sale.action": 1,
                "customer._id": 1,
                "customer.name": 1,
                "sale.createdTimeStamp": 1,
                "product._id": 1,
                "product.name": 1,
                "product.code": 1,
            }
        },
        {$sort: {'createdTimeStamp': -1}}
    ]).then((arrOrderDoc) => {
        // {'customerId': {name: '', totalWeight: 0}}
        const tmpObjCustomerInWeight = {}
        // {'productId': {code: '', name: '', in: 999, out: 111}}
        const tmpObjProductInOutWeight = {}
        for (let i = 0; i < arrOrderDoc.length; i++) {
            const {operateWeight, sale, product, customer} = arrOrderDoc[i]
            const {action, createdTimeStamp} = sale[0]
            const index = new Date(createdTimeStamp).getMonth()
            const {_id, name, code} = product[0]
            if (!(_id in tmpObjProductInOutWeight)) {
                tmpObjProductInOutWeight[_id] = {code, name, in: 0, out: 0}
            }
            if (action === 1) {
                arrMonthlyInTotalWeight[index] += operateWeight
                tmpObjProductInOutWeight[_id].in += operateWeight
            } else {
                arrMonthlyOutTotalWeight[index] += operateWeight
                tmpObjProductInOutWeight[_id].out += operateWeight
                const customerId = customer[0]._id
                if (!(customerId in tmpObjCustomerInWeight)) {
                    tmpObjCustomerInWeight[customerId] = {
                        name: customer[0].name,
                        totalWeight: operateWeight
                    }
                } else {
                    tmpObjCustomerInWeight[customerId].totalWeight += operateWeight
                }
            }
        }
        const arrSortedCustomerKey = funcObjSortBySpecificKey(tmpObjCustomerInWeight, 'totalWeight').slice(0, 5)
        const arrSortedProductKey = Object.keys(tmpObjProductInOutWeight).sort((pre, nex) => (tmpObjProductInOutWeight[nex].out / tmpObjProductInOutWeight[nex].in - tmpObjProductInOutWeight[pre].out / tmpObjProductInOutWeight[pre].in)).slice(0, 5)
        for (let i = 0; i < 5; i++) {
            let customerKey = arrSortedCustomerKey[i]
            let productKey = arrSortedProductKey[i]
            if (customerKey) objCustomerInWeight[customerKey] = tmpObjCustomerInWeight[customerKey]
            if (productKey) {
                objProductInOutWeight[productKey] = tmpObjProductInOutWeight[productKey]
                objProductInOutWeight[productKey].inOutPercentage = Number(objProductInOutWeight[productKey].out / objProductInOutWeight[productKey].in * 100).toFixed(2)
            }
            if (!arrSortedCustomerKey[i + 1] && !arrSortedProductKey[i + 1]) break
        }
        resSucCallBack()
    }).catch((err) => {
        resFaiCallBack(err)
    })

    // 各个库房总货物重量，各个库房下货架总货物重量
    ProductSubModel.aggregate([
        {
            $lookup: {
                from: 'shelves',
                foreignField: '_id',
                localField: 'shelfRef',
                as: 'shelf'
            }
        },
        {
            $lookup: {
                from: 'warehouses',
                foreignField: '_id',
                localField: 'shelf.warehouseRef',
                as: 'warehouse'
            }
        },
        {
            $match: {
                "productRef": {$ne: undefinedProductId}
            }
        },
        {
            $group: {
                _id: '$shelfRef',
                shelfProductWeight: {$sum: "$remainingWeight"},
                warehouseId: {$addToSet: "$warehouse._id"},
                // warehouseName: {$addToSet: "$warehouse.warehouse"},
                // shelfName: {$addToSet: "$shelf.shelf"},
            }
        }
    ]).then(async (arrDoc) => {
        // objWarehouseShelfProductWeight = {warehouseId: {warehouseName: 'ss', totalWeight: 999, shelfId1: {shelfName: 'xxx', totalWeight: 888}}}
        const arrShelfDoc = await ShelfModel.find().populate('warehouseRef', 'warehouse', 'warehouse')
        for (let i = 0; i < arrShelfDoc.length; i++) {
            const shelfDoc = arrShelfDoc[i]
            const warehouseId = shelfDoc.warehouseRef._id
            const warehouseName = shelfDoc.warehouseRef.warehouse
            if (!(warehouseId in objWarehouseShelfProductWeight)) objWarehouseShelfProductWeight[warehouseId] = {warehouseName, warehouseProductWeight: 0}
            const shelfId = shelfDoc._id
            const shelfName = shelfDoc.shelf
            objWarehouseShelfProductWeight[warehouseId][shelfId] = {shelfName, shelfProductWeight: 0}
        }
        for (let i = 0; i < arrDoc.length; i++) {
            const warehouseId = arrDoc[i].warehouseId[0][0]
            const shelfId = arrDoc[i]._id
            const {shelfProductWeight} = arrDoc[i]
            objWarehouseShelfProductWeight[warehouseId].warehouseProductWeight += shelfProductWeight
            objWarehouseShelfProductWeight[warehouseId][shelfId].shelfProductWeight = shelfProductWeight
        }
        resSucCallBack()
    }).catch((err) => {
        resFaiCallBack(err)
    })
})

module.exports = router;
