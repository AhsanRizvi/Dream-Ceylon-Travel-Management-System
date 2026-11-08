const express = require('express');
const {
  getBookings,
  createBooking,
  createGuideBooking,
  createHotelBooking,
  getMyBookingRequests,
  getProviderBookingRequests,
  updateBookingStatus
} = require('../controllers/bookingController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/my-requests', protect, getMyBookingRequests);
router.get('/provider-requests', protect, getProviderBookingRequests);
router.post('/guides', protect, createGuideBooking);
router.post('/hotels', protect, createHotelBooking);
router.put('/:id/status', protect, updateBookingStatus);

router.route('/')
  .get(protect, getBookings)
  .post(protect, createBooking);

module.exports = router;
