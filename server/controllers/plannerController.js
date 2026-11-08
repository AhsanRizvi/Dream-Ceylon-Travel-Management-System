
const TourPlan = require('../models/TourPlan');
const TouristProfile = require('../models/TouristProfile');
const Destination = require('../models/Destination');

const {
  recommendDestinations,
  enrichDestinationMetadata,
  normalizeWeights
} = require('../services/recommendationEngine');

const { generateDayByDayItinerary } = require('../services/itineraryGenerator');
const { calculateCompleteTourPricing } = require('../services/pricingService');

const VALID_MEAL_TYPES = [
  'Vegetarian',
  'Vegan',
  'Seafood',
  'All meat types',
  'Non-Vegetarian',
  'Halal',
  'Any'
];

const VALID_WEATHER = [
  'Cool',
  'Hot',
  'Cloudy',
  'Cold',
  'Moderate',
  'Any'
];

const VALID_TRANSPORT = [
  'Motorcycle',
  'Car',
  'Van',
  'Bus',
  'Train',
  'Public'
];

const VALID_GUIDE = ['Required', 'Not required'];
const VALID_PACKAGES = ['Basic', 'Standard', 'Premium'];

/**
 * Validate tourist preferences payload
 */
const validatePreferencePayload = (body = {}, requireEnvironments = true) => {
  const errors = [];

  const days = Number(body.travelDays ?? body.days);

  if (!Number.isInteger(days) || days < 1 || days > 30) {
    errors.push(
      'Number of travel days must be a valid whole number between 1 and 30.'
    );
  }

  const travelers = Number(body.travelers ?? body.groupSize);

  if (!Number.isInteger(travelers) || travelers < 1 || travelers > 50) {
    errors.push(
      'Number of travellers must be at least 1 (maximum 50).'
    );
  }

  const mealType = body.mealType;

  if (!mealType || !VALID_MEAL_TYPES.includes(mealType)) {
    errors.push(
      'Please select a valid preferred meal type.'
    );
  }

  const environments = Array.isArray(body.environments)
    ? body.environments.filter(Boolean)
    : Array.isArray(body.interests)
      ? body.interests.filter(Boolean)
      : [];

  if (requireEnvironments && environments.length === 0) {
    errors.push(
      'Please select at least one preferred travel environment.'
    );
  }

  const weatherPreference = body.weatherPreference;

  if (!weatherPreference || !VALID_WEATHER.includes(weatherPreference)) {
    errors.push(
      'Please select a valid preferred weather.'
    );
  }

  const transportation = body.transportation ?? body.vehicleType;

  if (!transportation || !VALID_TRANSPORT.includes(transportation)) {
    errors.push(
      'Please select a valid transportation mode.'
    );
  }

  const guideRequirement =
    body.guideRequirement ??
    (typeof body.guideRequired === 'boolean'
      ? body.guideRequired
        ? 'Required'
        : 'Not required'
      : null);

  if (!guideRequirement || !VALID_GUIDE.includes(guideRequirement)) {
    errors.push(
      'Please specify guide requirement.'
    );
  }

  const packageLevel = body.packageLevel;

  if (!packageLevel || !VALID_PACKAGES.includes(packageLevel)) {
    errors.push(
      'Please select a valid package level.'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleaned: {
      travelDays: days,
      travelers,
      groupSize: travelers,
      mealType,
      environments,
      interests: environments,
      weatherPreference,
      transportation,
      guideRequirement,
      guideRequired: guideRequirement === 'Required',
      packageLevel,
      startDate: body.startDate
        ? new Date(body.startDate)
        : undefined,
      preferredCurrency: body.preferredCurrency || 'LKR'
    }
  };
};


// @desc    Save or update tourist preferences
// @route   POST /api/planner/preferences
// @access  Private (Tourist, Admin)

exports.savePreferences = async (req, res) => {
  try {
    const validation = validatePreferencePayload(req.body, true);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0],
        errors: validation.errors
      });
    }

    const profile = await TouristProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          userId: req.user.id,
          ...validation.cleaned
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Tourist preferences saved successfully.',
      data: profile
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};


// @desc    Get current user's saved tourist preferences
// @route   GET /api/planner/preferences
// @access  Private (Tourist, Admin)

