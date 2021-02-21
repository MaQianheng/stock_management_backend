const mongoose = require('mongoose')

mongoose.set('useUnifiedTopology', true)
mongoose.set('useFindAndModify', false)
mongoose.connect('mongodb://localhost:27017/stock_management', {
    useNewUrlParser: true,
    retryWrites: true
}, (err) => {
    if (err) console.log(err)
})

const undefinedColorId = mongoose.Types.ObjectId('601748d2c814381929e89fa4')
const undefinedWarehouseId = mongoose.Types.ObjectId('601749f9c814381929e89fa5')
const undefinedShelfId = mongoose.Types.ObjectId('60174a20c814381929e89fa6')
const undefinedProductId = mongoose.Types.ObjectId('6017565dc814381929e89fa7')
const undefinedProductSubId = mongoose.Types.ObjectId('601b6ff343394661fdb6996b')
const undefinedCustomerId = mongoose.Types.ObjectId('60175666c814381929e89fa8')
const undefinedSupplierId = mongoose.Types.ObjectId('6017566fc814381929e89fa9')
const undefinedDriverId = mongoose.Types.ObjectId('60175675c814381929e89faa')
const undefinedUserId = mongoose.Types.ObjectId('6017567ac814381929e89fab')
const undefinedSaleId = mongoose.Types.ObjectId('601b710943394661fdb6996c')
const undefinedOrderId = mongoose.Types.ObjectId('601b710e43394661fdb6996d')

const mongoDB = mongoose.connection;
mongoDB.on('error', console.error.bind(console, 'connection error:'));
mongoDB.once('open', function () {
    UserModel.findOne({
        _id: undefinedUserId
    }, (err, data) => {
        if (err) console.log(err)
        if (!data) {
            UserModel({
                _id: undefinedUserId,
                username: 'deleted',
                password: 'deleted',
                name: '已删除用户',
                level: 5
            }).save((err, data) => {
                if (err) console.log(err)
                if (data) console.log(data)
            })
        }
    })

    ColorModel.findOne({_id: undefinedColorId}, (err, data) => {
        if (err) console.log(err)
        if (!data) {
            ColorModel({
                _id: undefinedColorId,
                color: '已删除颜色',
                relatedProductCount: 1
            }).save((err, data) => {
                if (err) console.log(err)
                if (data) console.log(data)
            })
        }
    })

    DriverModel.findOne({_id: undefinedDriverId}, (err, data) => {
        if (err) console.log(err)
        if (!data) {
            DriverModel({
                _id: undefinedDriverId,
                name: '已删除司机',
                phone: "0",
                plate: '0',
                toBePaid: 0,
            }).save((err, data) => {
                if (err) console.log(err)
                if (data) console.log(data)
            })
        }
    })

    CustomerModel.findOne({_id: undefinedCustomerId}, (err, data) => {
        if (err) console.log(err)
        if (!data) {
            CustomerModel({
                _id: undefinedCustomerId,
                name: '已删除客户'
            }).save((err, data) => {
                if (err) console.log(err)
                if (data) console.log(data)
            })
        }
    })

    WarehouseModel.findOne({_id: undefinedWarehouseId}, (err, data) => {
        if (err) console.log(err)
        if (!data) {
            WarehouseModel({
                _id: undefinedWarehouseId,
                warehouse: '已删除库房',
                relatedShelfCount: 1
            }).save((err, data) => {
                if (err) console.log(err)
                if (data) console.log(data)
            })
        }
    })

    ShelfModel.findOne({_id: undefinedShelfId}, (err, data) => {
        if (err) console.log(err)
        if (!data) {
            ShelfModel({
                _id: undefinedShelfId,
                warehouseRef: undefinedWarehouseId,
                shelf: '已删除货架'
            }).save((err, data) => {
                if (err) console.log(err)
                if (data) console.log(data)
            })
        }
    })

    ProductModel.findOne({_id: undefinedProductId}, (err, data) => {
        if (err) console.log(err)
        if (!data) {
            ProductModel({
                _id: undefinedProductId,
                code: '已删除货号',
                name: '已删除商品',
                colorRef: undefinedColorId,
                price: 0,
                remark: '无备注'
            }).save((err, data) => {
                if (err) console.log(err)
                if (data) console.log(data)
            })
        }
    })

    ProductSubModel.findOne({_id: undefinedProductSubId}, (err, data) => {
        if (err) console.log(err)
        if (!data) {
            ProductSubModel({
                _id: undefinedProductSubId,
                productRef: undefinedProductId,
                shelfRef: undefinedShelfId,
                remainingWeight: 0,
                soldWeight: 0
            }).save((err, data) => {
                if (err) console.log(err)
                if (data) console.log(data)
            })
        }
    })

    SupplierModel.findOne({_id: undefinedSupplierId}, (err, data) => {
        if (err) console.log(err)
        if (!data) {
            SupplierModel({
                _id: undefinedSupplierId,
                supplierName: '已删除供应商',
                name: '已删除供应商联系人'
            }).save((err, data) => {
                if (err) console.log(err)
                if (data) console.log(data)
            })
        }
    })

    SaleModel.findOne({_id: undefinedSaleId}, (err, data) => {
        if (err) console.log(err)
        if (!data) {
            SaleModel({
                _id: undefinedSaleId,
                action: 0,
                operatorRef: undefinedUserId,
                customerRef: undefinedCustomerId,
                supplierRef: undefinedSupplierId,
                driverRef: undefinedDriverId,
            }).save((err, data) => {
                if (err) console.log(err)
                if (data) console.log(data)
            })
        }
    })

    OrderModel.findOne({_id: undefinedOrderId}, (err, data) => {
        if (err) console.log(err)
        if (!data) {
            OrderModel({
                _id: undefinedOrderId,
                saleRef: undefinedSaleId,
                productSubRef: undefinedProductSubId,
                operateWeight: 0,
            }).save((err, data) => {
                if (err) console.log(err)
                if (data) console.log(data)
            })
        }
    })

});

