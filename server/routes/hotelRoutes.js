const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  registerHotel,
  getHotels,
  getHotelById,
  getMyOwnerHotels,
  createHotel,
  updateHotel,
  deleteHotel,
  getHotelRooms,
  addHotelRoom,
  updateHotelRoom,
  deleteHotelRoom
} = require('../controllers/hotelController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.user = await User.findById(decoded.id);
    } catch (e) {
      // Proceed as unauthenticated
    }
  }
  next();
};

router.post('/register', optionalProtect, registerHotel);
router.get('/owner/me', protect, authorize('hotel_owner', 'admin'), getMyOwnerHotels);

router.route('/')
  .get(getHotels)
  .post(protect, authorize('hotel_owner', 'admin'), createHotel);

router.route('/:hotelId/rooms')
  .get(getHotelRooms)
  .post(protect, authorize('hotel_owner', 'admin'), addHotelRoom);

router.route('/:hotelId/rooms/:roomId')
  .put(protect, authorize('hotel_owner', 'admin'), updateHotelRoom)
  .delete(protect, authorize('hotel_owner', 'admin'), deleteHotelRoom);

router.route('/:id')
  .get(getHotelById)
  .put(protect, authorize('hotel_owner', 'admin'), updateHotel)
  .delete(protect, authorize('hotel_owner', 'admin'), deleteHotel);

module.exports = router;
