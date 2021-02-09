const express = require('express');
const router = express.Router();

/**
 * err_code:
 *  0: no error
 *  1: server error
 *  2: user error
 */

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
