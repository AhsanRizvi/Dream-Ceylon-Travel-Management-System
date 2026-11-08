const Hotel = require('../models/Hotel');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

const parseStringArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    return val
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

// @desc    Register a Hotel Owner & Hotel Profile
// @route   POST /api/hotels/register
// @access  Public / Private
exports.registerHotel = async (req, res) => {
  try {
    const {
      ownerName,
      email,
      password,
      contactNumber,
      contactEmail,
      name,
      hotelName,
      description,
      photos,
      district,
      location,
      address,
      latitude,
      longitude,
      facilities,
      checkInTime = '14:00',
      checkOutTime = '11:00',
      pricePerNight,
      rooms,
      availability = true
    } = req.body || {};

    const resolvedHotelName = String(name || hotelName || '').trim();
    const resolvedDistrict = String(district || location || '').trim();

    if (!resolvedHotelName) {
      return res.status(400).json({ success: false, error: 'Hotel name is required.' });
    }
    if (!resolvedDistrict) {
      return res.status(400).json({ success: false, error: 'Hotel district/location is required.' });
    }

    let user = req.user || null;
    let issuedToken = null;

    if (!user) {
      const resolvedOwnerName = String(ownerName || `${resolvedHotelName} Partner`).trim();
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Owner email and password are required when registering a new hotel owner account.'
        });
      }

      const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'An account with this email already exists. Please log in first to register your hotel.'
        });
      }

      user = await User.create({
        name: resolvedOwnerName,
        email: String(email).toLowerCase().trim(),
        passwordHash: password,
        role: 'hotel_owner'
      });
      issuedToken = user.getSignedJwtToken();
    } else {
      if (user.role !== 'hotel_owner' && user.role !== 'admin') {
        user.role = 'hotel_owner';
        await user.save();
      }
      issuedToken = user.getSignedJwtToken();
    }

    // Validate and sanitize initial rooms if provided
    let sanitizedRooms = [];
    if (Array.isArray(rooms) && rooms.length > 0) {
      sanitizedRooms = rooms.map((r) => ({
        type: String(r.type || r.name || 'Standard Room').trim(),
        name: String(r.name || r.type || 'Standard Room').trim(),
        description: r.description ? String(r.description).trim() : '',
        capacity: Math.max(1, Number(r.capacity) || 2),
        count: Math.max(1, Number(r.count) || 1),
        bedConfiguration: r.bedConfiguration ? String(r.bedConfiguration).trim() : '1 Queen Bed',
        roomFacilities: parseStringArray(r.roomFacilities),
        pricePerNight: Math.max(0, Number(r.pricePerNight) || Number(pricePerNight) || 25000),
        photos: parseStringArray(r.photos),
        availability: r.availability !== undefined ? Boolean(r.availability) : true
      }));
    }

    const numericPrice =
      sanitizedRooms.length > 0
        ? Math.min(...sanitizedRooms.map((r) => r.pricePerNight))
        : Number(pricePerNight);

    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'A valid positive starting room price per night (in LKR) is required.'
      });
    }

    const hotel = await Hotel.create({
      ownerId: user._id,
      ownerName: ownerName ? String(ownerName).trim() : user.name,
      contactEmail: contactEmail ? String(contactEmail).trim() : user.email,
      contactNumber: contactNumber ? String(contactNumber).trim() : '',
      name: resolvedHotelName,
      district: resolvedDistrict,
      location: resolvedDistrict,
      address: address ? String(address).trim() : '',
      latitude: latitude !== undefined && latitude !== '' && latitude !== null ? Number(latitude) : null,
      longitude: longitude !== undefined && longitude !== '' && longitude !== null ? Number(longitude) : null,
      description: description ? String(description).trim() : '',
      photos: parseStringArray(photos),
      facilities: parseStringArray(facilities),
      rooms: sanitizedRooms,
      checkInTime: String(checkInTime || '14:00').trim(),
      checkOutTime: String(checkOutTime || '11:00').trim(),
      currency: 'LKR',
      pricePerNight: numericPrice,
      availability: Boolean(availability)
    });

    res.status(201).json({
      success: true,
      token: issuedToken,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      data: hotel
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all hotels with discovery filters
// @route   GET /api/hotels
// @access  Public
exports.getHotels = async (req, res) => {
  try {
    const {
      district,
      location,
      search,
      minPrice,
      maxPrice,
      facility,
      roomType,
      minRating,
      availability,
      sortBy
    } = req.query;

    const query = {};

    const distFilter = district || location;
    if (distFilter && String(distFilter).trim()) {
      const regex = new RegExp(String(distFilter).trim(), 'i');
      query.$or = [{ district: regex }, { location: regex }];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.pricePerNight = {};
      if (minPrice !== undefined && minPrice !== '') query.pricePerNight.$gte = Number(minPrice);
      if (maxPrice !== undefined && maxPrice !== '') query.pricePerNight.$lte = Number(maxPrice);
    }

    if (facility && String(facility).trim()) {
      const reqFacilities = parseStringArray(facility);
      if (reqFacilities.length > 0) {
        query.facilities = {
          $all: reqFacilities.map((f) => new RegExp(f, 'i'))
        };
      }
    }

    if (roomType && String(roomType).trim()) {
      query['rooms.type'] = { $regex: new RegExp(String(roomType).trim(), 'i') };
    }

    if (minRating !== undefined && minRating !== '') {
      query.rating = { $gte: Number(minRating) };
    }

    if (availability === 'true') {
      query.availability = true;
    } else if (availability === 'false') {
      query.availability = false;
    }

    let hotels = await Hotel.find(query).populate('ownerId', 'name email');

    if (search && String(search).trim()) {
      const q = String(search).toLowerCase().trim();
      hotels = hotels.filter((h) => {
        const nameMatch = (h.name || '').toLowerCase().includes(q);
        const locMatch = (h.location || h.district || '').toLowerCase().includes(q);
        const addrMatch = (h.address || '').toLowerCase().includes(q);
        const descMatch = (h.description || '').toLowerCase().includes(q);
        const facMatch = (h.facilities || []).some((f) => f.toLowerCase().includes(q));
        return nameMatch || locMatch || addrMatch || descMatch || facMatch;
      });
    }

    if (sortBy === 'price_low') {
      hotels.sort((a, b) => (a.pricePerNight || 0) - (b.pricePerNight || 0));
    } else if (sortBy === 'price_high') {
      hotels.sort((a, b) => (b.pricePerNight || 0) - (a.pricePerNight || 0));
    } else if (sortBy === 'rating') {
      hotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    res.status(200).json({
      success: true,
      count: hotels.length,
      baseCurrency: 'LKR',
      data: hotels
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get single hotel details by ID
// @route   GET /api/hotels/:id
// @access  Public
exports.getHotelById = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id).populate('ownerId', 'name email');
    if (!hotel) {
      return res.status(404).json({ success: false, error: 'Hotel not found' });
    }

    const confirmedBookings = await Booking.find({
      hotelId: hotel._id,
      status: 'Confirmed',
      checkOutDate: { $gte: new Date() }
    })
      .select('roomId roomType roomQuantity checkInDate checkOutDate status')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        ...hotel.toObject(),
        confirmedBookings
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get authenticated hotel owner's hotels, rooms, booking stats & feedback
// @route   GET /api/hotels/owner/me
// @access  Private (hotel_owner, admin)
exports.getMyOwnerHotels = async (req, res) => {
  try {
    const hotels = await Hotel.find({ ownerId: req.user.id }).populate('ownerId', 'name email');
    const hotelIds = hotels.map((h) => h._id);

    const [bookings, recentReviews] = await Promise.all([
      Booking.find({ hotelId: { $in: hotelIds } })
        .populate('touristId', 'name email')
        .populate('hotelId', 'name location district')
        .sort({ createdAt: -1 })
        .lean(),
      Review.find({ targetType: 'hotel', targetId: { $in: hotelIds }, status: 'active' })
        .populate('authorId', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    const totalRoomsTypes = hotels.reduce((sum, h) => sum + (h.rooms?.length || 0), 0);
    const totalPhysicalRooms = hotels.reduce(
      (sum, h) => sum + (h.rooms || []).reduce((rSum, r) => rSum + (Number(r.count) || 0), 0),
      0
    );
    const pendingRequests = bookings.filter((b) => b.status === 'Pending').length;
    const confirmedBookings = bookings.filter((b) => b.status === 'Confirmed').length;
    const completedStays = bookings.filter((b) => b.status === 'Completed').length;
    const totalConfirmedRevenueLKR = bookings
      .filter((b) => b.status === 'Confirmed' || b.status === 'Completed')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

    res.status(200).json({
      success: true,
      count: hotels.length,
      stats: {
        hotelsCount: hotels.length,
        totalRoomsTypes,
        totalPhysicalRooms,
        pendingRequests,
        confirmedBookings,
        completedStays,
        totalBookings: bookings.length,
        totalConfirmedRevenueLKR
      },
      recentBookings: bookings,
      recentReviews,
      data: hotels
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create hotel (authenticated hotel_owner/admin)
// @route   POST /api/hotels
// @access  Private (hotel_owner, admin)
exports.createHotel = async (req, res) => {
  try {
    req.body.ownerId = req.user.id;
    if (!req.body.district && req.body.location) req.body.district = req.body.location;
    if (!req.body.location && req.body.district) req.body.location = req.body.district;
    if (req.body.facilities) req.body.facilities = parseStringArray(req.body.facilities);
    if (req.body.photos) req.body.photos = parseStringArray(req.body.photos);

    const hotel = await Hotel.create(req.body);
    res.status(201).json({ success: true, data: hotel });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update hotel profile (verified ownership)
// @route   PUT /api/hotels/:id
// @access  Private (hotel_owner, admin)
exports.updateHotel = async (req, res) => {
  try {
    const existing = await Hotel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Hotel not found' });
    }

    if (String(existing.ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify another owner\'s hotel.'
      });
    }

    delete req.body.ownerId;
    if (req.body.facilities !== undefined) {
      req.body.facilities = parseStringArray(req.body.facilities);
    }
    if (req.body.photos !== undefined) {
      req.body.photos = parseStringArray(req.body.photos);
    }
    if (req.body.district && !req.body.location) {
      req.body.location = req.body.district;
    } else if (req.body.location && !req.body.district) {
      req.body.district = req.body.location;
    }

    Object.assign(existing, req.body);
    await existing.save();

    res.status(200).json({ success: true, data: existing });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete hotel (verified ownership)
// @route   DELETE /api/hotels/:id
// @access  Private (hotel_owner, admin)
exports.deleteHotel = async (req, res) => {
  try {
    const existing = await Hotel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Hotel not found' });
    }

    if (String(existing.ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete another owner\'s hotel.'
      });
    }

    await Hotel.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ============================================================================
// HOTEL ROOM MANAGEMENT ENDPOINTS
// ============================================================================

// @desc    Get all rooms for a hotel (with live availability calculation if dates provided)
// @route   GET /api/hotels/:hotelId/rooms
// @access  Public
exports.getHotelRooms = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.hotelId).lean();
    if (!hotel) {
      return res.status(404).json({ success: false, error: 'Hotel not found' });
    }

    const { checkInDate, checkOutDate } = req.query;
    let overlappingBookings = [];

    if (checkInDate && checkOutDate) {
      const reqIn = new Date(checkInDate);
      const reqOut = new Date(checkOutDate);
      if (!isNaN(reqIn.getTime()) && !isNaN(reqOut.getTime()) && reqOut > reqIn) {
        overlappingBookings = await Booking.find({
          hotelId: hotel._id,
          status: 'Confirmed',
          checkInDate: { $lt: reqOut },
          checkOutDate: { $gt: reqIn }
        }).lean();
      }
    }

    const enrichedRooms = (hotel.rooms || []).map((room) => {
      const reservedCount = overlappingBookings
        .filter(
          (b) =>
            (b.roomId && String(b.roomId) === String(room._id)) ||
            (b.roomType && b.roomType.toLowerCase() === (room.type || '').toLowerCase())
        )
        .reduce((sum, b) => sum + (Number(b.roomQuantity) || 1), 0);

      const totalCount = Number(room.count) || 1;
      const availableRooms = Math.max(0, totalCount - reservedCount);

      return {
        ...room,
        pricePerNight: room.pricePerNight || hotel.pricePerNight,
        reservedCount,
        availableRooms,
        isAvailableForDates:
          Boolean(hotel.availability) && Boolean(room.availability !== false) && availableRooms > 0
      };
    });

    res.status(200).json({
      success: true,
      hotelId: hotel._id,
      hotelName: hotel.name,
      count: enrichedRooms.length,
      data: enrichedRooms
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Add a new room type to a hotel
// @route   POST /api/hotels/:hotelId/rooms
// @access  Private (hotel_owner, admin)
exports.addHotelRoom = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.hotelId);
    if (!hotel) {
      return res.status(404).json({ success: false, error: 'Hotel not found' });
    }

    if (String(hotel.ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to manage rooms for another owner\'s hotel.'
      });
    }

    const {
      type,
      name,
      description,
      count,
      capacity,
      bedConfiguration,
      roomFacilities,
      pricePerNight,
      photos,
      availability = true
    } = req.body || {};

    const resolvedType = String(type || name || '').trim();
    const numericCapacity = Number(capacity);
    const numericCount = Number(count);
    const numericPrice = Number(pricePerNight ?? hotel.pricePerNight);

    if (!resolvedType) {
      return res.status(400).json({ success: false, error: 'Room type or name is required.' });
    }
    if (isNaN(numericCapacity) || numericCapacity < 1) {
      return res.status(400).json({
        success: false,
        error: 'Room maximum occupancy (capacity) must be at least 1 guest.'
      });
    }
    if (isNaN(numericCount) || numericCount < 1) {
      return res.status(400).json({
        success: false,
        error: 'Number of rooms (count) must be at least 1.'
      });
    }
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Room price per night must be a positive number.'
      });
    }

    const newRoom = {
      type: resolvedType,
      name: String(name || resolvedType).trim(),
      description: description ? String(description).trim() : '',
      capacity: numericCapacity,
      count: numericCount,
      bedConfiguration: bedConfiguration ? String(bedConfiguration).trim() : '1 Queen Bed',
      roomFacilities: parseStringArray(roomFacilities),
      pricePerNight: numericPrice,
      photos: parseStringArray(photos),
      availability: Boolean(availability)
    };

    hotel.rooms.push(newRoom);
    await hotel.save();

    const createdRoom = hotel.rooms[hotel.rooms.length - 1];

    res.status(201).json({
      success: true,
      data: createdRoom,
      hotel
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update an existing room in a hotel
// @route   PUT /api/hotels/:hotelId/rooms/:roomId
// @access  Private (hotel_owner, admin)
exports.updateHotelRoom = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.hotelId);
    if (!hotel) {
      return res.status(404).json({ success: false, error: 'Hotel not found' });
    }

    if (String(hotel.ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify rooms for another owner\'s hotel.'
      });
    }

    const room = hotel.rooms.id(req.params.roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room record not found' });
    }

    const {
      type,
      name,
      description,
      count,
      capacity,
      bedConfiguration,
      roomFacilities,
      pricePerNight,
      photos,
      availability
    } = req.body || {};

    if (capacity !== undefined && (isNaN(Number(capacity)) || Number(capacity) < 1)) {
      return res.status(400).json({
        success: false,
        error: 'Room capacity must be at least 1 guest.'
      });
    }
    if (count !== undefined && (isNaN(Number(count)) || Number(count) < 1)) {
      return res.status(400).json({
        success: false,
        error: 'Number of rooms must be at least 1.'
      });
    }
    if (pricePerNight !== undefined && (isNaN(Number(pricePerNight)) || Number(pricePerNight) <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'Room price per night must be greater than 0.'
      });
    }

    if (type !== undefined) room.type = String(type).trim();
    if (name !== undefined) room.name = String(name).trim();
    if (description !== undefined) room.description = String(description).trim();
    if (count !== undefined) room.count = Number(count);
    if (capacity !== undefined) room.capacity = Number(capacity);
    if (bedConfiguration !== undefined) room.bedConfiguration = String(bedConfiguration).trim();
    if (roomFacilities !== undefined) room.roomFacilities = parseStringArray(roomFacilities);
    if (pricePerNight !== undefined) room.pricePerNight = Number(pricePerNight);
    if (photos !== undefined) room.photos = parseStringArray(photos);
    if (availability !== undefined) room.availability = Boolean(availability);

    await hotel.save();

    res.status(200).json({
      success: true,
      data: room,
      hotel
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete a room record safely from a hotel
// @route   DELETE /api/hotels/:hotelId/rooms/:roomId
// @access  Private (hotel_owner, admin)
exports.deleteHotelRoom = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.hotelId);
    if (!hotel) {
      return res.status(404).json({ success: false, error: 'Hotel not found' });
    }

    if (String(hotel.ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to remove rooms from another owner\'s hotel.'
      });
    }

    const room = hotel.rooms.id(req.params.roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room record not found' });
    }

    // Prevent deleting a room type that has active Confirmed reservations in the future
    const activeBooking = await Booking.findOne({
      hotelId: hotel._id,
      status: 'Confirmed',
      checkOutDate: { $gte: new Date() },
      $or: [{ roomId: room._id }, { roomType: room.type }]
    });

    if (activeBooking) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete this room type while it has upcoming confirmed guest reservations.'
      });
    }

    hotel.rooms.pull({ _id: room._id });
    await hotel.save();

    res.status(200).json({
      success: true,
      message: 'Room removed successfully.',
      data: {},
      hotel
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
