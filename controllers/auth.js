const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

/*
 - @desc    Register user
 - @route   POST /api/v1/auth/register
 - @access  Public
 */
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  const user = await User.create({
    name,
    email,
    password,
    role
  });

  sendTokenResponse(user, email, 200, res);
});

/*
 - @desc    Login user
 - @route   POST /api/v1/auth/login
 - @access  Public
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and a password', 400));
  }

  // check for user in DB
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials (email not found)', 401));
  }

  // check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials (wrong password)', 401));
  }

  sendTokenResponse(user, email, 200, res);
});

// get token from model, create cookie and send response
const sendTokenResponse = (user, email, statusCode, res) => {

  // create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + process.env.JST_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options) // handle cookie on client side
    .json({
      success: true,
      token,
      email
    });
};

/*
 - @desc    Get current logged in user
 - @route   GET /api/v1/auth/me
 - @access  Private
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});
