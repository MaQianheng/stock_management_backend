const express = require('express');
const router = express.Router();
const mongoose = require('mongoose')
const {OrderModel} = require("../db/db_models");
const {SaleModel} = require("../db/db_models");
const {ProductSubModel} = require("../db/db_models");
const {ShelfModel} = require("../db/db_models");
const {ColorModel} = require("../db/db_models");
const {ProductModel} = require("../db/db_models");
const {DriverModel} = require("../db/db_models");
const {SupplierModel} = require("../db/db_models");
const {CustomerModel} = require("../db/db_models");

const {validateRequiredQueryParameters} = require("../functions/validate");
const {TestModel} = require('../db/db_models')

router.get('/test', async (req, res) => {
    // 找不到并不会添加
    // let data = await TestModel.findByIdAndUpdate('600bcaafb925091908fd6a5c', {username: '234', password: '24rff'}).exec()
    // console.log(data)

    // 从前端传来字符串转为object类
    // let {product, isValid} = validateRequiredQueryParameters(req, res, {
    //     product: 'Object'
    // })
    // if (!isValid) return
    // res.status(200).json({
    //     err: 0,
    //     data: product
    // })

    // const shelfRef = ['601b62a5234f3057edbc105e', '601b62a9234f3057edbc105f', '601b62b0234f3057edbc1060', '601b62b3234f3057edbc1061']
    // let arr = await ProductSubModel.find({shelfRef}, {_id: 0, productRef: 1})
    // const arrId = []
    // for (let i = 0; i < arr.length; i++) {
    //     let {productRef} = arr[i]
    //     if (arrId.indexOf(String(productRef)) === -1) arrId.push(String(productRef))
    // }
    // console.log(arrId)

    let doc = await OrderModel.aggregate([
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
            $match: {
                saleRef: {$ne: mongoose.Types.ObjectId('601b710943394661fdb6996c')}
                // saleRef: {$in: [mongoose.Types.ObjectId('601b710943394661fdb6996c'), mongoose.Types.ObjectId('601b73bc86d4ff626162a153')]},
                // productSub: {productRef: {$in: [mongoose.Types.ObjectId('6017565dc814381929e89fa7')]}}
                // 'productSub.productRef': {$in: [mongoose.Types.ObjectId('6017565dc814381929e89fa7')]}
            }
            // $match: {saleRef: mongoose.Types.ObjectId('601b710943394661fdb6996c')}
        },
        // {$group: {_id: '$saleRef', arrOrderId: {$push: "$_id"}}},
        // {
        //     $skip: ((intCurrentPageCount === 0 ? 1 : intCurrentPageCount) - 1) * 10
        // },
        // {
        //     $limit: 10
        // }
        // {$group: {_id: '$saleRef', count: {$sum: 1},}}
        // {
        //     $match: {sale.operaterRef: mongoose.Types.ObjectId('5e6f15faeb57cc45bde81312')}
        // }
    ])
    return res.status(200).json({
        doc
    })
    /**
     {
        "productId1": {
            "undefined_1": {
                shelfId: "xxxx",
                weight: 200
            },
            "productSubId1": {
                shelfId: "xxxx",
                weight: 100
            }
        },
        "productId2": {
            "productSubId3": {
                shelfId: "xxxx",
                weight: 1200
            }
        }
    }
     */
})

router.get('/test400', async (req, res) => {
    TestModel({username: '111', password: '222'}).save((err, data) => {
        if (err) {
            return res.status(400).json({
                err_code: 0,
                message: err.message
            })
        }
        return res.status(200).json({
            err_code: 1,
            data
        })
    })
})