const UserModel = mongoose.model('user', mongoose.Schema({
    username: {type: String, required: true},
    password: {type: String, required: true},
    name: {type: String, required: true},
    level: {type: Number, required: true}
}))

const ColorModel = mongoose.model('color', mongoose.Schema({
    color: {type: String, required: true},
    relatedProductCount: {type: Number, required: true, default: 0}
}))

const DriverModel = mongoose.model('driver', mongoose.Schema({
    name: {type: String, required: true},
    phone: {type: String, required: false, default: '无'},
    plate: {type: String, required: false, default: '无'},
    toBePaid: {type: Number, required: true, default: 0}
}))

const DriverAccountingModel = mongoose.model('driverAccount', mongoose.Schema({
    createdTimeStamp: {type: Number, required: true, default: Date.now()},
    driverRef: {type: mongoose.Schema.ObjectId, ref: 'driver', required: true},
    // 0: +, 1: -
    action: {type: Number, required: true, enum: [0, 1]},
    price: {type: Number, required: true}
}))

const CustomerModel = mongoose.model('customer', mongoose.Schema({
    name: {type: String, required: true},
    remark: {type: String, required: false, default: '无备注'}
}))

const DashboardModel = mongoose.model('dashboard', mongoose.Schema({}))

const SaleModel = mongoose.model('sale', mongoose.Schema({
    createdTimeStamp: {type: Number, required: true, default: Date.now()},
    // 0: in, 1: out
    action: {type: Number, required: true, enum: [0, 1]},
    operatorRef: {type: mongoose.Schema.ObjectId, ref: 'user', required: true},
    customerRef: {type: mongoose.Schema.ObjectId, ref: 'customer', required: false},
    supplierRef: {type: mongoose.Schema.ObjectId, ref: 'supplier', required: false},
    driverRef: {type: mongoose.Schema.ObjectId, ref: 'driver', required: false},
    deliveryFee: {type: Number, required: false}
}))

const OrderModel = mongoose.model('order', mongoose.Schema({
    saleRef: {type: mongoose.Schema.ObjectId, ref: "sale", required: true},
    productSubRef: {type: mongoose.Schema.ObjectId, ref: "productSub", required: true},
    oriWeight: {type: Number, required: true, default: 0},
    operateWeight: {type: Number, required: true},
    price: {type: Number, required: true, default: 0}
}))

const WarehouseModel = mongoose.model('warehouse', mongoose.Schema({
    warehouse: {type: String, required: true},
    relatedShelfCount: {type: Number, required: true, default: 0}
}))

const ShelfModel = mongoose.model('shelf', mongoose.Schema({
    warehouseRef: {type: mongoose.Schema.ObjectId, ref: 'warehouse', required: true},
    shelf: {type: String, required: true},
    relatedProductCount: {type: Number, required: true, default: 0}
}))

const ProductModel = mongoose.model('product', mongoose.Schema({
    code: {type: String, required: true, unique: true},
    name: {type: String, required: true},
    colorRef: {type: mongoose.Schema.ObjectId, ref: 'color', required: true},
    price: {type: Number, required: false, default: 0},
    imageURLs: {type: Array, required: false},
    remark: {type: String, required: false, default: '无备注'}
}))

const ProductSubModel = mongoose.model('productSub', mongoose.Schema({
    productRef: {type: mongoose.Schema.ObjectId, ref: 'product', required: true},
    shelfRef: {type: mongoose.Schema.ObjectId, ref: 'shelf', required: true},
    remainingWeight: {type: Number, required: true, default: 0},
    soldWeight: {type: Number, required: false, default: 0}
}))

const SupplierModel = mongoose.model('supplier', mongoose.Schema({
    supplierName: {type: String, required: true},
    name: {type: String, required: true},
    phone: {type: String, required: false},
    remark: {type: String, required: false, default: '无备注'}
}))

const TestModel = mongoose.model('test', mongoose.Schema({
    username: {type: String, required: false},
    password: {type: String, required: false},
    name: {type: String, required: false}
}))

exports.UserModel = UserModel
exports.ColorModel = ColorModel
exports.CustomerModel = CustomerModel
exports.DashboardModel = DashboardModel
exports.SaleModel = SaleModel
exports.OrderModel = OrderModel
exports.WarehouseModel = WarehouseModel
exports.ShelfModel = ShelfModel
exports.ProductModel = ProductModel
exports.ProductSubModel = ProductSubModel
exports.SupplierModel = SupplierModel
exports.DriverModel = DriverModel
exports.DriverAccountingModel = DriverAccountingModel

exports.undefinedColorId = undefinedColorId
exports.undefinedWarehouseId = undefinedWarehouseId
exports.undefinedShelfId = undefinedShelfId
exports.undefinedProductId = undefinedProductId
exports.undefinedCustomerId = undefinedCustomerId
exports.undefinedSupplierId = undefinedSupplierId
exports.undefinedDriverId = undefinedDriverId
exports.undefinedUserId = undefinedUserId
exports.undefinedSaleId = undefinedSaleId

exports.TestModel = TestModel
