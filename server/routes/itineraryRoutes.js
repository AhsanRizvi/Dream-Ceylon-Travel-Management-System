const express = require('express');
const {
  generateItinerary,
  createItinerary,
  getItineraries,
  getItineraryById,
  updateItinerary,
  deleteItinerary
} = require('../controllers/itineraryController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('tourist', 'admin'));

router.post('/generate', generateItinerary);

router
  .route('/')
  .get(getItineraries)
  .post(createItinerary);

router
  .route('/:id')
  .get(getItineraryById)
  .put(updateItinerary)
  .delete(deleteItinerary);

module.exports = router;

