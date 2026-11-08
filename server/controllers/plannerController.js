const TourPlan = require('../models/TourPlan');
const TouristProfile = require('../models/TouristProfile');
const { recommendDestinations } = require('../services/recommendationEngine');
const { calculateCompleteTourPricing } = require('../services/pricingService');

// @desc    Get recommendations
// @route   GET /api/planner/recommendations
// @access  Private (Tourist)
exports.getRecommendations = async (req, res) => {
  try {
    const profile = await TouristProfile.findOne({ userId: req.user.id });

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Tourist profile not found' });
    }

    const recommendations = await recommendDestinations(profile);
    res.status(200).json({ success: true, data: recommendations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a tour plan with authoritative dynamic pricing
// @route   POST /api/planner/plan
// @access  Private (Tourist)
exports.createPlan = async (req, res) => {
  try {
    req.body.touristId = req.user.id;

    // Calculate authoritative pricing summary if not already provided
    const pricing = await calculateCompleteTourPricing({
      packageId: req.body.packageId,
      packageName: req.body.packageName || 'Standard',
      days: req.body.days || 3,
      travelers: req.body.travelers || 2,
      vehicleType: req.body.transportType || req.body.vehicleType || 'Car',
      routeDistanceKm: req.body.routeData?.distanceKm || 0,
      hotelId: req.body.selectedHotelId || req.body.hotelId || null,
      roomType: req.body.selectedRoomType || req.body.roomType || null,
      numberOfRooms: req.body.numberOfRooms || null,
      mealType: req.body.mealType && req.body.mealType !== 'None' ? req.body.mealType : 'Vegetarian',
      selectedMealOption: req.body.customizations?.selectedMealOption,
      addGuide: Boolean(req.body.customizations?.addGuide || req.body.selectedGuideId),
      guideId: req.body.selectedGuideId || req.body.guideId || null,
      selectedGuideOption: req.body.customizations?.selectedGuideOption,
      targetCurrency: req.body.currency || 'LKR'
    });

    req.body.pricingSummary = pricing;
    req.body.totalEstimatedCostLKR = pricing.summary.totalEstimatedCostLKR;
    req.body.currency = 'LKR';

    const plan = await TourPlan.create(req.body);
    res.status(201).json({ success: true, data: plan, pricing });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get saved tour plans for authenticated tourist
// @route   GET /api/planner/plans
// @access  Private (Tourist)
exports.getMyPlans = async (req, res) => {
  try {
    const plans = await TourPlan.find({ touristId: req.user.id })
      .populate('stops packageId selectedHotelId selectedGuideId')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: plans.length, data: plans });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
