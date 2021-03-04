const express = require('express');
const router = express.Router();
const fs = require('fs');

const multer = require("multer");
const {funcGetUpdateCount} = require("../functions/utils");
const {authenticateJWT, validateRequiredQueryParameters} = require("../functions/validate");
const {handleImages} = require("../functions/imageHandler");
const {ProductModel, ProductSubModel, ColorModel, ShelfModel, undefinedProductId} = require('../db/db_models')
const {dbQueryListSync, dbAddUnique} = require('../functions/db_func')

/**
 * err_code:
 *  0: no error
 *  1: server error
 *  2: user error
 */
router.get('/query', authenticateJWT, async (req, res) => {
    let objProductFilter = {}
    try {
        objProductFilter = validateRequiredQueryParameters(req, res, {
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
            },
            arrLevelRange: [0, 0]
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }

    let objProductSubFilter
    try {
        objProductSubFilter = validateRequiredQueryParameters(req, res, {
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

    if (objProductSubFilter.hasOwnProperty('shelfRef')) {
        let arr = await ProductSubModel.find(objProductSubFilter, {_id: 0, productRef: 1})
        const _id = []
        for (let i = 0; i < arr.length; i++) {
            let {productRef} = arr[i]
            if (_id.indexOf(String(productRef)) === -1) _id.push(String(productRef))
        }
        objProductFilter._id = _id
    }

    let dataCount, arrProduct
    try {
        dataCount = await ProductModel.countDocuments(objProductFilter)
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `读取数据失败：${err.message}`
        })
    }

    try {
        arrProduct = await dbQueryListSync(req, res, ProductModel, 5, objProductFilter, "_id code name price colorRef imageURLs remark", [
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

    objProductSubFilter.productRef = []
    let objProductIdIndex = {}
    for (let i = 0; i < arrProduct.length; i++) {
        objProductIdIndex[arrProduct[i]['_id']] = i
        arrProduct[i]['_doc']['sub'] = [
            {
                remainingWeight: "",
                soldWeight: "",
                _id: "",
                shelf: "",
                warehouse: ""
            }
        ]
        arrProduct[i]['_doc'].status = 0
        arrProduct[i]['_doc']['colorRef'] = {
            value: arrProduct[i]['_doc']['colorRef']._id,
            text: arrProduct[i]['_doc']['colorRef']['color']
        }
        // delete arrProduct[i]['_doc']['colorRef']
        objProductSubFilter.productRef.push(arrProduct[i]._id)
    }

    let objShelfFilter = {}
    if (objProductSubFilter.shelfRef) objShelfFilter = {_id: objProductSubFilter.shelfRef}
    const arrShelf = await ShelfModel.find(objShelfFilter, "_id warehouseRef").populate([{
        path: 'warehouseRef',
        model: 'warehouse',
        select: {
            warehouse: 1
        }
    }]).exec()

    const objWarehouseIdName = {}
    for (let i = 0; i < arrShelf.length; i++) {
        const {_id, warehouseRef} = arrShelf[i]
        objWarehouseIdName[_id] = warehouseRef ? warehouseRef.warehouse : `未定义_${i}`
    }


    ProductSubModel.find(objProductSubFilter, {__v: 0}, (err, data) => {
        if (err) {
            return res.status(500).json({
                err_code: 1,
                message: `读取数据失败：${err.message}`
            })
        }
        for (let i = 0; i < data.length; i++) {
            const {productRef} = data[i]
            const index = objProductIdIndex[productRef]
            let objProduct = arrProduct[index]
            data[i]['_doc'].shelf = data[i]['_doc'].shelfRef ? data[i]['_doc'].shelfRef.shelf : `未定义_${i}`

            let shelfId = data[i]['_doc'].shelfRef ? data[i]['_doc'].shelfRef._id : `未定义_${i}`
            data[i]['_doc'].warehouse = objWarehouseIdName[shelfId]

            delete data[i]['_doc'].shelfRef
            delete data[i]['_doc'].productRef
            objProduct._doc.sub[0]._id === "" ? objProduct._doc.sub[0] = data[i] : objProduct._doc.sub.push(data[i])
        }
        if (objProductSubFilter.shelfRef) {
            arrProduct = arrProduct.filter((item) => item._doc.sub[0]._id !== "")
        }
        return res.status(200).json({
            err_code: 0,
            dataCount,
            data: arrProduct
        })
    }).populate([
        {
            path: 'shelfRef', model: 'shelf',
            select: {
                _id: 1,
                shelf: 1
            }
        }
    ])
    // .skip(((intCurrentPageCount === 0 ? 1 : intCurrentPageCount) - 1) * 10).limit(intCurrentPageCount === 0 ? 0 : 10);
})

// router.get('/query_code_options', authenticateJWT,  (req, res) => {
//     dbQueryOptions(req, res, ProductModel, {}, "code")
// })

// router.get('/query_product_options', authenticateJWT,  (req, res) => {
//     dbQueryOptions(req, res, ProductModel, {}, "name")
// })

router.get('/fuzzy_query_product_code', authenticateJWT, (req, res) => {
    let objParameters = {}
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            code: {
                type: 'String',
                isRequired: true,
                str: '商品货号'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    ProductModel.find({code: {$regex: eval(`/${objParameters.code}/`)}}, '_id code', {}, (err, data) => {
        if (err) {
            console.log(err.message)
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

router.get('/fuzzy_query_product_name', authenticateJWT, (req, res) => {
    let objParameters = {}
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            name: {
                type: 'String',
                isRequired: true,
                str: '商品名称'
            }
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    ProductModel.find({name: {$regex: eval(`/${objParameters.name}/`)}}, '_id name', {}, (err, data) => {
        if (err) {
            console.log(err.message)
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


router.use(multer({dest: './dist'}).array('productImages'));
router.post('/add', authenticateJWT, async (req, res) => {
    let objParameters
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            code: {
                type: 'String',
                isRequired: true,
                str: '货号'
            },
            name: {
                type: 'String',
                isRequired: true,
                str: '名称'
            },
            colorRef: {
                type: 'String',
                isRequired: true,
                str: '颜色id'
            },
            remark: {
                type: 'String',
                isRequired: false,
                str: '备注'
            },
            arrLevelRange: [0, 0]
        }, false)
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    objParameters.imageURLs = []
    // const {code, name, colorRef} = objParameters
    // let objFilter = {code}
    // let objAddData = {
    //     code,
    //     name,
    //     colorRef,
    //     imageURLs: []
    // }
    let {files} = req
    if (files && files.length !== 0) {
        try {
            handleImages(req, res, files, ProductModel, {code: objParameters.code}, objParameters)
        } catch (err) {
            console.log(err)
            return res.status(500).json({
                err_code: 1,
                message: `添加失败`
            })
        }
    } else {
        // todo: update color related product count
        try {
            await ColorModel.updateOne({_id: objParameters.colorRef}, {$inc: {relatedProductCount: +1}})
        } catch (err) {
            console.log(err)
            return res.status(500).json({
                err_code: 1,
                message: `添加失败`
            })
        }
        await dbAddUnique(req, res, ProductModel, {code: objParameters.code}, objParameters)
    }
})

router.post('/update', authenticateJWT, async (req, res) => {
    let objParameters
    try {
        objParameters = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'String',
                isRequired: true,
                str: '商品id'
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
            },
            price: {
                type: 'String',
                isRequired: false,
                str: '价格'
            },
            imageURLs: {
                type: 'ArrayString',
                isRequired: false,
                str: '图片'
            },
            remark: {
                type: 'String',
                isRequired: false,
                str: '备注'
            },
            arrLevelRange: [0, 0]
        }, false)
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    let {_id} = objParameters
    let {files} = req
    if (files && files.length !== 0) {
        objParameters.imageURLs = []
        let fileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

        if (files.length > 5) {
            return res.status(500).json({
                err_code: 1,
                message: '图片最大数量为5'
            })
        }

        for (let i = 0; i < files.length; i++) {
            if (fileTypes.indexOf(files[i].mimetype) === -1) {
                return res.status(500).json({
                    err_code: 1,
                    message: `图片类型${files[i].mimetype}不被接受`
                })
            }
        }

        for (let i = 0; i < files.length; i++) {
            let fileName = `${files[i].filename}.${files[i].originalname.split(".").pop()}`
            try {
                await fs.renameSync(`./dist/${files[i].filename}`, `./public/images/${fileName}`)
                objParameters.imageURLs.push(fileName)
            } catch (err) {
                return res.status(500).json({
                    err_code: 1,
                    message: '操作失败'
                })
            }
        }
    }

    const session = await ProductModel.startSession()
    await session.withTransaction(async () => {
        // let productDoc = await ProductModel.findOne({_id})
        const productDoc = await ProductModel.findOne({_id})
        if (!productDoc) return res.status(500).json({
            err_code: 2,
            message: `商品不存在`
        })
        if (objParameters.code) {
            // model.findOne({_id: {$ne: _id}, ...objFilter}
            const uniqueDoc = await ProductModel.findOne({_id: {$ne: _id}, code: objParameters.code}, {}, {session})
            if (uniqueDoc) {
                return res.status(500).json({
                    err_code: 2,
                    message: `货号${objParameters.code}已存在`
                })
                // throw new Error(`货号${code}已存在`)
            }
        }
        if (objParameters.colorRef) {
            const preColorRef = productDoc.colorRef
            if (preColorRef !== objParameters.colorRef) {
                await ColorModel.updateOne({_id: preColorRef}, {$inc: {relatedProductCount: -1}}, {session})
                await ColorModel.updateOne({_id: objParameters.colorRef}, {$inc: {relatedProductCount: +1}}, {session})
            }
        }
        if (objParameters.imageURLs) {
            const preImageURLs = productDoc.imageURLs
            for (let i = 0; i < preImageURLs.length; i++) {
                fs.unlink(`./public/images/${preImageURLs[i]}`, (err) => {
                    if (err) throw err
                })
            }
        }
        await ProductModel.updateOne({_id}, objParameters, {session})
        return res.status(200).json({
            err_code: 0,
            message: '操作成功'
        })
    }).catch((err) => {
        console.log(err)
        return res.status(500).json({
            err_code: 1,
            message: '操作失败'
        })
    })
})

router.get('/delete', authenticateJWT, async (req, res) => {
    // 6016530331f7639ec27d8a45
    let objFilter = {}
    try {
        objFilter = validateRequiredQueryParameters(req, res, {
            _id: {
                type: 'StringArray',
                isRequired: true,
                str: '商品id'
            },
            arrLevelRange: [0, 0]
        })
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `${err}`
        })
    }
    if (objFilter._id.indexOf(String(undefinedProductId)) !== -1) {
        return res.status(500).json({
            err_code: 2,
            message: '该数据不可被操作'
        })
    }
    const productDoc = await ProductModel.find({_id: {$in: objFilter._id}})
    if (productDoc.length === 0) {
        return res.status(500).json({
            err_code: 1,
            message: '商品数据不存在'
        })
    }
    const session = await ProductModel.startSession()
    await session.withTransaction(async () => {
        const objColorRefDecCount = funcGetUpdateCount(productDoc, 'colorRef')
        // for (let i = 0; i < productDoc.length; i++) {
        //     let {colorRef} = productDoc[i]
        //     if (!(colorRef in objColorRefDecCount)) {
        //         objColorRefDecCount[colorRef] = 1
        //     } else {
        //         objColorRefDecCount[colorRef] += 1
        //     }
        // }
        // update color relatedProductCount
        const arrColorRef = Object.keys(objColorRefDecCount)
        for (let i = 0; i < arrColorRef.length; i++) {
            const idKey = arrColorRef[i]
            const decVal = objColorRefDecCount[idKey]
            const colorUpdateRes = await ColorModel.findOneAndUpdate({_id: arrColorRef[i]}, {$inc: {relatedProductCount: -+decVal}}, {
                session,
                new: true
            })
            if (colorUpdateRes.relatedProductCount < 0) throw {message: '该颜色下相关商品数量有误'}
        }

        const productSubDoc = await ProductSubModel.updateMany({productRef: {$in: objFilter._id}}, {productRef: undefinedProductId}, {session})
        const objShelfRefDecCount = funcGetUpdateCount(productSubDoc, 'shelfRef')
        const arrShelfRef = Object.keys(objShelfRefDecCount)
        for (let i = 0; i < arrShelfRef.length; i++) {
            const idKey = arrShelfRef[i]
            const decVal = objShelfRefDecCount[idKey]
            const shelfUpdateRes = await ShelfModel.findOneAndUpdate({_id: arrShelfRef[i]}, {$inc: {relatedProductCount: -+decVal}}, {
                session,
                new: true
            })
            if (shelfUpdateRes.relatedProductCount < 0) throw {message: '该货架下相关商品数量有误'}
        }
        const deleteRes = await ProductModel.deleteMany({_id: {$in: objFilter._id}}, {session})
        // delete suc, rm img
        let imageURLs = []
        for (let i = 0; i < productDoc.length; i++) {
            imageURLs = [...imageURLs, ...productDoc[i].imageURLs]
        }
        for (let i = 0; i < imageURLs.length; i++) {
            fs.unlink(`./public/images/${imageURLs[i]}`, (err) => {
                if (err) console.log(err)
            })
        }
        // delete suc, rm img
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
