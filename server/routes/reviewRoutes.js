const express = require('express');
const {
  createReview,
  getReviews,
  getTargetRatingStats,
  getPopularByTargetType,
  getMyReviews,
  updateReview,
  deleteReview,
  reportReview,
  getReportedReviews,
  moderateReview
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public & Authenticated static/prefixed routes first (before parameterized /:id)
router.get('/my-reviews', protect, getMyReviews);

// Admin moderation endpoints (restricted strictly to admin role)
router.get('/admin/reported', protect, authorize('admin'), getReportedReviews);
router.patch('/admin/:id/moderate', protect, authorize('admin'), moderateReview);

// Rating aggregation and popularity statistics
router.get('/ratings/:targetType/:targetId', getTargetRatingStats);
router.get('/popular/:targetType', getPopularByTargetType);

// Target-specific review retrieval
router.get('/:targetType/:targetId', getReviews);

// Report an inappropriate review (any authenticated user)
router.post('/:id/report', protect, reportReview);

// Base collection routes
router.route('/')
  .get(getReviews)
  .post(protect, authorize('tourist'), createReview);

// Single review operations by ID (backward-compatible GET /:id + PUT/DELETE)
router.route('/:id')
  .get(getReviews)
  .put(protect, authorize('tourist', 'admin'), updateReview)
  .delete(protect, authorize('tourist', 'admin'), deleteReview);

module.exports = router;
