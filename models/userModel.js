const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name'],
  },
  email: {
    type: String,
    lowercase: true,
    required: [true, 'A user must have an enail address'],
    unique: true,
    validate: [validator.isEmail, 'please provide a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'A user must have a password'],
    minLength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'A user must confirm their password'],
    validate: {
      validator: function (value) {
        return value === this.password;
      },
    },
  },
  role: {
    type: String,
    required: [true, 'A user must have a role'],
    default: 'user',
  },
  profilePhoto: {
    type: String,
    default: 'default.jpg',
  },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  passwordChangedAt: Date,
});

// Pre middlewares
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// schema methods
userSchema.methods.correctPassword = async function (
  unencryptedPassword,
  encryptedPassword,
) {
  return await bcrypt.compare(unencryptedPassword, encryptedPassword);
};

userSchema.methods.checkIfPasswordChanged = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

const User = new mongoose.model('User', userSchema);

module.exports = User;