router.get('/session', async (req, res) => {

    const session = await mongoose.startSession();
    session.startTransaction();

// This `create()` is part of the transaction because of the `session`
// option.
    let flag = 0
    let isAborted = false
    for (let i = 0; i < 10; i++) {
        TestModel({username: '111' + i, password: 'ppp', name: '333'}).save({session: session}, async (err, data) => {
            if (err) {
                if (isAborted) return
                isAborted = true
                await session.abortTransaction()
                session.endSession()
                return res.status(500).json({
                    err_code: 0,
                    message: 'aborted'
                })
            }
            try {
                let a = parseInt(data.password)
                throw "ees"
            } catch (err) {
                if (isAborted) return
                isAborted = true
                await session.abortTransaction()
                session.endSession()
                return res.status(500).json({
                    err_code: 0,
                    message: 'aborted'
                })
            }
            // if (data.username === '1115') {
            //     if (isAborted) return
            //     isAborted = true
            //     await session.abortTransaction()
            //     session.endSession()
            //     return res.status(500).json({
            //         err_code: 1,
            //         message: 'aborted'
            //     })
            // }
            // if (data.username === '1116') {
            //     if (isAborted) return
            //     isAborted = true
            //     await session.abortTransaction()
            //     session.endSession()
            //     return res.status(500).json({
            //         err_code: 2,
            //         message: 'aborted'
            //     })
            // }
            if (data) {
                if (isAborted) return
                flag += 1
                if (flag === 10) {
                    await session.commitTransaction()
                    session.endSession()
                    return res.status(200).json({
                        err_code: 0,
                        message: 'suc'
                    })
                }
            }
        })
    }
    // await TestModel.create([{name: 'Test'}], {session: session});

// Transactions execute in isolation, so unless you pass a `session`
// to `findOne()` you won't see the document until the transaction
// is committed.
    // let doc = await TestModel.findOne({name: 'Test'});

// This `findOne()` will return the doc, because passing the `session`
// means this `findOne()` will run as part of the transaction.
//     let doc = await TestModel.findOne({name: 'Test'}, {}, {session: session});
//     if (doc) {
//         await session.abortTransaction()
//         return res.status(200).json({
//             err_code: 0,
//             message: 'aborted'
//         })
//     }

// Once the transaction is committed, the write operation becomes
// visible outside of the transaction.
})

router.get('/with_transaction', async (req, res) => {
    const session = await TestModel.startSession()
    await session.withTransaction(async () => {
        let doc = await TestModel({username: '111', password: '222', name: '333'}).save({session})
        if (doc.username === "111") {
            throw 'Oops!'
        }
    }).catch((err) => {
        return res.status(500).json({
            err_code: 1,
            message: err
        })
    })
})

router.get('/delete_all', async (req, res) => {
    TestModel.deleteMany({}, {}, (err, data) => {
        if (err) {
            return res.status(500).json({
                err_code: 1,
                message: err.message
            })
        }
        return res.status(200).json({
            err_code: 0,
            data
        })
    })
})

router.get('/add_random_customer_data', (req, res) => {
    const arr = []
    for (let i = 0; i < 500; i++) {
        arr.push({name: generateRandomName()})
    }
    CustomerModel.collection.insertMany(arr, {}, (err, data) => {
        if (err) {
            return res.status(500).json({
                err
            })
        }
        return res.status(200).json({
            data
        })
    })
})

router.get('/add_random_supplier_data', (req, res) => {
    const arr = []
    for (let i = 0; i < 500; i++) {
        arr.push({
            supplierName: generateRandomCompanyName(),
            name: generateRandomName(),
            phone: generateRandomPhoneNumber()
        })
    }
    SupplierModel.collection.insertMany(arr, {}, (err, data) => {
        if (err) {
            return res.status(500).json({
                err
            })
        }
        return res.status(200).json({
            data
        })
    })
})

router.get('/add_random_driver_data', (req, res) => {
    const arr = []
    for (let i = 0; i < 500; i++) {
        arr.push({
            plate: generateRandomPlateNumber(),
            phone: generateRandomPhoneNumber(),
            name: generateRandomName()
        })
    }
    DriverModel.collection.insertMany(arr, {}, (err, data) => {
        if (err) {
            return res.status(500).json({
                err
            })
        }
        return res.status(200).json({
            data
        })
    })
})

router.get('/add_random_product_data', async (req, res) => {
    const arrData = []
    const objColorRefIncCount = {}
    for (let i = 0; i < 500; i++) {
        const colorRef = generateRandomColorRef()
        if (!(colorRef in objColorRefIncCount)) {
            objColorRefIncCount[colorRef] = 1
        } else {
            objColorRefIncCount[colorRef] += 1
        }
        arrData.push({
            name: '测试商品名称' + i,
            code: generateRandomProductCode(),
            colorRef: mongoose.Types.ObjectId(colorRef),
            price: generateRandomIntegerNumber(50, 100)
        })
    }
    let arrColorRef = Object.keys(objColorRefIncCount)
    for (let i = 0; i < arrColorRef.length; i++) {
        let colorRef = arrColorRef[i]
        await ColorModel.updateMany({_id: colorRef}, {$inc: {relatedProductCount: ++objColorRefIncCount[colorRef]}})
    }
    ProductModel.collection.insertMany(arrData, {}, (err, data) => {
        if (err) {
            return res.status(500).json({
                err
            })
        }
        return res.status(200).json({
            data
        })
    })
})

