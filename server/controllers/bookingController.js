const Booking = require('../models/Booking');
const Guide = require('../models/Guide');
const Hotel = require('../models/Hotel');
require('../models/TourPlan');

const parseValidDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
};

const calculateInclusiveDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

const calculateNights = (checkInDate, checkOutDate) => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  checkIn.setHours(0, 0, 0, 0);
  checkOut.setHours(0, 0, 0, 0);
  const diffNights = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  return diffNights;
};

// Helper: Check if a guide has overlapping Confirmed bookings or unavailableDates
const checkGuideDateConflict = async (guide, startDate, endDate, excludeBookingId = null) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  // Check guide's explicit unavailableDates (supports both { startDate, endDate, reason } and date strings)
  if (Array.isArray(guide.unavailableDates) && guide.unavailableDates.length > 0) {
    for (const item of guide.unavailableDates) {
      if (item && typeof item === 'object' && (item.startDate || item.endDate)) {
        const uStart = parseValidDate(item.startDate);
        const uEnd = parseValidDate(item.endDate || item.startDate);
        if (uStart && uEnd && start <= uEnd && end >= uStart) {
          return {
            conflict: true,
            reason: item.reason || `Guide is marked unavailable from ${uStart.toISOString().split('T')[0]} to ${uEnd.toISOString().split('T')[0]}`
          };
        }
      } else {
        const d = parseValidDate(item);
        if (d && d >= start && d <= end) {
          return {
            conflict: true,
            reason: `Guide is marked unavailable on ${d.toISOString().split('T')[0]}`
          };
        }
      }
    }
  }

  const query = {
    guideId: guide._id,
    status: 'Confirmed',
    startDate: { $lte: end },
    endDate: { $gte: start }
  };
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflictingBooking = await Booking.findOne(query);
  if (conflictingBooking) {
    return {
      conflict: true,
      reason: 'Guide already has a confirmed booking during the selected dates'
    };
  }

  return { conflict: false };
};

// Helper: Check hotel room inventory for overlapping Confirmed bookings
const checkHotelRoomAvailability = async (hotel, room, checkInDate, checkOutDate, requestedQty, excludeBookingId = null) => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  checkIn.setHours(0, 0, 0, 0);
  checkOut.setHours(0, 0, 0, 0);

  if (room.availability === false || Number(room.count) <= 0) {
    return {
      available: false,
      remainingRooms: 0,
      reason: `Room type "${room.type}" is currently marked as unavailable`
    };
  }

  const query = {
    hotelId: hotel._id,
    status: 'Confirmed',
    checkInDate: { $lt: checkOut },
    checkOutDate: { $gt: checkIn },
    $or: [
      { roomId: room._id },
      { roomType: room.type }
    ]
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const overlappingBookings = await Booking.find(query);
  const bookedCount = overlappingBookings.reduce((sum, b) => sum + (Number(b.roomQuantity) || 1), 0);
  const remainingRooms = Math.max(0, (Number(room.count) || 0) - bookedCount);

  if (remainingRooms < requestedQty) {
    return {
      available: false,
      remainingRooms,
      reason: remainingRooms === 0
        ? `No "${room.type}" rooms are available for the selected check-in/check-out dates`
        : `Only ${remainingRooms} "${room.type}" room(s) remaining for the selected dates`
    };
  }

  return { available: true, remainingRooms };
};

