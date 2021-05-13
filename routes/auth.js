const express = require('express');

const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updatePassword,
  updateDetails
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.put('/resetpassword/:resettoken', resetPassword);

module.exports = router;
