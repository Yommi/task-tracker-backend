const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const Task = require('../models/taskModel');
const authController = require('./authController');

const filterObj = (obj, ...unWantedProps) => {
  const newObj = {};

  Object.keys(obj).forEach((el) => {
    if (!unWantedProps.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};
exports.filterObj = filterObj;

exports.getAll = (model) => {
  return catchAsync(async (req, res, next) => {
    const docs = await model.find();

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: docs,
    });
  });
};

exports.getOne = (model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await model.findById(req.params.id);

    if (!doc) {
      return next(new AppError('There is no document with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });
};

exports.createOne = (model) => {
  return catchAsync(async (req, res, next) => {
    if (model === User) {
      const newBody = filterObj(req.body, 'role');
      const doc = await model.create(newBody);

      authController.createSendToken(doc, 201, res);
    } else if (model === Task) {
      const doc = await model.create(req.body);

      const user = await User.findById(req.user._id);
      user.tasks.push(doc._id);
      await user.save({ validateBeforeSave: false });

      res.status(200).json({
        status: 'success',
        data: doc,
      });
    }
  });
};

exports.updateOne = (model) => {
  return catchAsync(async (req, res, next) => {
    if (model === User) {
      const newBody = filterObj(
        req.body,
        'role',
        'password',
        'passwordConfirm',
      );

      const doc = await model.findByIdAndUpdate(req.params.id, newBody, {
        new: true,
        runValidators: true,
      });

      if (!doc) {
        return next(
          new AppError('There is no document with that id', 404),
        );
      }

      authController.createSendToken(doc, 200, res);
    } else if (model === Task) {
      const newBody = filterObj(req.body, 'timeToFinish');
      const doc = await model.findByIdAndUpdate(req.params.id, newBody, {
        new: true,
        runValidators: true,
      });

      if (!doc) {
        return next(
          new AppError('There is no document with that id', 404),
        );
      }

      res.status(200).json({
        status: 'success',
        data: doc,
      });
    }
  });
};

exports.deleteOne = (model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('There is no document with that id', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
};
