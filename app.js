const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const adminRouter = require('./routes/adminRoutes');
const authRouter = require('./routes/authRoutes');
const userRouter = require('./routes/userRoutes');
const taskRouter = require('./routes/taskRoutes');
const errorHandler = require('./controllers/errorController');

const app = express();

// MORGAN LOGGER
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// BODY PARSER
app.use(express.json());

const allowedOrigins = [
  'https://private-repo-frontend.vercel.app/',  // Your deployed frontend URL
  'http://localhost:3000',                     // Local development URL
]

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

app.use(cookieParser());

app.use('/api/v1/admins', adminRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/tasks', taskRouter);

// Error Handler
app.use(errorHandler);

app.use('*', (req, res) => {
  res.status(404).send('route does not exist');
});

module.exports = app;
