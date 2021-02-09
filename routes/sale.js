const express = require('express');
const {OrderModel} = require("../db/db_models");
const router = express.Router();
const mongoose = require('mongoose')
const {fromTimeStampToString} = require("../functions/utils");
const {undefinedProductId} = require("../db/db_models");
const {dbQueryListSync} = require("../functions/db_func");
const {ProductModel} = require("../db/db_models");
const {funcCurrentPage} = require("../functions/utils");

const {ProductSubModel, SaleModel, ShelfModel} = require('../db/db_models')

const {validateRequiredQueryParameters} = require('../functions/validate')

/**
 * err_code:
 *  0: no error
 *  1: server error
 *  2: user error
 */

router.get('/query_history', async (req, res) => {
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            startedTimeStamp: {
                type: 'Number',
                isRequired: true,
                str: '开始日期'
            },
            endedTimeStamp: {
                type: 'Number',
                isRequired: true,
                str: '结束日期'
            },
            action: {
                type: 'Number',
                isRequired: false,
                str: '操作类型'
            },
            operatorRef: {
                type: 'String',
                isRequired: false,
                str: '操作人id'
            },
            productCode: {
                type: 'String',
                isRequired: false,
                str: '货号'
            },
            productName: {
                type: 'String',
                isRequired: false,
                str: '名称'
            },
            colorRef: {
                type: 'String',
                isRequired: false,
                str: '颜色id'
            },
            driverRef: {
                type: 'String',
                isRequired: false,
                str: '司机id'
            },
            shelfRef: {
                type: 'StringArray',
                isRequired: false,
                str: '货架id'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    objFilter.timeStamp = `${objFilter.startedTimeStamp}_${objFilter.endedTimeStamp}`
    delete objFilter.startedTimeStamp
    delete objFilter.endedTimeStamp
    objFilter.saleRef = {$ne: mongoose.Types.ObjectId('601b710943394661fdb6996c')}
    const arrFilterKeys = Object.keys(objFilter)
    for (let i = 0; i < arrFilterKeys.length; i++) {
        const filterKey = arrFilterKeys[i]
        switch (filterKey) {
            case 'timeStamp':
                // {"createdTimeStamp":{"$gt": startedTimeStamp,"$lt": endedTimeStamp}}
                const tmp = objFilter.timeStamp.split('_').map(Number)
                objFilter["sale.createdTimeStamp"] = {"$gt": tmp[0], "$lt": tmp[1]}
                delete objFilter.timeStamp
                break
            case 'action':
                if (objFilter.action === 0 || objFilter.action === 1) {
                    objFilter["sale.action"] = objFilter.action
                }
                delete objFilter.action
                break
            case 'operatorRef':
                objFilter["sale.operatorRef"] = mongoose.Types.ObjectId(objFilter.operatorRef)
                delete objFilter.operatorRef
                break
            case 'productCode':
                objFilter["product.code"] = objFilter.productCode
                delete objFilter.productCode
                break
            case 'productName':
                objFilter["product.name"] = objFilter.productName
                delete objFilter.productName
                break
            case 'colorRef':
                objFilter["product.colorRef"] = mongoose.Types.ObjectId(objFilter.colorRef)
                delete objFilter.colorRef
                break
            case 'driverRef':
                objFilter["sale.driverRef"] = mongoose.Types.ObjectId(objFilter.driverRef)
                delete objFilter.driverRef
                break
            case 'shelfRef': {
                const tmp = []
                for (let j = 0; j < objFilter.shelfRef.length; j++) {
                    tmp.push(mongoose.Types.ObjectId(objFilter.shelfRef[i]))
                }
                objFilter["productSub.shelfRef"] = {$in: tmp}
                delete objFilter.shelfRef
                break
            }
        }
    }
    let saleOrderDoc = await OrderModel.aggregate([
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
        {$match: objFilter},
        {$group: {_id: '$saleRef', arrOrderId: {$push: "$_id"}, createdTimeStamp: {$addToSet: "$sale.createdTimeStamp"}}},
        // {$sort: {'createdTimeStamp': -1}},
        {$sort: {'createdTimeStamp': -1}}
    ])
    // return res.status(200).json({
    //     saleOrderDoc
    // })
    const intCurrentPageCount = funcCurrentPage(req)
    const dataCount = saleOrderDoc.length
    const skippedLength = ((intCurrentPageCount === 0 ? 1 : intCurrentPageCount) - 1) * 10
    const skippedSaleDoc = saleOrderDoc.slice(skippedLength, skippedLength + 10)
    // const skippedSaleDoc = saleOrderDoc
    const arrOrderQueryIds = []
    for (let i = 0; i < skippedSaleDoc.length; i++) {
        const {arrOrderId} = skippedSaleDoc[i]
        arrOrderQueryIds.push(...arrOrderId)
    }
    const ordersDoc = await OrderModel.find({_id: {$in: arrOrderQueryIds}}).populate([{
        path: 'saleRef',
        model: 'sale',
        select: {"__v": 0},
        populate: [{path: 'operatorRef', select: {'_id': 0, 'name': 1}}, {
            path: 'driverRef',
            select: {'_id': 0, 'name': 1, 'plate': 1}
        }, {path: 'supplierRef', select: {'_id': 0, 'supplierName': 1}}, {
            path: 'customerRef',
            select: {'_id': 0, 'name': 1}
        }],
    }, {
        path: 'productSubRef',
        populate: [{
            path: "productRef",
            populate: {path: 'colorRef', select: {'_id': 0, 'color': 1}}
        }, {path: "shelfRef", select: {'_id': 1}}]
    }])

    const objData = {}
    for (let i = 0; i < ordersDoc.length; i++) {
        const orderDoc = ordersDoc[i]
        const {_id} = orderDoc.saleRef
        if (!(_id in objData)) {
            const totalWeight = 0, totalPrice = 0, totalCount = 0
            const {saleRef} = orderDoc
            const {createdTimeStamp, action, operatorRef} = saleRef
            // const dateTime = fromTimeStampToString(createdTimeStamp)
            const objTmp = {
                createdTimeStamp, action, totalWeight, totalPrice, totalCount, operatorName: operatorRef.name, product: {}
            }
            switch (action) {
                case 0:
                    objTmp.driverRef = saleRef.driverRef
                    objTmp.deliveryFee = saleRef.deliveryFee
                    objTmp.supplierName = saleRef.supplierRef.supplierName
                    break
                case 1:
                    objTmp.customerName = saleRef.customerRef.name
                    break
                default:
                    break
            }
            objData[_id] = objTmp
        }
        const orderRef = orderDoc._id
        const {oriWeight, price, operateWeight, productSubRef} = orderDoc
        const {productRef} = productSubRef
        if (!(productRef._id in objData[_id].product)) {
            objData[_id].totalCount += 1
            objData[_id].product[productRef._id] = {
                productName: productRef.name,
                productCode: productRef.code,
                color: productRef.colorRef.color,
                imageURLs: productRef.imageURLs
            }
            objData[_id].product[productRef._id].order = []
        }
        objData[_id].totalWeight += operateWeight
        objData[_id].totalPrice += price
        objData[_id].product[productRef._id].order.push(
            {
                orderRef,
                shelfRef: productSubRef.shelfRef,
                oriWeight,
                operateWeight,
                afterOperateWeight: orderDoc.saleRef.action === 0 ? oriWeight + operateWeight : oriWeight - operateWeight,
                remainingWeight: productRef.remainingWeight,
                price,
            }
        )
        ordersDoc[i] = ''
    }
    const arrSortedKey = Object.keys(objData).sort((key1, key2) => (objData[key2].createdTimeStamp - objData[key1].createdTimeStamp))
    const arrData = []
    for (let i = 0; i < arrSortedKey.length; i++) {
        const key = arrSortedKey[i]
        arrData.push(objData[key])
    }

    return res.status(200).json({
        err_code: 0,
        dataCount,
        arrData
    })
})

router.get('/query_product', async (req, res) => {
    let objProductFilter = {}
    try {
        objProductFilter = validateRequiredQueryParameters(req, res, {
            action: {
                type: 'Number',
                isRequired: true,
                str: '操作类型'
            },
            code: {
                type: 'String',
                isRequired: false,
                str: '货号'
            },
            name: {
                type: 'String',
                isRequired: false,
                str: '名称'
            },
            colorRef: {
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

    const {action} = objProductFilter
    objProductFilter._id = {$ne: undefinedProductId}
    delete objProductFilter.action
    if (action !== 0 && action !== 1) return res.status(500).json({err_code: 2, message: '操作类型不匹配'})

    let dataCount, arrProduct
    try {
        dataCount = await ProductModel.countDocuments(objProductFilter).exec()
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `读取数据失败：${err.message}`
        })
    }

    try {
        arrProduct = await dbQueryListSync(req, res, ProductModel, 18, objProductFilter, "_id code name price colorRef imageURLs", [
            {
                path: 'colorRef', model: 'color',
                select: {
                    _id: 1,
                    color: 1
                }
            }
        ])
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `读取数据失败：${err.message}`
        })
    }

    const arrResult = []
    const arrProductRef = []
    const objProductRefIndex = {}
    for (let i = 0; i < arrProduct.length; i++) {
        arrProduct[i]['_doc'].row = i
        arrProduct[i]['_doc'].sub = {}
        const {_id} = arrProduct[i]
        arrProductRef.push(_id)
        objProductRefIndex[_id] = i
        arrResult.push({...arrProduct[i]['_doc']})
    }
    const arrProductSub = await ProductSubModel.find({productRef: {$in: arrProductRef}})
    for (let i = 0; i < arrProductSub.length; i++) {
        const productSub = arrProductSub[i]
        const {productRef, shelfRef} = productSub
        const productRefIndex = objProductRefIndex[productRef]
        arrResult[productRefIndex].sub[`${productRef}_${shelfRef}`] = {
            isAlreadyExisted: true,
            oriWeight: productSub.remainingWeight,
            operateWeight: 0,
            afterOperateWeight: productSub.remainingWeight
        }
    }
    return res.status(200).json({
        err_code: 0,
        dataCount,
        data: arrResult
    })

    // {
    //     productId1: {
    //         name: '',
    //         code: '',
    //         imageURLs: [],
    //         price: 99,
    //         colorRef: {},
    //         warehouseId1: {
    //             shelfId1: {
    //                 oriWeight: 999,
    //                 operateWeight: 0,
    //                 afterOperateWeight: 999
    //             },
    //             shelfId2: {
    //                 oriWeight: 999,
    //                 operateWeight: 0,
    //                 afterOperateWeight: 999
    //             }
    //         }
    //     }
    // }

    // [
    //     {
    //         code: '',
    //         name: '',
    //         color: '',
    //         price: '',
    //         sub: {
    //             601b62a5234f3057edbc105e: {
    //                 operateWeight: 0,
    //                 oriWeight: 999,
    //                 afterOperate: 999
    //             },
    //             601b62b3234f3057edbc1061: {
    //                 operateWeight: 0,
    //                 oriWeight: 999,
    //                 afterOperate: 999
    //             }
    //         }
    //     }
    // ]
})

router.get('/add', async (req, res) => {
    let objParameters = {}
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            action: {
                type: 'Number',
                isRequired: true,
                str: '操作类型'
            },
            operatorRef: {
                type: 'String',
                isRequired: true,
                str: '操作员id'
            },
            supplierRef: {
                type: 'String',
                isRequired: false,
                str: '供应商id'
            },
            customerRef: {
                type: 'String',
                isRequired: false,
                str: '客户id'
            },
            driverRef: {
                type: 'String',
                isRequired: false,
                str: '司机id'
            },
            deliveryFee: {
                type: 'Number',
                isRequired: false,
                str: '运费'
            },
            product: {
                type: 'Object',
                isRequired: true,
                str: '出入库详情'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }

    const {action, operatorRef, supplierRef, customerRef, driverRef, product, deliveryFee} = objParameters
    const objSaleAddData = {
        action,
        operatorRef
    }
    // 0: in, 1: out
    if (action === 0) {
        if (!supplierRef || !driverRef) {
            return res.status(500).json({
                err_code: 2,
                message: '操作类型不匹配或缺少必须参数'
            })
        }
        objSaleAddData.supplierRef = supplierRef
        objSaleAddData.driverRef = driverRef
        objSaleAddData.deliveryFee = deliveryFee
    }
    if (action === 1) {
        if (!customerRef) {
            return res.status(500).json({
                err_code: 2,
                message: '操作类型不匹配或缺少必须参数'
            })
        }
        objSaleAddData.customerRef = customerRef
    }
    // /**
    //  * // 0: in, 1: out
    //  * operatorId: 'xxxxx',
    //  * supplierId: 'xxxxx',
    //  * product: {
    //  *     "productRef1": {
    //  *         "shelfRef1": {
    //  *              weight: 200,
    //  *              price: 2000
    //  *         },
    //  *         "shelfRef2": {
    //  *              weight: 500,
    //  *              price: 1500
    //  *         }
    //  *     }
    //  * }
    //  */
    //
    objSaleAddData.createdTimeStamp = Date.now()
    const session = await mongoose.startSession()
    await session.withTransaction(async () => {
        const saleDoc = await SaleModel(objSaleAddData).save({session})
        const saleRef = saleDoc._id
        for (const productIdShelfKey in product) {
            const data = product[productIdShelfKey]
            let [productRef, shelfRef] = productIdShelfKey.split('_')
            let {operateWeight, totalPrice} = data
            operateWeight = parseInt(operateWeight)
            totalPrice = parseInt(totalPrice)
            if (isNaN(operateWeight) || isNaN(totalPrice)) {
                throw {message: '重量和价格必须为数字'}
            }
            let productSubDoc
            productSubDoc = await ProductSubModel.findOne({productRef, shelfRef}, {}, {session})
            let oriWeight
            if (productSubDoc) {
                oriWeight = productSubDoc.remainingWeight
                if (action === 0) {
                    productSubDoc.remainingWeight += operateWeight
                } else {
                    if (productSubDoc.remainingWeight - operateWeight < 0) throw {message: `出库商品超出该货架下最大库存：${productSubDoc.remainingWeight}，需要数量：${operateWeight}`}
                    productSubDoc.remainingWeight -= operateWeight
                    productSubDoc.soldWeight += operateWeight
                }
                productSubDoc.save()
            } else {
                oriWeight = 0
                productSubDoc = await ProductSubModel({
                    productRef,
                    shelfRef,
                    remainingWeight: operateWeight
                }).save({session})
            }
            const productSubRef = productSubDoc._id
            await OrderModel({saleRef, productSubRef, oriWeight, operateWeight, price: totalPrice}).save({session})
        }
        return res.status(200).json({
            err_code: 0,
            message: '操作成功'
        })
    }).catch((err) => {
        console.log(err)
        return res.status(500).json({
            err_code: 1,
            message: `操作失败：${err.message}`
        })
    })
})

module.exports = router;
