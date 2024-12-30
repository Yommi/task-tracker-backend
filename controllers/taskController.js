const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factoryController = require('./factoryController');
const authController = require('./authController');
const Task = require('../models/taskModel');
const User = require('../models/userModel');

exports.getAllTasks = factoryController.getAll(Task);
exports.getTask = factoryController.getOne(Task);
exports.createTask = factoryController.createOne(Task);
exports.updateTask = factoryController.updateOne(Task);
exports.deleteTask = factoryController.deleteOne(Task);

exports.getAllMyTasks = catchAsync(async (req, res, next) => {
  const { sort, priority, status } = req.query;
  const filter = { owner: req.user._id };

  if (priority) filter.priority = priority;
  if (status !== undefined && status !== '')
    filter.taskStatus = status === 'true';

  // Sorting options
  let sortOption = {};
  if (sort && sort !== '') {
    switch (sort) {
      case 'startTimeAsc':
        sortOption.startTime = 1;
        break;
      case 'startTimeDesc':
        sortOption.startTime = -1;
        break;
      case 'endTimeAsc':
        sortOption.endTime = 1;
        break;
      case 'endTimeDesc':
        sortOption.endTime = -1;
        break;
      default:
        sortOption = {};
    }
  } else {
    sortOption = { createdAt: -1 };
  }

  const tasks = await Task.find(filter).sort(sortOption);

  res.status(200).json({
    status: 'success',
    results: tasks.length,
    data: tasks,
  });
});

exports.createMyTask = catchAsync(async (req, res, next) => {
  const newBody = factoryController.filterObj(req.body, 'owner');
  newBody.owner = req.user._id;

  const task = await Task.create(newBody);

  const user = await User.findById(req.user._id);
  user.tasks.push(task._id);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: task,
  });
});

exports.updateMyTask = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user.tasks.includes(req.params.taskId)) {
    return next(
      new AppError('You cannot update tasks that dont belong to you', 400),
    );
  }

  const newBody = factoryController.filterObj(
    req.body,
    'owner',
    'timeToFinish',
  );

  const task = await Task.findByIdAndUpdate(req.params.taskId, newBody, {
    new: true,
    runValidators: true,
  });

  await task.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: task,
  });
});

exports.deleteMyTask = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user.tasks.includes(req.params.taskId)) {
    return next(
      new AppError('You cannot delete tasks that dont belong to you', 400),
    );
  }

  const task = await Task.findByIdAndDelete(req.params.taskId);

  user.tasks.pull(req.params.taskId);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: null,
  });
});

exports.deleteSelected = catchAsync(async (req, res, next) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return next(new AppError('Invalid or empty array of IDs', 404));
  }

  const user = await User.findById(req.user._id);
  const invalidIds = ids.filter((id) => !user.tasks.includes(id));

  if (invalidIds.length > 0) {
    return next(
      new AppError(
        `You cannot delete tasks that don't belong to you: ${invalidIds.join(', ')}`,
        400,
      ),
    );
  }

  const result = await Task.deleteMany({ _id: { $in: ids } });

  if (result.deletedCount === 0) {
    return next(new AppError('No tasks found with provided IDs', 404));
  }

  user.tasks = user.tasks.filter(
    (taskId) => !ids.includes(taskId.toString()),
  );
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: { deletedCount: result.deletedCount },
  });
});

exports.getDashboardSummary = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const summary = await Task.aggregate([
    { $match: { owner: userId } },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        tasksCompleted: { $sum: { $cond: ['$taskStatus', 1, 0] } },
        totalTimeLapsed: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $not: ['$taskStatus'] },
                  { $gte: [new Date(), '$startTime'] },
                ],
              }, 
              {
                $divide: [
                  { $subtract: [new Date(), '$startTime'] },
                  1000 * 60 * 60,
                ],
              },
              0, 
            ],
          },
        },
        averageCompletionTime: {
          $avg: {
            $cond: [
              '$taskStatus',
              {
                $divide: [
                  { $subtract: ['$endTime', '$startTime'] },
                  1000 * 60 * 60,
                ],
              },
              null,
            ],
          },
        },
      },
    },
  ]);

  const summaryData = summary[0] || {
    totalTasks: 0,
    tasksCompleted: 0,
    totalTimeLapsed: 0,
    averageCompletionTime: 'N/A',
  };
  summaryData.tasksPending =
    summaryData.totalTasks - summaryData.tasksCompleted;

  const tableSummary = await Task.aggregate([
    { $match: { owner: userId, taskStatus: false } },
    {
      $group: {
        _id: '$priority',
        pendingTasks: { $sum: 1 },
        timeLapsed: {
          $sum: {
            $cond: [
              { $gte: [new Date(), '$startTime'] },
              {
                $divide: [
                  { $subtract: [new Date(), '$startTime'] },
                  1000 * 60 * 60,
                ],
              },
              0,
            ],
          },
        },
        timeToFinish: {
          $sum: {
            $divide: [
              { $subtract: ['$endTime', '$startTime'] },
              1000 * 60 * 60,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        priority: '$_id',
        pendingTasks: 1,
        timeLapsed: { $round: ['$timeLapsed', 2] },
        timeToFinish: { $round: ['$timeToFinish', 2] },
      },
    },
    { $sort: { priority: 1 } },
  ]);

  const totalPendingTasks = tableSummary.reduce(
    (sum, item) => sum + item.pendingTasks,
    0,
  );

  const totalTimeToFinish = tableSummary.reduce(
    (sum, item) => sum + item.timeToFinish,
    0,
  );

  const completeTable = [1, 2, 3, 4, 5].map((priority) => {
    const row = tableSummary.find((r) => r.priority === priority) || {
      priority,
      pendingTasks: 0,
      timeLapsed: 0,
      timeToFinish: 0,
    };
    return row;
  });

  res.status(200).json({
    status: 'success',
    data: {
      summary: {
        totalTasks: summaryData.totalTasks,
        tasksCompleted: summaryData.tasksCompleted,
        tasksPending: summaryData.tasksPending,
        averageCompletionTime:
          typeof summaryData.averageCompletionTime === 'number'
            ? summaryData.averageCompletionTime.toFixed(2)
            : 'N/A',
        totalTimeLapsed: summaryData.totalTimeLapsed.toFixed(2),
      },
      tableSummary: completeTable,
      totalPendingTasks,
      totalTimeToFinish: totalTimeToFinish.toFixed(2), 
    },
  });
});