exports.getPreferences = async (req, res) => {
  try {
    const profile = await TouristProfile.findOne({
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      data: profile || null
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


// @desc    Generate personalized recommendations
// @route   POST /api/planner/recommendations
// @access  Private (Tourist, Admin)

exports.generateRecommendations = async (req, res) => {
  try {
    const validation = validatePreferencePayload(req.body, true);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0],
        errors: validation.errors
      });
    }

    let profile = null;

    if (req.user && req.user.id) {
      profile = await TouristProfile.findOneAndUpdate(
        { userId: req.user.id },
        {
          $set: {
            userId: req.user.id,
            ...validation.cleaned
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      );
    }

    const weights = normalizeWeights(req.body.weights);

    const recommendations = await recommendDestinations(
      {
        ...validation.cleaned,
        weights: req.body.weights
      },
      {
        limit: req.body.limit
      }
    );

    res.status(200).json({
      success: true,
      count: recommendations.length,
      preferences: validation.cleaned,
      profileId: profile?._id || null,
      scoringWeights: weights.percentages,
      data: recommendations
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


// @desc    Get recommendations based on saved profile or query parameters
// @route   GET /api/planner/recommendations
// @access  Private (Tourist, Admin)

exports.getRecommendations = async (req, res) => {
  try {
    const profile = await TouristProfile.findOne({
      userId: req.user.id
    });

    // Use query parameters if profile does not exist
    if (!profile && req.query && (req.query.environments || req.query.interests)) {
      const envs = (req.query.environments || req.query.interests || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const recommendations = await recommendDestinations({
        environments: envs,
        weatherPreference: req.query.weatherPreference || 'Cool',
        travelDays: Number(req.query.days) || 3
      });

      return res.status(200).json({
        success: true,
        count: recommendations.length,
        data: recommendations
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Tourist profile not found. Please submit your travel preferences first.'
      });
    }

    const recommendations = await recommendDestinations(
      profile.toObject()
    );

    res.status(200).json({
      success: true,
      count: recommendations.length,
      preferences: profile,
      data: recommendations
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


// @desc    Get recommendation details for a destination or saved plan
// @route   GET /api/planner/recommendations/:id
// @access  Private (Tourist, Admin)

exports.getRecommendationById = async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await TouristProfile.findOne({
      userId: req.user.id
    });

    // First check whether the ID belongs to a Destination
    const dest = await Destination.findById(id);

    if (dest) {
      const destinationData = enrichDestinationMetadata(dest);

      const allRecs = await recommendDestinations(
        profile
          ? profile.toObject()
          : {
              environments: destinationData.environments || [],
              weatherPreference: 'Any'
            }
      );

      const matched = allRecs.find(
        (r) =>
          r.destination._id.toString() === dest._id.toString()
      );

      return res.status(200).json({
        success: true,
        data: matched || {
          destination: destinationData,
          matchScore: 75,
          reasons: ['Selected Sri Lankan destination']
        }
      });
    }

    // Otherwise check whether the ID belongs to a saved TourPlan
    const plan = await TourPlan.findOne({
      _id: id,
      touristId: req.user.id
    }).populate('stops');

    if (plan) {
      return res.status(200).json({
        success: true,
        data: plan
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Recommendation or destination not found'
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};


// @desc    Create a tour plan with itinerary generation and dynamic pricing
// @route   POST /api/planner/plan
// @access  Private (Tourist, Admin)

exports.createPlan = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      touristId: req.user.id
    };

    // Generate daily itinerary if one was not supplied
    if (
      !payload.dailyItinerary ||
      payload.dailyItinerary.length === 0
    ) {
      if (Array.isArray(payload.stops) && payload.stops.length > 0) {
        const generated = await generateDayByDayItinerary({
          destinations: payload.stops,
          days: payload.days || 3,
          startDate: payload.dates?.start || payload.startDate,
          preferences: payload.preferences || {
            transportation: payload.transportType || 'Car'
          }
        });

        payload.dailyItinerary = generated.dailyItinerary;
        payload.dates = generated.dates;
      }
    }

    // Calculate authoritative dynamic pricing
    const pricing = await calculateCompleteTourPricing({
      packageId: payload.packageId,
      packageName: payload.packageName || 'Standard',
      days: payload.days || 3,
      travelers: payload.travelers || 2,
      vehicleType:
        payload.transportType ||
        payload.vehicleType ||
        'Car',
      routeDistanceKm: payload.routeData?.distanceKm || 0,
      hotelId:
        payload.selectedHotelId ||
        payload.hotelId ||
        null,
      roomType:
        payload.selectedRoomType ||
        payload.roomType ||
        null,
      numberOfRooms: payload.numberOfRooms || null,
      mealType:
        payload.mealType && payload.mealType !== 'None'
          ? payload.mealType
          : 'Vegetarian',
      selectedMealOption:
        payload.customizations?.selectedMealOption,
      addGuide: Boolean(
        payload.customizations?.addGuide ||
        payload.selectedGuideId
      ),
      guideId:
        payload.selectedGuideId ||
        payload.guideId ||
        null,
      selectedGuideOption:
        payload.customizations?.selectedGuideOption,
      targetCurrency: payload.currency || 'LKR'
    });

    // Save calculated pricing in LKR
    payload.pricingSummary = pricing;
    payload.totalEstimatedCostLKR =
      pricing.summary.totalEstimatedCostLKR;
    payload.currency = 'LKR';

    const plan = await TourPlan.create(payload);

    const populated = await TourPlan.findById(plan._id)
      .populate('stops packageId selectedHotelId selectedGuideId');

    res.status(201).json({
      success: true,
      data: populated,
      pricing
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};


// @desc    Get saved tour plans for authenticated tourist
// @route   GET /api/planner/plans
// @access  Private (Tourist)

exports.getMyPlans = async (req, res) => {
  try {
    const plans = await TourPlan.find({
      touristId: req.user.id
    })
      .populate('stops packageId selectedHotelId selectedGuideId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
