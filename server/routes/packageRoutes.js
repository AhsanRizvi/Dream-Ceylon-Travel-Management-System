const express = require('express');
const {
  getPackages,
  getPackageById,
  createPackage,
  calculatePackagePrice,
  selectPackageForTrip
} = require('../controllers/packageController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Optional auth middleware so /select works for both guests and logged-in tourists
const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (e) {
      // Proceed as guest if token invalid
    }
  }
  next();
};

router.route('/')
  .get(getPackages)
  .post(protect, authorize('admin'), createPackage);

router.post('/calculate', calculatePackagePrice);
router.post('/select', optionalProtect, selectPackageForTrip);

router.route('/:id')
  .get(getPackageById);

module.exports = router;