router.get('/update_random_product_data', async (req, res) => {
    const doc = await ProductModel.find({})
    console.log(doc.length)
    for (let i = 0; i < doc.length; i++) {
        doc[i].price = generateRandomIntegerNumber(30, 50)
        doc[i].save()
    }
    return res.status(200).json({
        err_code: 0,
        message: 'suc'
    })
})

function generateRandomIntegerNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function generateRandomProductCode() {
    const arrAlphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
    // AA0001
    return arrAlphabet[generateRandomIntegerNumber(0, arrAlphabet.length - 1)] + arrAlphabet[generateRandomIntegerNumber(0, arrAlphabet.length - 1)] + generateRandomIntegerNumber(0, 9) + generateRandomIntegerNumber(0, 9) + generateRandomIntegerNumber(0, 9) + generateRandomIntegerNumber(0, 9)
}

function generateRandomColorRef() {
    const arrColorId = ["6018bc26884f1e2ec5b54490", "6018bc29884f1e2ec5b54491", "6018bc2b884f1e2ec5b54492", "6018bc2d884f1e2ec5b54493", "6018bc31884f1e2ec5b54494", "601a8e9aa76e1952c1a1786f", "601a8e9fa76e1952c1a17870", "601a8ea4a76e1952c1a17871", "601a8eb0a76e1952c1a17872", "601a8eb3a76e1952c1a17873", "601a8ebca76e1952c1a17874", "601a8ec5a76e1952c1a17875", "601a8ecaa76e1952c1a17876", "601a8ecda76e1952c1a17877", "601a8ed0a76e1952c1a17878", "601a8edca76e1952c1a17879", "601a8ee7a76e1952c1a1787a", "601a8eeaa76e1952c1a1787b", "601a8eeea76e1952c1a1787c"]
    return arrColorId[generateRandomIntegerNumber(0, arrColorId.length - 1)]
}

function generateRandomShelfRef() {
    const arrShelfId = ["6018af3d87d02d2e67f30ab1", "6018b11e8c131e2e923dd250", "6018b1418c131e2e923dd251", "6018b1478c131e2e923dd252", "601a8f54a76e1952c1a1787f", "601a8f57a76e1952c1a17880", "601a8f5aa76e1952c1a17881", "601a8f5fa76e1952c1a17882", "601a8f64a76e1952c1a17883", "601a8f67a76e1952c1a17884", "601a8f6ba76e1952c1a17885"]
    return arrShelfId[generateRandomIntegerNumber(0, arrShelfId.length - 1)]
}

