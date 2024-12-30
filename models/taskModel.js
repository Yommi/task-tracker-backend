const mongoose = require('mongoose');
const validator = require('validator');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'A task must have a title'],
  },
  startTime: {
    type: Date,
    required: [true, 'A task must have a start time'],
    default: Date.now(),
  },
  endTime: {
    type: Date,
    required: [true, 'A task must have an end time'],
  },
  priority: {
    type: Number,
    required: [true, 'A task must have a priority'],
    enum: [1, 2, 3, 4, 5],
    default: 5,
  },
  taskStatus: {
    type: Boolean,
    default: false,
  },
  timeToFinish: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A task must have an owner'],
  },
});

taskSchema.pre('save', function (next) {
  if (this.endTime > this.startTime) {
    this.timeToFinish = Number(
      ((this.endTime - this.startTime) / (1000 * 60 * 60)).toFixed(2),
    );
  } else {
    this.timeToFinish = 0;
  }
  next();
});

const Task = new mongoose.model('Task', taskSchema);

module.exports = Task;
