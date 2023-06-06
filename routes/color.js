const express = require('express');
const router = express.Router();
const { ColorModel } = require('../db/db_models');
const {
  validateRequiredQueryParameters,
  authenticateJWT,
} = require('../functions/validate');
const {
  dbQueryList,
  dbAddUnique,
  dbUpdateUniqueById,
  dbQueryOptions,
  dbUpdateManyById,
} = require('../functions/db_func');

/**
 * err_code:
 *  0: no error
 *  1: server error
 *  2: user error
 */

router.get('/query', authenticateJWT, (req, res) => {
  let objFilter = {};
  try {
    objFilter = validateRequiredQueryParameters(req, res, {
      _id: {
        type: 'String',
        isRequired: false,
        str: '颜色id',
      },
    });
  } catch (err) {
    return res.status(500).json({
      err_code: 1,
      message: `${err}`,
    });
  }
  dbQueryList(req, res, ColorModel, 10, objFilter);
});

router.get('/query_color_options', authenticateJWT, (req, res) => {
  try {
    validateRequiredQueryParameters(req, res, {});
  } catch (err) {
    return res.status(500).json({
      err_code: 1,
      message: `${err}`,
    });
  }
  dbQueryOptions(req, res, ColorModel, {}, 'color');
});

router.get('/add', authenticateJWT, async (req, res) => {
  let objFilter = {};
  try {
    objFilter = validateRequiredQueryParameters(req, res, {
      color: {
        type: 'String',
        isRequired: true,
        str: '颜色',
      },
    });
  } catch (err) {
    return res.status(500).json({
      err_code: 1,
      message: `${err}`,
    });
  }
  await dbAddUnique(
    req,
    res,
    ColorModel,
    { color: objFilter.color },
    { color: objFilter.color }
  );
});

router.get('/update', authenticateJWT, (req, res) => {
  let objFilter = {};
  try {
    objFilter = validateRequiredQueryParameters(req, res, {
      _id: {
        type: 'String',
        isRequired: true,
        str: '颜色id',
      },
      color: {
        type: 'String',
        isRequired: true,
        str: '颜色',
      },
    });
  } catch (err) {
    return res.status(500).json({
      err_code: 1,
      message: `${err}`,
    });
  }
  dbUpdateUniqueById(
    req,
    res,
    ColorModel,
    objFilter._id,
    { color: objFilter.color },
    { color: objFilter.color }
  );
});

router.get('/delete', authenticateJWT, async (req, res) => {
  let objParameters = {};
  try {
    objParameters = validateRequiredQueryParameters(req, res, {
      _id: {
        type: 'StringArray',
        isRequired: true,
        str: '颜色id',
      },
    });
  } catch (err) {
    return res.status(500).json({
      err_code: 1,
      message: `${err}`,
    });
  }
  // const session = await ColorModel.startSession()
  // await session.withTransaction(async () => {
  //     // update productSub color to undefined
  //     // await ProductModel.updateMany({colorRef: {$in: objParameters._id}}, {$set: {colorRef: undefinedColorId}}, {session})
  //     // delete
  //     const deleteRes = await ColorModel.updateMany({_id: {$in: objParameters._id}}, {$set: {isDeleted: true}}, {session})
  //     return res.status(200).json({
  //         err_code: 0,
  //         message: `成功删除${deleteRes.deletedCount}条数据。`
  //     })
  // }).catch((err) => {
  //     return res.status(500).json({
  //         err_code: 1,
  //         message: `删除失败：${err.message}`
  //     })
  // })
  await dbUpdateManyById(req, res, ColorModel, objParameters, {
    $set: { isDeleted: true },
  });
});

router.get('/restore', authenticateJWT, async (req, res) => {
  let objParameters = {};
  try {
    objParameters = validateRequiredQueryParameters(req, res, {
      _id: {
        type: 'StringArray',
        isRequired: true,
        str: '颜色id',
      },
    });
  } catch (err) {
    return res.status(500).json({
      err_code: 1,
      message: `${err}`,
    });
  }
  await dbUpdateManyById(req, res, ColorModel, objParameters, {
    $set: { isDeleted: false },
  });
});

router.get('/update_delete_marker', authenticateJWT, async (req, res) => {
  let objParameters = {};
  try {
    objParameters = validateRequiredQueryParameters(req, res, {
      _id: {
        type: 'StringArray',
        isRequired: true,
        str: '颜色id',
      },
      // 0: false, 1: true
      action: {
        type: 'Number',
        isRequired: true,
        str: '操作',
      },
    });
  } catch (err) {
    return res.status(500).json({
      err_code: 1,
      message: `${err}`,
    });
  }
  await dbUpdateManyById(req, res, ColorModel, objParameters, {
    $set: { isDeleted: objParameters.action !== 1 },
  });
});

module.exports = router;