// @desc    Create a Guide Booking Request
// @route   POST /api/bookings/guides
// @access  Private (Tourist / Authenticated User)
exports.createGuideBooking = async (req, res) => {
  try {
    const {
      guideId,
      tourPlanId,
      startDate,
      endDate,
      travelersCount,
      serviceNotes
    } = req.body;

    if (!guideId) {
      return res.status(400).json({ success: false, error: 'Guide ID is required' });
    }

    const start = parseValidDate(startDate);
    const end = parseValidDate(endDate || startDate);
    if (!start || !end) {
      return res.status(400).json({ success: false, error: 'Valid start date and end date are required' });
    }

    const serviceDays = calculateInclusiveDays(start, end);
    if (serviceDays <= 0) {
      return res.status(400).json({ success: false, error: 'End date must be on or after the start date' });
    }

    const guide = await Guide.findById(guideId);
    if (!guide) {
      return res.status(404).json({ success: false, error: 'Tour guide not found' });
    }

    const isPaused = String(guide.serviceStatus || 'active').toLowerCase() !== 'active';
    if (!guide.availability || isPaused) {
      return res.status(400).json({
        success: false,
        error: 'This tour guide is currently not accepting new bookings'
      });
    }

    const conflictCheck = await checkGuideDateConflict(guide, start, end);
    if (conflictCheck.conflict) {
      return res.status(400).json({
        success: false,
        error: conflictCheck.reason
      });
    }

    const dailyRateLKR = Number(guide.dailyRate) || 0;
    const totalAmount = dailyRateLKR * serviceDays;
    const parsedTravelers = Math.max(1, Number(travelersCount) || 1);

    const booking = await Booking.create({
      touristId: req.user.id,
      bookingType: 'guide',
      guideId: guide._id,
      tourPlanId: tourPlanId || undefined,
      startDate: start,
      endDate: end,
      serviceDays,
      dailyRateLKR,
      travelersCount: parsedTravelers,
      serviceNotes: serviceNotes ? String(serviceNotes).trim() : '',
      totalAmount,
      currency: 'LKR',
      status: 'Pending'
    });

    const populated = await Booking.findById(booking._id)
      .populate('guideId', 'name profilePhoto dailyRate serviceAreas languages contactNumber email')
      .populate('tourPlanId', 'title startDate endDate')
      .populate('touristId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Guide booking request submitted successfully',
      data: populated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create a Hotel Booking Request
// @route   POST /api/bookings/hotels
// @access  Private (Tourist / Authenticated User)
exports.createHotelBooking = async (req, res) => {
  try {
    const {
      hotelId,
      roomId,
      roomType,
      roomQuantity,
      checkInDate,
      checkOutDate,
      guestsCount,
      specialRequests,
      tourPlanId
    } = req.body;

    if (!hotelId) {
      return res.status(400).json({ success: false, error: 'Hotel ID is required' });
    }

    const checkIn = parseValidDate(checkInDate);
    const checkOut = parseValidDate(checkOutDate);
    if (!checkIn || !checkOut) {
      return res.status(400).json({ success: false, error: 'Valid check-in and check-out dates are required' });
    }

    const nights = calculateNights(checkIn, checkOut);
    if (nights <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Check-out date must be at least 1 night after check-in date'
      });
    }

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({ success: false, error: 'Hotel not found' });
    }

    // Find requested room by subdocument _id or type
    let selectedRoom = null;
    if (roomId && hotel.rooms && hotel.rooms.length > 0) {
      selectedRoom = hotel.rooms.id(roomId);
    }
    if (!selectedRoom && roomType && hotel.rooms && hotel.rooms.length > 0) {
      selectedRoom = hotel.rooms.find(
        (r) => r.type.toLowerCase() === String(roomType).trim().toLowerCase()
      );
    }
    if (!selectedRoom && hotel.rooms && hotel.rooms.length > 0 && !roomId && !roomType) {
      selectedRoom = hotel.rooms[0];
    }

    if (!selectedRoom) {
      return res.status(404).json({
        success: false,
        error: 'Selected room type was not found in this hotel'
      });
    }

    const parsedRoomQty = Math.max(1, Number(roomQuantity) || 1);
    const parsedGuests = Math.max(1, Number(guestsCount) || 1);

    // Validate guest capacity against room capacity * quantity
    const maxAllowedGuests = (Number(selectedRoom.capacity) || 2) * parsedRoomQty;
    if (parsedGuests > maxAllowedGuests) {
      return res.status(400).json({
        success: false,
        error: `${parsedRoomQty} "${selectedRoom.type}" room(s) can accommodate at most ${maxAllowedGuests} guest(s) (${selectedRoom.capacity} per room). Please increase room quantity or choose a larger room.`
      });
    }

    // Check room inventory availability for the dates
    const availabilityCheck = await checkHotelRoomAvailability(
      hotel,
      selectedRoom,
      checkIn,
      checkOut,
      parsedRoomQty
    );

    if (!availabilityCheck.available) {
      return res.status(400).json({
        success: false,
        error: availabilityCheck.reason
      });
    }

    const roomRatePerNightLKR = Number(selectedRoom.pricePerNight ?? selectedRoom.price) || Number(hotel.pricePerNight) || 0;
    const totalAmount = roomRatePerNightLKR * parsedRoomQty * nights;

    const booking = await Booking.create({
      touristId: req.user.id,
      bookingType: 'hotel',
      hotelId: hotel._id,
      tourPlanId: tourPlanId || undefined,
      roomId: selectedRoom._id,
      roomType: selectedRoom.type,
      roomQuantity: parsedRoomQty,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights,
      guestsCount: parsedGuests,
      roomRatePerNightLKR,
      specialRequests: specialRequests ? String(specialRequests).trim() : '',
      totalAmount,
      currency: 'LKR',
      status: 'Pending'
    });

    const populated = await Booking.findById(booking._id)
      .populate('hotelId', 'name location district address photos contactNumber contactEmail checkInTime checkOutTime')
      .populate('tourPlanId', 'title startDate endDate')
      .populate('touristId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Hotel booking request submitted successfully',
      data: populated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get current tourist's booking requests
// @route   GET /api/bookings/my-requests
// @access  Private
exports.getMyBookingRequests = async (req, res) => {
  try {
    const query = { touristId: req.user.id };
    if (req.query.bookingType) {
      query.bookingType = req.query.bookingType;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const bookings = await Booking.find(query)
      .populate('guideId', 'name profilePhoto dailyRate serviceAreas languages contactNumber email averageRating totalReviews')
      .populate('hotelId', 'name location district address photos pricePerNight contactNumber contactEmail checkInTime checkOutTime averageRating totalReviews')
      .populate('tourPlanId', 'title startDate endDate')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get incoming & confirmed booking requests for a Guide or Hotel Owner
// @route   GET /api/bookings/provider-requests
// @access  Private (guide, hotel_owner, admin)
exports.getProviderBookingRequests = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'guide') {
      const guides = await Guide.find({ userId: req.user.id }).select('_id');
      const guideIds = guides.map((g) => g._id);
      query = { guideId: { $in: guideIds } };
    } else if (req.user.role === 'hotel_owner') {
      const hotels = await Hotel.find({ ownerId: req.user.id }).select('_id');
      const hotelIds = hotels.map((h) => h._id);
      query = { hotelId: { $in: hotelIds } };
    } else if (req.user.role === 'admin') {
      if (req.query.guideId) query.guideId = req.query.guideId;
      if (req.query.hotelId) query.hotelId = req.query.hotelId;
    } else {
      // Also allow checking if a user owns any guide or hotel profile
      const [guides, hotels] = await Promise.all([
        Guide.find({ userId: req.user.id }).select('_id'),
        Hotel.find({ ownerId: req.user.id }).select('_id')
      ]);
      const orClauses = [];
      if (guides.length > 0) orClauses.push({ guideId: { $in: guides.map((g) => g._id) } });
      if (hotels.length > 0) orClauses.push({ hotelId: { $in: hotels.map((h) => h._id) } });

      if (orClauses.length === 0) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      query = orClauses.length === 1 ? orClauses[0] : { $or: orClauses };
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const bookings = await Booking.find(query)
      .populate('touristId', 'name email role')
      .populate('guideId', 'name profilePhoto dailyRate serviceAreas languages')
      .populate('hotelId', 'name location district photos checkInTime checkOutTime')
      .populate('tourPlanId', 'title startDate endDate')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update booking status (Accept/Confirm, Reject, Complete, Cancel)
// @route   PUT /api/bookings/:id/status
// @access  Private (Owning Guide, Owning Hotel Owner, Tourist for Cancel, or Admin)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status, providerNote } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Rejected', 'Cancelled', 'Completed'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed values: ${validStatuses.join(', ')}`
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking record not found' });
    }

    let isOwnerProvider = false;
    let guideDoc = null;
    let hotelDoc = null;

    if (booking.guideId) {
      guideDoc = await Guide.findById(booking.guideId);
      if (guideDoc && guideDoc.userId.toString() === req.user.id) {
        isOwnerProvider = true;
      }
    }

    if (booking.hotelId) {
      hotelDoc = await Hotel.findById(booking.hotelId);
      if (hotelDoc && hotelDoc.ownerId.toString() === req.user.id) {
        isOwnerProvider = true;
      }
    }

    const isTouristOwner = booking.touristId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Tourists may only cancel their own bookings
    if (!isOwnerProvider && !isAdmin) {
      if (isTouristOwner && status === 'Cancelled') {
        if (booking.status === 'Completed') {
          return res.status(400).json({
            success: false,
            error: 'Completed bookings cannot be cancelled'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to change the status of this booking'
        });
      }
    }

    // When confirming a booking, re-verify date/room availability to prevent overbooking
    if (status === 'Confirmed' && booking.status !== 'Confirmed') {
      if (booking.guideId && guideDoc && booking.startDate && booking.endDate) {
        const conflictCheck = await checkGuideDateConflict(
          guideDoc,
          booking.startDate,
          booking.endDate,
          booking._id
        );
        if (conflictCheck.conflict) {
          return res.status(400).json({
            success: false,
            error: `Cannot confirm booking: ${conflictCheck.reason}`
          });
        }
      }

      if (booking.hotelId && hotelDoc && booking.checkInDate && booking.checkOutDate) {
        let room = null;
        if (booking.roomId && hotelDoc.rooms) {
          room = hotelDoc.rooms.id(booking.roomId);
        }
        if (!room && booking.roomType && hotelDoc.rooms) {
          room = hotelDoc.rooms.find(
            (r) => r.type.toLowerCase() === String(booking.roomType).toLowerCase()
          );
        }
        if (room) {
          const availCheck = await checkHotelRoomAvailability(
            hotelDoc,
            room,
            booking.checkInDate,
            booking.checkOutDate,
            booking.roomQuantity || 1,
            booking._id
          );
          if (!availCheck.available) {
            return res.status(400).json({
              success: false,
              error: `Cannot confirm booking: ${availCheck.reason}`
            });
          }
        }
      }
    }

    booking.status = status;
    if (providerNote !== undefined) {
      booking.providerNote = String(providerNote).trim();
    }
    booking.respondedBy = req.user.id;
    booking.respondedAt = new Date();

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('touristId', 'name email role')
      .populate('guideId', 'name profilePhoto dailyRate serviceAreas languages contactNumber email')
      .populate('hotelId', 'name location district address photos contactNumber contactEmail checkInTime checkOutTime')
      .populate('tourPlanId', 'title startDate endDate');

    res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}`,
      data: populated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all bookings (role-filtered)
// @route   GET /api/bookings
// @access  Private
exports.getBookings = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'tourist') {
      query = { touristId: req.user.id };
    } else if (req.user.role === 'guide') {
      const guides = await Guide.find({ userId: req.user.id }).select('_id');
      query = { guideId: { $in: guides.map((g) => g._id) } };
    } else if (req.user.role === 'hotel_owner') {
      const hotels = await Hotel.find({ ownerId: req.user.id }).select('_id');
      query = { hotelId: { $in: hotels.map((h) => h._id) } };
    }

    const bookings = await Booking.find(query)
      .populate('touristId', 'name email')
      .populate('tourPlanId')
      .populate('hotelId')
      .populate('guideId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create a generic booking (backward compatible)
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  try {
    if (req.body.bookingType === 'guide' || (req.body.guideId && !req.body.hotelId && req.body.startDate)) {
      return exports.createGuideBooking(req, res);
    }
    if (req.body.bookingType === 'hotel' || (req.body.hotelId && !req.body.guideId && req.body.checkInDate)) {
      return exports.createHotelBooking(req, res);
    }

    req.body.touristId = req.user.id;
    const booking = await Booking.create(req.body);
    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
