const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const fileupload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

// load env vars
dotenv.config({ path: './config/config.env' });

// Connect to database
connectDB();

// route files
const bootcamps = require('./routes/bootcamps');
const courses = require('./routes/courses');
const auth = require('./routes/auth');
const users = require('./routes/users');
const reviews = require('./routes/reviews');

const app = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// file uploading
app.use(fileupload({
  useTempFiles: true
}));

// sanitize data
app.use(mongoSanitize());

// set security headers
app.use(helmet());

// prevent xss attacks
app.use(xss());

// rate limiting (make 100 requests per 10 minutes)
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes window
  max: 100,
  message: 'Too many requests were made from this IP, please try again after 10 minutes!'
});

app.use(limiter);

// prevent http param pollution
app.use(hpp());

// enable cors
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

// mount routers
app.use('/api/v1/bootcamps', bootcamps);
app.use('/api/v1/courses', courses);
app.use('/api/v1/auth', auth);
app.use('/api/v1/users', users);
app.use('/api/v1/reviews', reviews);

// error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  () => console.log(`Serving running in ${ process.env.NODE_ENV } mode on port ${ PORT }`.white.bold)
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (error, promise) => {
  console.log(`Error: ${ error.message }`.red.bold);

// close server & exit process
  server.close(() => process.exit(1));
});
