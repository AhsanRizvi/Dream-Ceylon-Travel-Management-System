const express = require('express');
const { 
  getDestinations, 
  getDestinationById, 
  getFilterMetadata,
  createDestination, 
  updateDestination, 
  deleteDestination 
} = require('../controllers/destinationController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/meta/filters', getFilterMetadata);

router.route('/')
  .get(getDestinations)
  .post(protect, authorize('admin'), createDestination);

router.route('/:id')
  .get(getDestinationById)
  .put(protect, authorize('admin'), updateDestination)
  .delete(protect, authorize('admin'), deleteDestination);

module.exports = router;