function generateRandomCompanyName() {
    const arrCompanyNameWord = ["炎", "垒", "炫", "友", "柳", "帝", "坤", "炬", "英", "翱", "凡", "游", "建", "设", "扩", "首", "姹", "艳", "昕", "冠", "雷", "丁", "珊", "时", "生", "旺", "涓", "长", "会", "星", "培", "若", "琪", "丙", "旭", "荣", "武", "兰", "翼", "莎", "放", "神", "邦", "石", "训", "袁", "馥", "愚", "宏", "岭", "卫", "鼎", "欢", "陵", "露", "桂", "赐", "霭", "奥", "产", "酿", "虹", "皓", "克", "校", "蔓", "楷", "典", "楷", "全", "宾", "稼", "湘", "程", "运", "倩", "琶", "瑟", "绍", "月", "钢", "莺", "随", "虎", "浒", "尹", "齐", "梦", "应", "乐", "帅", "奋", "殊", "廷", "莉", "郎", "幸", "亚", "野", "剑", "势", "芹", "崇", "鹃", "杜", "楚", "介", "图", "辉", "琏", "日", "悠", "协", "峰", "庄", "远", "胤", "顺", "丽", "位", "婀", "屏", "昶", "贤", "岳", "桐", "阳", "仪", "裕", "启", "碧", "演", "岩", "宽", "闻", "艳", "宁", "笙", "用", "晟", "臣", "任", "朋", "江", "珀", "娴", "郁", "恋", "逸", "吾", "色", "刚", "富", "爱", "毅", "瑭", "医", "仕", "达", "俭", "严", "烁", "行", "峰", "杰", "享", "菊", "偃", "祥", "福", "琮", "室", "定", "炮", "海", "彻", "渠", "宣", "佳", "影", "峻", "节", "书", "鑫", "琨", "报", "杏", "瑾", "梅", "默", "声", "淑", "养", "端", "端", "东", "媚", "廉", "晏", "庆", "华", "素", "舞", "梧", "先", "璇", "畏", "均", "况", "昆", "誉", "伦", "异", "椿", "倍", "铭", "璐", "尧", "圣", "岱", "溶", "相", "罗", "才", "厚", "辅", "林", "木", "团", "尚", "景", "情", "敬", "景", "美", "可", "效", "滨", "范", "镜", "无", "聪", "灿", "隆", "适", "新", "芙", "铜", "仁", "秋", "恩", "帆", "禄", "镝", "钦", "骜", "昂", "精", "产", "旭", "靖", "君", "世", "俟", "围", "嗣", "印", "喜", "博", "魄", "竞", "妹", "薇", "耕", "钗", "添", "译", "土", "鞠", "羚", "心", "捷", "赖", "学", "升", "池", "法", "公", "执", "良", "勇", "礼", "鹏", "涂", "存", "驰", "静", "和", "许", "瑶", "颂", "彩", "富", "彪", "三", "文", "秀", "康", "巍", "销", "山", "能", "翔", "旦", "本", "连", "盼", "高", "优", "渊", "冲", "诞", "绣", "起", "淋", "广", "骥", "吉", "信", "牡", "慧", "送", "光", "向", "炯", "明", "珂", "展", "悦", "举", "上", "进", "成", "成", "成", "成", "伟", "期", "美", "国", "明", "麟", "苡", "棉", "万", "宫", "霖", "承", "继", "承", "板", "仙", "纱", "岁", "玺", "谢", "珩", "欣", "谨", "魁", "姣", "旗", "嵬", "黛", "秀", "花", "琅", "乘", "安", "顺", "长", "瑕", "瑞", "朔", "恒", "曼", "甲", "炳", "行", "帆", "琛", "跃", "萱", "娜", "王", "银", "葆", "烈", "草", "飞", "翁", "莲", "环", "膳", "守", "有", "寅", "红", "永", "弘", "瑰", "迅", "蓉", "芬", "庞", "桃", "晓", "义", "业", "励", "宇", "胜", "萌", "延", "情", "目", "利", "双", "诗", "来", "龙", "香", "茂", "俞", "逢", "意", "伊", "曜", "盈", "颖", "舜", "上", "浩", "妍", "奇", "寿", "斐", "耀", "彤", "豫", "凇", "财", "菁", "兴", "雨", "妮", "钱", "菲", "秉", "硕", "鸳", "禅", "立", "迪", "引", "似", "灵", "津", "奇", "盛", "保", "李", "豪", "凤", "姗", "飙", "谷", "惠", "律", "念", "由", "佰", "渊", "敬", "兆", "婵", "精", "庵", "道", "雅", "敏", "娟", "美", "航", "烨", "瑛", "棠", "恺", "昌", "旺", "愉", "誓", "岸", "大", "悬", "育", "日", "衔", "同", "闯", "元", "锦", "佑", "璞", "逵", "驹", "骏", "正", "雪", "耀", "实", "京", "古", "余", "午", "彬", "兴", "莹", "诚", "森", "青", "界", "丰", "大", "丰"]

    const arrCompanyIndustry = ["食品", "证券", "科技", "医疗", "集团", "电信", "电子", "影业", "工业", "电气", "服饰", "化工", "公司", "建材", "工程", "团", "电器", "矿业", "药业", "连锁", "手机", "重工", "建设", "生物", "汽车"]
    let intCompanyNameLength = generateRandomIntegerNumber(2, 5)
    let strCompanyName = ""
    for (let i = 0; i < intCompanyNameLength; i++) {
        strCompanyName += arrCompanyNameWord[generateRandomIntegerNumber(0, arrCompanyNameWord.length - 1)]
    }
    let strCompanyIndustry = arrCompanyIndustry[generateRandomIntegerNumber(0, arrCompanyIndustry.length - 1)]
    return strCompanyName + strCompanyIndustry
}

