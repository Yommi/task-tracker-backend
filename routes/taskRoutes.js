const express = require('express');
const taskController = require('../controllers/taskController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.route('/delete-selected').post(taskController.deleteSelected);

router.route('/dashboard').get(taskController.getDashboardSummary);

router
  .route('/me')
  .get(taskController.getAllMyTasks)
  .post(taskController.createMyTask);

router
  .route('/me/:taskId')
  .patch(taskController.updateMyTask)
  .delete(taskController.deleteMyTask);

router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(taskController.getAllTasks)
  .post(taskController.createTask);

router
  .route('/:id')
  .get(taskController.getTask)
  .patch(taskController.updateTask)
  .delete(taskController.deleteTask);

module.exports = router;
