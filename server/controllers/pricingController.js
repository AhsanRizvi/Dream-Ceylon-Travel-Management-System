const {
  calculateCompleteTourPricing,
  calculateTourPlanPricingById,
  TRANSPORT_PRICING_RULES_LKR,
  MEAL_TYPE_RATES_LKR,
  PACKAGE_TIER_DEFAULTS_LKR
} = require('../services/pricingService');
const { getExchangeRates, SUPPORTED_CURRENCIES } = require('../services/currencyService');

// @desc    Calculate complete dynamic tour cost
// @route   POST /api/pricing/calculate
// @access  Public
exports.calculatePricing = async (req, res) => {
  try {
    const pricing = await calculateCompleteTourPricing(req.body || {});
    res.status(200).json({
      success: true,
      data: pricing
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get authoritative pricing rules (transport, meals, package tiers)
// @route   GET /api/pricing/rules
// @access  Public
exports.getPricingRules = async (req, res) => {
  try {
    const targetCurrency = (req.query.currency || 'LKR').toUpperCase();
    const validCurrency = SUPPORTED_CURRENCIES[targetCurrency] ? targetCurrency : 'LKR';
    const rateData = await getExchangeRates();
    const rate = validCurrency === 'LKR' ? 1 : rateData.rates[validCurrency] || 1;
    const decimals = SUPPORTED_CURRENCIES[validCurrency]?.decimals ?? 2;

    const convertVal = (lkr) => Number((Number(lkr || 0) * rate).toFixed(decimals));

    const transportRules = Object.values(TRANSPORT_PRICING_RULES_LKR).map((t) => ({
      ...t,
      ratePerDayPerVehicleConverted: convertVal(t.ratePerDayPerVehicleLKR),
      ratePerExtraKmConverted: convertVal(t.ratePerExtraKmLKR),
      directRouteRatePerKmConverted: convertVal(t.directRouteRatePerKmLKR)
    }));

    const mealRules = Object.values(MEAL_TYPE_RATES_LKR).map((m) => ({
      ...m,
      ratePerPersonDayConverted: convertVal(m.ratePerPersonDayLKR)
    }));

    const tierRules = Object.values(PACKAGE_TIER_DEFAULTS_LKR).map((p) => ({
      ...p,
      tierCoordinationPerPersonDayConverted: convertVal(p.tierCoordinationPerPersonDayLKR),
      defaultAccommodationPerRoomNightConverted: convertVal(p.defaultAccommodationPerRoomNightLKR),
      defaultGuideRatePerDayConverted: convertVal(p.defaultGuideRatePerDayLKR)
    }));

    res.status(200).json({
      success: true,
      baseCurrency: 'LKR',
      displayCurrency: validCurrency,
      exchangeRateFromLKR: rate,
      rateDate: rateData.rateDate,
      data: {
        transportRules,
        mealRules,
        tierRules
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get pricing breakdown for a saved TourPlan
// @route   GET /api/pricing/:tourPlanId
// @access  Public / Private
exports.getTourPlanPricing = async (req, res) => {
  try {
    const targetCurrency = req.query.currency || 'LKR';
    const result = await calculateTourPlanPricingById(req.params.tourPlanId, targetCurrency);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      success: false,
      error: err.message
    });
  }
};

