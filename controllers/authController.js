const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const factoryController = require('./factoryController');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);

  user.password = undefined;

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600000,
  });

  res.status(statusCode).json({
    status: 'success',
    data: {
      user,
      token,
    },
  });
};
exports.createSendToken = createSendToken;

exports.signUp = catchAsync(async (req, res, next) => {
  const filteredBody = factoryController.filterObj(req.body, 'role');
  const user = await User.create(filteredBody);

  user.password = undefined;
  createSendToken(user, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Invalid email or password!', 400));
  }

  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError(
        'You are not logged in! Please login to get access',
        401,
      ),
    );
  }

  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET,
  );

  const currentUser = await User.findById(decoded.id).select('+password');

  if (!currentUser) {
    return next(
      'The user attached to this token no longer exists, Please login again!',
      401,
    );
  }

  if (currentUser.checkIfPasswordChanged(decoded.iat)) {
    return next(
      new AppError(
        'This user has changed their password since token issuance. Please login agin!',
        401,
      ),
    );
  }

  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "You don't have permission to perform this action",
          403,
        ),
      );
    }

    next();
  };
};
