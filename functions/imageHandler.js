const {ColorModel} = require("../db/db_models");
const {dbAddUnique} = require("./db_func");
exports.handleImagesSync = (req, res, files) => {
    const fs = require('fs')
    let imageURLS = []
    let fileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

    if (files.length > 5) {
        res.status(500).json({
            err_code: 2,
            message: "最大图片数量为5"
        })
        return imageURLS
    }

    for (let i = 0; i < files.length; i++) {
        if (fileTypes.indexOf(files[i].mimetype) === -1) {
            res.status(500).json({
                err_code: 2,
                message: `图片类型${files[i].mimeType}不被接受`
            })
            return imageURLS
        }
        let fileName = `${files[i].filename}.${files[i].originalname.split(".").pop()}`
        let des_path = `./public/images/${fileName}`
        fs.renameSync(`./dist/${files[i].filename}`, des_path)
        imageURLS.push(fileName)
    }
    return imageURLS
}

exports.handleImages = (req, res, files, model, objFilter, objAddData) => {
    const fs = require('fs')
    let imageURLS = []
    let fileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    let isTerminated = false

    if (files.length > 5) {
        throw {message: '图片最大数量为5'}
    }

    for (let i = 0; i < files.length; i++) {
        if (fileTypes.indexOf(files[i].mimetype) === -1) {
            throw {message: `图片类型${files[i].mimeType}不被接受`}
        }
    }

    for (let i = 0; i < files.length; i++) {
        let fileName = `${files[i].filename}.${files[i].originalname.split(".").pop()}`
        fs.rename(`./dist/${files[i].filename}`, `./public/images/${fileName}`, async (err) => {
            if (err) {
                isTerminated = true
                throw {message: err}
            }
            if (!isTerminated) {
                imageURLS.push(fileName)
                if (imageURLS.length === files.length) {
                    try {
                        await ColorModel.updateOne({_id: objAddData.colorRef}, {$inc: {relatedProductCount: +1}})
                    } catch (err) {
                        throw {message: err}
                    }
                    objAddData.imageURLs = imageURLS
                    dbAddUnique(req, res, model, objFilter, objAddData)
                }
            }
        })
    }
}