function generateRandomName() {
    const firstWord = '赵钱孙李周吴郑王冯陈诸卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮齐康伍余元卜顾孟平黄和穆萧尹姚邵堪汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董粱杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯咎管卢莫经房裘干解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚'
    const secondWord = '明国华建文平志伟东海强晓生光林小民永杰军金健一忠洪江福祥中正振勇耀春大宁亮宇兴宝少剑云学仁涛瑞飞鹏安亚泽世汉达卫利胜敏群波成荣新峰刚家龙德庆斌辉良玉俊立浩天宏子松克清长嘉红山贤阳乐锋智青跃元武广思雄锦威启昌铭维义宗英凯鸿森超坚旭政传康继翔栋仲权奇礼楠炜友年震鑫雷兵万星骏伦绍麟雨行才希彦兆贵源有景升惠臣慧开章润高佳虎根远力进泉茂毅富博霖顺信凡豪树和恩向道川彬柏磊敬书鸣芳培全炳基冠晖京欣廷哲保秋君劲轩帆若连勋祖锡吉崇钧田石奕发洲彪钢运伯满庭申湘皓承梓雪孟其潮冰怀鲁裕翰征谦航士尧标洁城寿枫革纯风化逸腾岳银鹤琳显焕来心凤睿勤延凌昊西羽百捷定琦圣佩麒虹如靖日咏会久昕黎桂玮燕可越彤雁孝宪萌颖艺夏桐月瑜沛诚夫声冬奎扬双坤镇楚水铁喜之迪泰方同滨邦先聪朝善非恒晋汝丹为晨乃秀岩辰洋然厚灿卓杨钰兰怡灵淇美琪亦晶舒菁真涵爽雅爱依静棋宜男蔚芝菲露娜珊雯淑曼萍珠诗璇琴素梅玲蕾艳紫珍丽仪梦倩伊茜妍碧芬儿岚婷菊妮媛莲娟一'
    const firstMax = firstWord.length - 1
    const secondMax = secondWord.length - 1
    const nameLength = generateRandomIntegerNumber(2, 3)
    if (nameLength === 2) {
        return firstWord[generateRandomIntegerNumber(0, firstMax - 1)] + secondWord[generateRandomIntegerNumber(0, secondMax - 1)]
    } else {
        return firstWord[generateRandomIntegerNumber(0, firstMax - 1)] + secondWord[generateRandomIntegerNumber(0, secondMax - 1)] + secondWord[generateRandomIntegerNumber(0, secondMax - 1)]
    }
}

function generateRandomPhoneNumber() {
    const arrPhonePrefix = ["133", "149", "153", "173", "177", "180", "181", "189", "199", "130", "131", "132", "145", "155", "156", "166", "171", "175", "176", "185", "186", "166", "134", "135", "136", "137", "138", "139", "147", "150", "151", "152", "157", "158", "159", "172", "178", "182", "183", "184", "187", "188", "198", "170", "171"];
    const strPhonePrefix = arrPhonePrefix[generateRandomIntegerNumber(0, arrPhonePrefix.length - 1)]
    const strPhoneRest = String(generateRandomIntegerNumber(10000000, 99999999))
    return strPhonePrefix + strPhoneRest
}

