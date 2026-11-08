const express = require('express');
const { 
  getDestinations, 
  getDestinationById, 
  getFilterMetadata,
  recordDestinationView,
  getMostViewedDestinations,
  getTopRatedDestinations,
  getPopularDestinations,
  getLastMinuteRecommendations,
  createDestination, 
  updateDestination, 
  deleteDestination 
} = require('../controllers/destinationController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const router = express.Router();

// Metadata & Module 7 Discovery Routes (must precede /:id)
router.get('/meta/filters', getFilterMetadata);
router.get('/most-viewed', getMostViewedDestinations);
router.get('/top-rated', getTopRatedDestinations);
router.get('/popular', getPopularDestinations);
router.get('/last-minute', getLastMinuteRecommendations);

router.route('/')
  .get(getDestinations)
  .post(protect, authorize('admin'), createDestination);

// Safe view-tracking endpoint for Module 7.A
router.post('/:id/view', recordDestinationView);

router.route('/:id')
  .get(getDestinationById)
  .put(protect, authorize('admin'), updateDestination)
  .delete(protect, authorize('admin'), deleteDestination);

module.exports = router;
