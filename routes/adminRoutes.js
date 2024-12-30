const express = require('express');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.restrictTo('admin'));

router.route('/').post(
  catchAsync(async (req, res, next) => {
    req.body.role = 'admin';
    const admin = await User.create(req.body);

    authController.createSendToken(admin, 201, res);
  }),
);

module.exports = router;
