const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  registerGuide,
  getGuides,
  getGuideById,
  getMyGuideProfile,
  updateMyGuideProfile,
  updateGuideAvailability,
  checkGuideAvailability,
  createGuide,
  updateGuide,
  deleteGuide
} = require('../controllers/guideController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Optional auth middleware for /register (supports both new user signup and existing logged-in user)
const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (e) {
      // Continue as unauthenticated if token invalid
    }
  }
  next();
};

router.post('/register', optionalProtect, registerGuide);

router
  .route('/profile/me')
  .get(protect, authorize('guide', 'admin'), getMyGuideProfile)
  .put(protect, authorize('guide', 'admin'), updateMyGuideProfile);

router.put('/availability', protect, authorize('guide', 'admin'), updateGuideAvailability);

router.route('/')
  .get(getGuides)
  .post(protect, authorize('guide', 'admin'), createGuide);

router.get('/:id/availability', checkGuideAvailability);

router.route('/:id')
  .get(getGuideById)
  .put(protect, authorize('guide', 'admin'), updateGuide)
  .delete(protect, authorize('guide', 'admin'), deleteGuide);

module.exports = router;
