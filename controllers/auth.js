const crypto = require('crypto');

const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const sendEmail = require('../utils/sendEmail');

/*
 - @desc    Register user
 - @route   POST /api/v1/auth/register
 - @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
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

/*
 - @desc    Get current logged in user
 - @route   GET /api/v1/auth/me
 - @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

/*
 - @desc    Update user details
 - @route   PUT /api/v1/auth/updatedetails
 - @access  Private
 */
exports.updateDetails = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email
  };

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

/*
 - @desc   Update password
 - @route   PUT /api/v1/auth/updatepassword
 - @access  Private
 */
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, user.email, 200, res);
});

/*
 - @desc    Forgot password
 - @route   POST /api/v1/auth/forgotpassword
 - @access  Public
 */
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }

  // get reset token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // create reset url
  const resetUrl = `${ req.protocol }://${ req.get('host') }/api/v1/auth/resetpassword/${ resetToken }`;
  const message = `You are receiving this email because you (or someone else) has
  requested the reset of a password. Please make a PUT request to: \n\n ${ resetUrl }`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset token',
      message
    });

    res.status(200).json({
      success: true,
      data: 'Email sent'
    });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });
    return next(new ErrorResponse('Email could not be sent!', 500));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

/*
 - @desc    Reset user password
 - @route   PUT /api/v1/auth/resetpassword/:resettoken
 - @access  Public
 */
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid Token', 400));
  }

  // set password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, user.email, 200, res);
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
