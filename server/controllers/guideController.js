const jwt = require('jsonwebtoken');
const Guide = require('../models/Guide');
const jwt = require('jsonwebtoken');
const Guide = require('../models/Guide');
const { normalizeToLKR, getExchangeRates, SUPPORTED_CURRENCIES } = require('../services/currencyService');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

/**
 * Helper: Calculate profile completion percentage and missing fields for a guide
 */
const computeGuideProfileCompletion = (guide) => {
  if (!guide) return { percentage: 0, missingFields: ['Complete guide registration'] };
  const checks = [
    { label: 'Full Name', valid: Boolean(guide.name && guide.name.trim()) },
    { label: 'Contact Number', valid: Boolean(guide.contactNumber && guide.contactNumber.trim()) },
    { label: 'Profile Photograph', valid: Boolean(guide.profilePhoto && guide.profilePhoto.trim()) },
    { label: 'Biography', valid: Boolean(guide.bio && guide.bio.trim().length >= 10) },
    { label: 'Languages Spoken', valid: Array.isArray(guide.languages) && guide.languages.length > 0 },
    { label: 'Service Districts', valid: Array.isArray(guide.serviceAreas) && guide.serviceAreas.length > 0 },
    { label: 'Areas of Expertise', valid: Array.isArray(guide.expertise) && guide.expertise.length > 0 },
    { label: 'Years of Experience', valid: guide.experienceYears !== undefined && guide.experienceYears >= 0 },
    { label: 'Daily Service Rate', valid: Number(guide.dailyRate) > 0 },
    { label: 'Qualifications / Certifications', valid: Array.isArray(guide.qualifications) && guide.qualifications.length > 0 }
  ];

  const completed = checks.filter((c) => c.valid).length;
  const percentage = Math.round((completed / checks.length) * 100);
  const missingFields = checks.filter((c) => !c.valid).map((c) => c.label);

  return { percentage, missingFields };
};

/**
 * Normalize array inputs (accepts comma-separated string or array of strings)
 */
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