function generateRandomPlateNumber() {
    const arrPlatePrefix = ["京A", "京C", "京E", "京F", "京H", "京G", "京B", "津A", "津B", "津C", "津E", "沪A", "沪B", "沪D", "沪C", "渝A", "渝B", "渝C", "渝G", "渝H", "冀A", "冀B", "冀C", "冀D", "冀E", "冀F", "冀G", "冀H", "冀J", "冀R", "冀T", "豫A", "豫B", "豫C", "豫D", "豫E", "豫F", "豫G", "豫H", "豫J", "豫K", "豫L", "豫M", "豫N", "豫P", "豫Q", "豫R", "豫S", "豫U", "云A", "云C", "云D", "云E", "云F", "云G", "云H", "云J", "云K", "云L", "云M", "云N", "云P", "云Q", "云R ", "云S", "辽A", "辽B", "辽C", "辽D", "辽E", "辽F", "辽G", "辽H", "辽J", "辽K", "辽L", "辽M", "辽N", "辽P", "辽V", "黑A", "黑B", "黑C", "黑D", "黑E", "黑F", "黑G", "黑H", "黑J", "黑K", "黑L", "黑M", "黑N", "黑P", "黑R", "湘A", "湘B", "湘C", "湘D", "湘E", "湘F", "湘G", "湘H", "湘J", "湘K", "湘L", "湘M", "湘N", "湘U", "湘S", "皖A", "皖B", "皖C", "皖D", "皖E", "皖F", "皖G", "皖H", "皖J", "皖K", "皖L", "皖M", "皖N", "皖P", "皖Q", "皖R", "皖S", "鲁A", "鲁B", "鲁C", "鲁D", "鲁E", "鲁F", "鲁G", "鲁H", "鲁J", "鲁K", "鲁L", "鲁M", "鲁N", "鲁P", "鲁Q", "鲁R", "鲁S", "鲁U", "鲁V", "鲁Y", "新A", "新B", "新C", "新D", "新E", "新F", "新G", "新H", "新J", "新K", "新L", "新M", "新N", "新P", "新Q", "新R", "苏A", "苏B", "苏C", "苏D", "苏E", "苏F", "苏G", "苏H", "苏J", "苏K", "苏L", "苏M", "苏N", "浙A", "浙B", "浙C", "浙D", "浙E", "浙F", "浙G", "浙H", "浙J", "浙K ", "浙L", "赣A", "赣B", "赣C", "赣D", "赣E", "赣F", "赣G", "赣H", "赣J", "赣K", "赣L", "赣M", "鄂A", "鄂B", "鄂C", "鄂D", "鄂E", "鄂F", "鄂G", "鄂H", "鄂J", "鄂K", "鄂L", "鄂M", "鄂N", "鄂P", "鄂Q", "鄂R", "鄂S", "桂A", "桂B", "桂C", "桂D", "桂E", "桂F", "桂G", "桂H", "桂J", "桂K", "桂L", "桂M", "桂N", "桂P", "桂R", "甘A", "甘B", "甘C", "甘D", "甘E", "甘F", "甘G", "甘H", "甘J", "甘K", "甘L", "甘M", "甘N", "甘P", "晋A", "晋B", "晋C", "晋D", "晋E", "晋F", "晋H", "晋J", "晋K", "晋L", "晋M", "蒙A", "蒙B", "蒙C", "蒙D", "蒙E", "蒙F", "蒙G", "蒙H", "蒙J", "蒙K", "蒙L", "蒙M", "陕A", "陕B", "陕C", "陕D", "陕E", "陕F", "陕G", "陕H", "陕J", "陕K", "陕U", "陕V", "吉A", "吉B", "吉C", "吉D", "吉E", "吉F", "吉G", "吉H", "吉J", "闽A", "闽B", "闽C", "闽D", "闽E", "闽F", "闽G", "闽H", "闽J", "闽K", "贵A", "贵B", "贵C", "贵D", "贵E", "贵F", "贵G", "贵H", "贵J", "粤A", "粤B", "粤C", "粤D", "粤E", "粤F", "粤G", "粤H", "粤J", "粤K", "粤L", "粤M", "粤N", "粤P", "粤Q", "粤R", "粤S", "粤T", "粤U", "粤V", "粤W", "粤X", "粤Y", "粤Z", "青A", "青B", "青C", "青D", "青E", "青F", "青G", "青H", "藏A", "藏B", "藏C", "藏D", "藏E", "藏F", "藏G", "藏H", "藏J", "川A", "川B", "川C", "川D", "川E", "川F", "川H", "川J", "川K", "川L", "川M", "川Q", "川R", "川S", "川T", "川U", "川V", "川W", "川X", "川Y", "川Z", "宁A", "宁B", "宁C", "宁D", "琼A", "琼B", "琼C", "琼D", "琼E"]
    // 10000-99999
    return arrPlatePrefix[generateRandomIntegerNumber(0, arrPlatePrefix.length - 1)] + String(generateRandomIntegerNumber(10000, 99999))
}

module.exports = router
