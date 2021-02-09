const {funcCurrentPage} = require("./utils");
const {filterObjValue} = require("./validate");
const {objectToString} = require("./utils")

// todo: remove this func
exports.dbCurrentPage = (dataSource) => {
    const {currentPageCount} = dataSource
    let intCurrentPageCount
    try {
        if (!currentPageCount) {
            intCurrentPageCount = 1
        } else {
            intCurrentPageCount = parseInt(currentPageCount)
        }
    } catch (err) {
        intCurrentPageCount = 1
    }
    return intCurrentPageCount
}

exports.dbAdd = (req, res, model, objAddData) => {
    objAddData = filterObjValue(objAddData)
    model(objAddData).save((err, data) => {
        if (err) {
            return res.status(500).json({
                err_code: 1,
                message: `提交失败：${err.message}`
            })
        }
        return res.status(200).json({
            err_code: 0,
            message: "提交成功",
            data
        })
    })
}

exports.dbAddSync = (model, objAddData) => {
    objAddData = filterObjValue(objAddData)
    return model(objAddData).save();
}

exports.dbIfDataUniqueSync = async (model, objFilter) => {
    objFilter = filterObjValue(objFilter)
    return await model.findOne(objFilter).exec()
}

exports.dbAddUnique = async (req, res, model, objFilter, objAddData) => {
    let data
    try {
        data = await this.dbIfDataUniqueSync(model, objFilter)
    } catch (err) {
        return res.status(500).json({
            err_code: 1,
            message: `提交失败：${err.message}`
        })
    }
    if (data) {
        return res.status(500).json({
            err_code: 2,
            message: `${objectToString(objFilter)}已存在`
        })
    }
    this.dbAdd(req, res, model, objAddData)
}

exports.dbAddUniqueSync = async (model, objFilter, objAddData) => {
    let data = await this.dbIfDataUniqueSync(model, objFilter)
    if (data) throw {message: `数据已存在：${data}`}
    objAddData = filterObjValue(objAddData)
    return await this.dbAddSync(model, objAddData)
}

exports.dbQueryList = (req, res, model, perPageCount = 0, objFilter = {}, populateArr = "") => {
    objFilter = filterObjValue(objFilter)
    // todo: change to utils func
    let intCurrentPageCount = funcCurrentPage(req)

    model.countDocuments(objFilter, function (err, dataCount) {
        if (err) {
            return res.status(500).json({
                err_code: 1,
                message: `读取数据失败：${err.message}`
            })
        }
        model.find(objFilter, {__v: 0}, (err, data) => {
            if (err) {
                return res.status(500).json({
                    err_code: 1,
                    message: `读取数据失败：${err.message}`
                })
            }
            for (let i = 0; i < data.length; i++) {
                // 0: no action, 1: edited, 2: uploading
                data[i]["_doc"]["status"] = 0
                data[i]["_doc"]["row"] = i
            }
            return res.status(200).json({
                err_code: 0,
                message: "请求成功",
                dataCount,
                data
            })
        }).populate(populateArr).skip(((intCurrentPageCount === 0 ? 1 : intCurrentPageCount) - 1) * perPageCount).limit(intCurrentPageCount === 0 ? 0 : perPageCount);
    });
}

exports.dbQueryOptions = (req, res, model, objFilter, strTextField) => {
    objFilter = filterObjValue(objFilter)
    // 如果id是0，则代表请求全部
    if (objFilter._id === "0") delete objFilter._id
    model.find(objFilter, {__v: 0}, (err, data) => {
        if (err) {
            return res.status(500).json({
                err_code: 1,
                message: `读取数据失败：${err.message}`
            })
        }
        // exReturn: [{value: 1, text: '金色'}, {value: 2, text: '红色'}]
        if (data) {
            for (let i = 0; i < data.length; i++) {
                const value = data[i]["_id"]
                const text = data[i][strTextField]
                data[i] = {value, text}
            }
        }
        return res.status(200).json({
            err_code: 0,
            message: "请求成功",
            data
        })
    })
}

exports.dbQueryListCountSync = async (model, objFilter) => {
    objFilter = filterObjValue(objFilter)
    return await model.countDocuments(objFilter).exec()
}

exports.dbQueryListSync = async (req, res, model, perPageCount = 0, objFilter = {}, stringRequiredFields = "", populateArr = "") => {
    objFilter = filterObjValue(objFilter)
    let intCurrentPageCount = funcCurrentPage(req)
    return await model.find(objFilter, stringRequiredFields).populate(populateArr).skip(((intCurrentPageCount === 0 ? 1 : intCurrentPageCount) - 1) * perPageCount).limit(intCurrentPageCount === 0 ? 0 : perPageCount).exec()
}

exports.dbQuerySingleSync = async (model, objFilter) => {
    objFilter = filterObjValue(objFilter)
    return await model.findOne(objFilter).exec()
}

exports.dbUpdateById = (req, res, model, objFilter, objUpdateData) => {
    objFilter = filterObjValue(objFilter)
    objUpdateData = filterObjValue(objUpdateData)
    model.findByIdAndUpdate(objFilter, objUpdateData, {}, (err, data) => {
        if (err) {
            return res.status(500).json({
                err_code: 1,
                message: `更新失败：${err.message}`
            })
        }
        return res.status(200).json({
            err_code: 0,
            message: "更新成功"
        })
    });
}

exports.dbUpdateUniqueById = (req, res, model, _id, objFilter, objUpdateData) => {
    objFilter = filterObjValue(objFilter)
    // check if there is any other data except this data that with ${_id}
    model.findOne({_id: {$ne: _id}, ...objFilter}, (err, data) => {
        if (err) {
            return res.status(500).json({
                err_code: 1,
                message: `提交失败：${err.message}`
            })
        }
        if (data) {
            return res.status(200).json({
                err_code: 2,
                message: `${objectToString(objFilter)}已存在`
            })
        }
        this.dbUpdateById(req, res, model, {_id: _id}, objUpdateData)
    })
}

exports.dbUpdateCountSync = async (model, _id, strField, action = 0, count = 1) => {

    // model.findOneAndUpdate({_id}, {$inc: {total: 1}}, function (err) {
    //     if (err) return console.log(err);
    //     res.json({status: 'ok', msg: '发布成功'})
    // })
    let data = await model.findOne({_id}).exec()
    if (!data) throw {message: '数据不存在'}
    // 0: +, 1: -
    switch (action) {
        case 0:
            data[strField] += count
            break
        case 1:
            if (data[strField] - count < 0) throw {
                myCode: 1,
                message: `${model}下的${data['_id']}更新失败。库存数量不足。剩余数量: ${data[strField]}，所需数量: ${count}。`
            }
            data[strField] -= count
            break
        default:
            break
    }
    data.save()
    return data
}

exports.dbDeleteById = (req, res, model, arrFilter) => {
    model.deleteMany({_id: {$in: arrFilter}}, (err, data) => {
        if (err) {
            return res.status(500).json({
                err_code: 1,
                message: `删除失败：${err.message}`
            })
        }
        return res.status(200).json({
            err_code: 0,
            message: "删除成功",
            // data
        })
    });
}