// @desc    Register a Tour Guide (supports both new user+guide signup and existing authenticated user)
// @route   POST /api/guides/register
// @access  Public / Private
exports.registerGuide = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      contactNumber,
      profilePhoto,
      bio,
      languages,
      serviceAreas,
      expertise,
      experienceYears,
      dailyRate,
      availability = true,
      availabilityNotes,
      qualifications
    } = req.body || {};

    const parsedLanguages = parseStringArray(languages);
    const parsedServiceAreas = parseStringArray(serviceAreas);
    const parsedExpertise = parseStringArray(expertise);
    const parsedQualifications = parseStringArray(qualifications);
    const numericRate = Number(dailyRate);

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Guide full name is required.' });
    }
    if (isNaN(numericRate) || numericRate <= 0) {
      return res.status(400).json({
        success: false,
        error: 'A valid positive daily service rate (in LKR) is required.'
      });
    }
    if (parsedLanguages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one spoken language is required.'
      });
    }
    if (parsedServiceAreas.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one service district/area is required.'
      });
    }

    let user = req.user || null;
    let issuedToken = null;

    // If not already logged in, create or authenticate User account with role 'guide'
    if (!user) {
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email address and password are required when registering a new guide account.'
        });
      }

      const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'An account with this email already exists. Please log in first to complete your guide profile.'
        });
      }

      user = await User.create({
        name: String(name).trim(),
        email: String(email).toLowerCase().trim(),
        passwordHash: password,
        role: 'guide',
        profileImage: profilePhoto || ''
      });
      issuedToken = user.getSignedJwtToken();
    } else {
      // Ensure authenticated user has guide role (unless admin)
      if (user.role !== 'guide' && user.role !== 'admin') {
        user.role = 'guide';
      }
      if (profilePhoto) {
        user.profileImage = profilePhoto;
      }
      await user.save();
      issuedToken = user.getSignedJwtToken();
    }

    // Check if Guide profile already exists for this user
    let guide = await Guide.findOne({ userId: user._id });
    const guidePayload = {
      userId: user._id,
      name: String(name).trim(),
      email: user.email,
      contactNumber: contactNumber ? String(contactNumber).trim() : '',
      profilePhoto: profilePhoto || user.profileImage || '',
      bio: bio ? String(bio).trim() : '',
      languages: parsedLanguages,
      serviceAreas: parsedServiceAreas,
      expertise: parsedExpertise,
      experienceYears: Math.max(0, Number(experienceYears) || 0),
      qualifications: parsedQualifications,
      currency: 'LKR',
      dailyRate: numericRate,
      availability: Boolean(availability),
      availabilityNotes: availabilityNotes || 'Available for island-wide tours',
      serviceStatus: Boolean(availability) ? 'active' : 'paused'
    };

    if (guide) {
      guide = await Guide.findByIdAndUpdate(guide._id, { $set: guidePayload }, { new: true, runValidators: true });
    } else {
      guide = await Guide.create(guidePayload);
    }

    const completion = computeGuideProfileCompletion(guide);

    res.status(201).json({
      success: true,
      token: issuedToken,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage
      },
      profileCompletion: completion,
      data: guide
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all registered guides with discovery filters
// @route   GET /api/guides
// @access  Public
exports.getGuides = async (req, res) => {
  try {

// @desc    Get all registered guides with discovery filters and currency conversion
// @route   GET /api/guides
// @access  Public
exports.getGuides = async (req, res) => {
  try {
    const {
      district,
      serviceArea,
      language,
      minPrice,
      maxPrice,
      minExperience,
      availability,
      minRating,
      search,
      sortBy
    } = req.query;

    const targetCurrency = (req.query.currency || 'LKR').toUpperCase();
    const validCurrency = SUPPORTED_CURRENCIES[targetCurrency]
      ? targetCurrency
      : 'LKR';

    const query = {};

    const areaFilter = district || serviceArea;

    if (areaFilter && String(areaFilter).trim()) {
      query.serviceAreas = {
        $elemMatch: {
          $regex: new RegExp(String(areaFilter).trim(), 'i')
        }
      };
    }

    if (language && String(language).trim()) {
      query.languages = {
        $elemMatch: {
          $regex: new RegExp(String(language).trim(), 'i')
        }
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.dailyRate = {};

      if (minPrice !== undefined && minPrice !== '') {
        query.dailyRate.$gte = Number(minPrice);
      }

      if (maxPrice !== undefined && maxPrice !== '') {
        query.dailyRate.$lte = Number(maxPrice);
      }
    }

    if (minExperience !== undefined && minExperience !== '') {
      query.experienceYears = {
        $gte: Number(minExperience)
      };
    }

    if (availability === 'true') {
      query.availability = true;
    } else if (availability === 'false') {
      query.availability = false;
    }

    if (minRating !== undefined && minRating !== '') {
      query.rating = {
        $gte: Number(minRating)
      };
    }

    let [guides, rateData] = await Promise.all([
      Guide.find(query).populate(
        'userId',
        'name email profileImage'
      ),
      getExchangeRates()
    ]);

    // Text search across name, bio, service areas, languages and expertise
    if (search && String(search).trim()) {
      const q = String(search).toLowerCase().trim();

      guides = guides.filter((g) => {
        const displayName = (g.name || g.userId?.name || '').toLowerCase();
        const bioMatch = (g.bio || '').toLowerCase().includes(q);

        const areaMatch = (g.serviceAreas || []).some((a) =>
          a.toLowerCase().includes(q)
        );

        const langMatch = (g.languages || []).some((l) =>
          l.toLowerCase().includes(q)
        );

        const expMatch = (g.expertise || []).some((e) =>
          e.toLowerCase().includes(q)
        );

        return (
          displayName.includes(q) ||
          bioMatch ||
          areaMatch ||
          langMatch ||
          expMatch
        );
      });
    }

    // Sorting
    if (sortBy === 'price_low') {
      guides.sort((a, b) => (a.dailyRate || 0) - (b.dailyRate || 0));
    } else if (sortBy === 'price_high') {
      guides.sort((a, b) => (b.dailyRate || 0) - (a.dailyRate || 0));
    } else if (sortBy === 'experience') {
      guides.sort(
        (a, b) => (b.experienceYears || 0) - (a.experienceYears || 0)
      );
    } else if (sortBy === 'rating') {
      guides.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    // Currency conversion and response
    const rate = validCurrency === 'LKR'
      ? 1
      : rateData.rates[validCurrency] || 1;

    const decimals = SUPPORTED_CURRENCIES[validCurrency]?.decimals ?? 2;

    const enriched = guides.map((g) => {
      const obj = g.toObject ? g.toObject() : { ...g };

      const dailyRateLKR = normalizeToLKR(
        obj.dailyRate,
        obj.currency || 'LKR',
        1000
      );

      return {
        ...obj,
        currency: 'LKR',
        dailyRateLKR,
        dailyRate: dailyRateLKR,
        dailyRateConverted: Number(
          (dailyRateLKR * rate).toFixed(decimals)
        ),
        displayCurrency: validCurrency,
        displayCurrencySymbol:
          SUPPORTED_CURRENCIES[validCurrency]?.symbol || 'Rs.'
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      baseCurrency: 'LKR',
      displayCurrency: validCurrency,
      data: enriched
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get authenticated guide's own profile & dashboard statistics
// @route   GET /api/guides/profile/me
// @access  Private (guide, admin)
exports.getMyGuideProfile = async (req, res) => {
  try {
    const guide = await Guide.findOne({ userId: req.user.id }).populate(
      'userId',
      'name email profileImage'
    );

    if (!guide) {
      return res.status(200).json({
        success: true,
        hasProfile: false,
        profileCompletion: { percentage: 0, missingFields: ['Create your guide profile'] },
        stats: {
          pendingRequests: 0,
          confirmedBookings: 0,
          completedTours: 0,
          totalConfirmedRevenueLKR: 0
        },
        recentBookings: [],
        recentReviews: [],
        data: null
      });
    }

    const [bookings, recentReviews] = await Promise.all([
      Booking.find({ guideId: guide._id })
        .populate('touristId', 'name email')
        .populate('tourPlanId')
        .sort({ createdAt: -1 })
        .lean(),
      Review.find({ targetType: 'guide', targetId: guide._id, status: 'active' })
        .populate('authorId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    const pendingRequests = bookings.filter((b) => b.status === 'Pending').length;
    const confirmedBookings = bookings.filter((b) => b.status === 'Confirmed').length;
    const completedTours = bookings.filter((b) => b.status === 'Completed').length;
    const totalConfirmedRevenueLKR = bookings
      .filter((b) => b.status === 'Confirmed' || b.status === 'Completed')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

    const completion = computeGuideProfileCompletion(guide);

    res.status(200).json({
      success: true,
      hasProfile: true,
      profileCompletion: completion,
      stats: {
        pendingRequests,
        confirmedBookings,
        completedTours,
        totalBookings: bookings.length,
        totalConfirmedRevenueLKR,
        averageRating: guide.rating || 0,
        reviewCount: guide.reviewCount || 0
      },
      recentBookings: bookings,
      recentReviews,
      data: guide
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update authenticated guide's own profile
// @route   PUT /api/guides/profile/me
// @access  Private (guide, admin)
exports.updateMyGuideProfile = async (req, res) => {
  try {
    let guide = await Guide.findOne({ userId: req.user.id });

    const {
      name,
      contactNumber,
      profilePhoto,
      bio,
      languages,
      serviceAreas,
      expertise,
      experienceYears,
      qualifications,
      dailyRate,
      availability,
      availabilityNotes,
      serviceStatus
    } = req.body || {};

    if (dailyRate !== undefined && (isNaN(Number(dailyRate)) || Number(dailyRate) <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'Daily rate must be a positive number.'
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (contactNumber !== undefined) updates.contactNumber = String(contactNumber).trim();
    if (profilePhoto !== undefined) updates.profilePhoto = String(profilePhoto).trim();
    if (bio !== undefined) updates.bio = String(bio).trim();
    if (languages !== undefined) updates.languages = parseStringArray(languages);
    if (serviceAreas !== undefined) updates.serviceAreas = parseStringArray(serviceAreas);
    if (expertise !== undefined) updates.expertise = parseStringArray(expertise);
    if (experienceYears !== undefined) {
      updates.experienceYears = Math.max(0, Number(experienceYears) || 0);
    }
    if (qualifications !== undefined) updates.qualifications = parseStringArray(qualifications);
    if (dailyRate !== undefined) updates.dailyRate = Number(dailyRate);
    if (availability !== undefined) {
      updates.availability = Boolean(availability);
      updates.serviceStatus = Boolean(availability) ? 'active' : 'paused';
    }
    if (availabilityNotes !== undefined) updates.availabilityNotes = String(availabilityNotes).trim();
    if (serviceStatus !== undefined && ['active', 'paused'].includes(serviceStatus)) {
      updates.serviceStatus = serviceStatus;
      updates.availability = serviceStatus === 'active';
    }

    if (!guide) {
      guide = await Guide.create({
        userId: req.user.id,
        name: updates.name || req.user.name,
        email: req.user.email,
        dailyRate: updates.dailyRate || 15000,
        ...updates
      });
    } else {
      guide = await Guide.findByIdAndUpdate(
        guide._id,
        { $set: updates },
        { new: true, runValidators: true }
      );
    }

    if (updates.name || updates.profilePhoto) {
      const userUpdates = {};
      if (updates.name) userUpdates.name = updates.name;
      if (updates.profilePhoto) userUpdates.profileImage = updates.profilePhoto;
      await User.findByIdAndUpdate(req.user.id, { $set: userUpdates });
    }

    const completion = computeGuideProfileCompletion(guide);

    res.status(200).json({
      success: true,
      profileCompletion: completion,
      data: guide
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update authenticated guide's availability & unavailable date ranges
// @route   PUT /api/guides/availability
// @access  Private (guide, admin)
exports.updateGuideAvailability = async (req, res) => {
  try {
    const guide = await Guide.findOne({ userId: req.user.id });
    if (!guide) {
      return res.status(404).json({
        success: false,
        error: 'Guide profile not found. Please complete your guide profile first.'
      });
    }

    const { availability, availabilityNotes, unavailableDates, serviceStatus } = req.body || {};

    if (availability !== undefined) {
      guide.availability = Boolean(availability);
      guide.serviceStatus = Boolean(availability) ? 'active' : 'paused';
    }
    if (serviceStatus && ['active', 'paused'].includes(serviceStatus)) {
      guide.serviceStatus = serviceStatus;
      guide.availability = serviceStatus === 'active';
    }
    if (availabilityNotes !== undefined) {
      guide.availabilityNotes = String(availabilityNotes).trim();
    }
    if (Array.isArray(unavailableDates)) {
      guide.unavailableDates = unavailableDates;
    }

    await guide.save();

    res.status(200).json({
      success: true,
      data: guide
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Check a guide's availability for specific dates
// @route   GET /api/guides/:id/availability
// @access  Public
exports.checkGuideAvailability = async (req, res) => {
  try {
    const guide = await Guide.findById(req.params.id).lean();
    if (!guide) {
      return res.status(404).json({ success: false, error: 'Guide not found' });
    }

    const { startDate, endDate } = req.query;
    let dateRangeAvailable = Boolean(guide.availability) && guide.serviceStatus !== 'paused';
    let conflictReason = dateRangeAvailable ? null : 'Guide is currently marked as unavailable.';

    const confirmedBookings = await Booking.find({
      guideId: guide._id,
      status: 'Confirmed'
    })
      .select('startDate endDate serviceDays')
      .lean();

    if (dateRangeAvailable && startDate && endDate) {
      const reqStart = new Date(startDate);
      const reqEnd = new Date(endDate);

      if (!isNaN(reqStart.getTime()) && !isNaN(reqEnd.getTime())) {
        // Check overlapping confirmed bookings
        const overlappingBooking = confirmedBookings.find((b) => {
          if (!b.startDate || !b.endDate) return false;
          const bStart = new Date(b.startDate);
          const bEnd = new Date(b.endDate);
          return reqStart <= bEnd && reqEnd >= bStart;
        });

        if (overlappingBooking) {
          dateRangeAvailable = false;
          conflictReason = 'Guide already has a confirmed booking during the selected dates.';
        }

        // Check guide's custom unavailableDates
        if (dateRangeAvailable && Array.isArray(guide.unavailableDates)) {
          const blockedRange = guide.unavailableDates.find((u) => {
            if (!u.startDate || !u.endDate) return false;
            return reqStart <= new Date(u.endDate) && reqEnd >= new Date(u.startDate);
          });
          if (blockedRange) {
            dateRangeAvailable = false;
            conflictReason = blockedRange.reason || 'Guide is unavailable on the selected dates.';
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        guideId: guide._id,
        name: guide.name,
        generalAvailability: Boolean(guide.availability),
        serviceStatus: guide.serviceStatus || 'active',
        availabilityNotes: guide.availabilityNotes || '',
        dateRangeAvailable,
        conflictReason,
        confirmedBookings,
        unavailableDates: guide.unavailableDates || []
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create guide (legacy endpoint with ownership assignment)
// @route   POST /api/guides
// @access  Private (guide, admin)
exports.createGuide = async (req, res) => {
  try {
    req.body.userId = req.user.id;
// @desc    Create guide (legacy endpoint with ownership assignment)
// @route   POST /api/guides
// @access  Private (guide, admin)
exports.createGuide = async (req, res) => {
  try {
    req.body.userId = req.user.id;

    // Set guide name from authenticated user if not provided
    if (!req.body.name) {
      req.body.name = req.user.name;
    }

    // Normalize daily rate to LKR
    if (req.body.dailyRate) {
      req.body.dailyRate = normalizeToLKR(
        req.body.dailyRate,
        req.body.currency || 'LKR',
        1000
      );

      req.body.currency = 'LKR';
    }

    const guide = await Guide.create(req.body);

    res.status(201).json({
      success: true,
      data: guide
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};
    const guide = await Guide.create(req.body);
    res.status(201).json({ success: true, data: guide });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update guide by ID (verified ownership)
// @route   PUT /api/guides/:id
// @access  Private (guide, admin)
exports.updateGuide = async (req, res) => {
  try {
    const existing = await Guide.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Guide not found' });
    }

    if (String(existing.userId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify another guide\'s profile.'
      });
    }

    delete req.body.userId;
    const guide = await Guide.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    res.status(200).json({ success: true, data: guide });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete guide by ID (verified ownership)
// @route   DELETE /api/guides/:id
// @access  Private (guide, admin)
exports.deleteGuide = async (req, res) => {
  try {
    const existing = await Guide.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Guide not found' });
    }

    if (String(existing.userId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete another guide\'s profile.'
      });
    }

    await Guide.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
