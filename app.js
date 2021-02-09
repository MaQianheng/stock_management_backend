let bodyParser = require('body-parser');

let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');

let indexRouter = require('./routes/index');
let dashboardRouter = require('./routes/dashboard');
// let sellRouter = require('./routes/sell');
// let purchaseRouter = require('./routes/purchase');
// let historyRouter = require('./routes/history');
let supplierRouter = require('./routes/supplier');
let customerRouter = require('./routes/customer');
let productRouter = require('./routes/product');
let warehouseRouter = require('./routes/warehouse');
let shelfRouter = require('./routes/shelf');
let colorRouter = require('./routes/color');
let usersRouter = require('./routes/users');
let saleRouter = require('./routes/sale');
let driverRouter = require('./routes/driver')
let driverAccounting = require('./routes/driverAccounting')

let testRouter = require('./routes/test')

let app = express();

app.all("*", function (req, res, next) {
    //设置允许跨域的域名，*代表允许任意域名跨域
    // res.header("Access-Control-Allow-Origin", "http://127.0.0.1:3000");
    res.header("Access-Control-Allow-Origin", "*");
    //允许的header类型
    res.header("Access-Control-Allow-Headers", "content-type");
    //跨域允许的请求方式
    res.header("Access-Control-Allow-Methods", "DELETE,PUT,POST,GET,OPTIONS");
    if (req.method.toLowerCase() === 'options')
        res.sendStatus(200);  //让options尝试请求快速结束
    else
        next();
})

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({extended: false}));

app.use('/', indexRouter);
app.use('/dashboard', dashboardRouter);
// app.use('/sell', sellRouter);
app.use('/sale', saleRouter);
// app.use('/history', historyRouter);
app.use('/supplier', supplierRouter);
app.use('/customer', customerRouter);
app.use('/product', productRouter);
app.use('/warehouse', warehouseRouter);
app.use('/shelf', shelfRouter);
app.use('/color', colorRouter);
app.use('/users', usersRouter);
app.use('/driver', driverRouter);
app.use('/driver_accounting', driverAccounting);

app.use('/test', testRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    return res.status(404).json({
        err_code: 2,
        message: "该路径不存在"
    })
    // next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
