const jwt = require('jsonwebtoken');

const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } // else if (req.cookies.token) {
    //token = req.cookies.token;
  //}

  if (!token) {
    return next(new ErrorResponse('Not authorize to access this route!', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // currently logged in user
    // any route that uses this middleware has access to "req.user"
    req.user = await User.findById(decoded.id);
    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorize to access this route!', 401));
  }
});

// grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse(`User with the role of ${ req.user.role.toUpperCase() } is not authorized to access this route`, 403));
    }

    next();
  };
};
