const Package = require('../models/Package');
const TouristProfile = require('../models/TouristProfile');
const TourPlan = require('../models/TourPlan');
const {
  calculateCompleteTourPricing,
  TRANSPORT_PRICING_RULES_LKR,
  MEAL_TYPE_RATES_LKR,
  PACKAGE_TIER_DEFAULTS_LKR
} = require('../services/pricingService');
const {
  normalizeToLKR,
  getExchangeRates,
  SUPPORTED_CURRENCIES
} = require('../services/currencyService');

/**
 * Helper to enrich a Package document with authoritative LKR pricing and converted currency fields
 */
const enrichPackageWithCurrency = (pkgObj, rateData, targetCurrency = 'LKR') => {
  const pkg = pkgObj.toObject ? pkgObj.toObject() : { ...pkgObj };
  const normalizedTarget = SUPPORTED_CURRENCIES[(targetCurrency || 'LKR').toUpperCase()]
    ? (targetCurrency || 'LKR').toUpperCase()
    : 'LKR';

  const rate = normalizedTarget === 'LKR' ? 1 : rateData?.rates?.[normalizedTarget] || 1;
  const decimals = SUPPORTED_CURRENCIES[normalizedTarget]?.decimals ?? 2;
  const symbol = SUPPORTED_CURRENCIES[normalizedTarget]?.symbol || 'Rs.';

  // Normalize baseCharge to LKR (if seeded with 85/180/350 USD legacy or 25500/54000/105000 LKR)
  const baseChargeLKR = normalizeToLKR(pkg.baseChargeLKR || pkg.baseCharge, pkg.currency || 'LKR', 1000);
  const guideAddonPriceLKR = normalizeToLKR(pkg.guideAddonPrice || 0, pkg.currency || 'LKR', 1000);

  const convertedBaseCharge = Number((baseChargeLKR * rate).toFixed(decimals));
  const convertedGuideAddonPrice = Number((guideAddonPriceLKR * rate).toFixed(decimals));

  const enrichedMealOptions = (pkg.mealOptions || []).map((meal) => {
    const extraLKR = normalizeToLKR(meal.extraCostPerDay || 0, pkg.currency || 'LKR', 500);
    return {
      ...meal,
      extraCostPerDayLKR: extraLKR,
      extraCostPerDay: extraLKR,
      extraCostPerDayConverted: Number((extraLKR * rate).toFixed(decimals))
    };
  });

  const enrichedGuideOptions = (pkg.guideOptions || []).map((guide) => {
    const rateLKR = normalizeToLKR(guide.dailyRate || 0, pkg.currency || 'LKR', 500);
    return {
      ...guide,
      dailyRateLKR: rateLKR,
      dailyRate: rateLKR,
      dailyRateConverted: Number((rateLKR * rate).toFixed(decimals))
    };
  });

  const tierRule = PACKAGE_TIER_DEFAULTS_LKR[pkg.packageName] || PACKAGE_TIER_DEFAULTS_LKR.Standard;

  return {
    ...pkg,
    currency: 'LKR',
    baseCharge: baseChargeLKR,
    baseChargeLKR,
    baseChargeConverted: convertedBaseCharge,
    guideAddonPrice: guideAddonPriceLKR,
    guideAddonPriceLKR,
    guideAddonPriceConverted: convertedGuideAddonPrice,
    displayCurrency: normalizedTarget,
    displayCurrencySymbol: symbol,
    exchangeRateFromLKR: rate,
    rateDate: rateData?.rateDate || null,
    inclusions: pkg.inclusions || {
      destinationsAndItinerary: true,
      routeAndTransport: true,
      accommodationIncluded: tierRule.includesAccommodation,
      mealsIncluded: tierRule.includesMeals,
      guideIncluded: tierRule.includesGuide
    },
    allowHotelSelection: pkg.packageName !== 'Basic',
    mealOptions: enrichedMealOptions,
    guideOptions: enrichedGuideOptions,
    supportedMealTypes: Object.values(MEAL_TYPE_RATES_LKR).map((m) => ({
      ...m,
      ratePerPersonDayConverted: Number((m.ratePerPersonDayLKR * rate).toFixed(decimals))
    })),
    supportedTransportTypes: Object.values(TRANSPORT_PRICING_RULES_LKR).map((t) => ({
      ...t,
      ratePerDayPerVehicleConverted: Number((t.ratePerDayPerVehicleLKR * rate).toFixed(decimals)),
      ratePerExtraKmConverted: Number((t.ratePerExtraKmLKR * rate).toFixed(decimals))
    }))
  };
};

// @desc    Get all tour packages
// @route   GET /api/packages
// @access  Public
exports.getPackages = async (req, res) => {
  try {
    const targetCurrency = req.query.currency || 'LKR';
    const [packages, rateData] = await Promise.all([
      Package.find(),
      getExchangeRates()
    ]);

    const order = { Basic: 1, Standard: 2, Premium: 3 };
    const sorted = packages
      .map((p) => enrichPackageWithCurrency(p, rateData, targetCurrency))
      .sort((a, b) => (order[a.packageName] || 9) - (order[b.packageName] || 9));

    res.status(200).json({
      success: true,
      count: sorted.length,
      baseCurrency: 'LKR',
      displayCurrency: (targetCurrency || 'LKR').toUpperCase(),
      rateDate: rateData.rateDate,
      data: sorted
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get single package by ID or packageName
// @route   GET /api/packages/:id
// @access  Public
exports.getPackageById = async (req, res) => {
  try {
    const targetCurrency = req.query.currency || 'LKR';
    const idOrName = req.params.id;
    let pkg = null;

    if (/^[0-9a-fA-F]{24}$/.test(idOrName)) {
      pkg = await Package.findById(idOrName);
    }
    if (!pkg) {
      pkg = await Package.findOne({
        packageName: new RegExp(`^${idOrName}$`, 'i')
      });
    }

    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    const rateData = await getExchangeRates();
    const enriched = enrichPackageWithCurrency(pkg, rateData, targetCurrency);

    res.status(200).json({
      success: true,
      baseCurrency: 'LKR',
      displayCurrency: enriched.displayCurrency,
      rateDate: rateData.rateDate,
      data: enriched
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create a new package (Admin)
// @route   POST /api/packages
// @access  Private/Admin
exports.createPackage = async (req, res) => {
  try {
    const newPackage = await Package.create(req.body);
    res.status(201).json({ success: true, data: newPackage });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Calculate dynamic package cost
// @route   POST /api/packages/calculate
// @access  Public
exports.calculatePackagePrice = async (req, res) => {
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

// @desc    Select a package and update trip planning / profile state
// @route   POST /api/packages/select
// @access  Public / Optional Auth
exports.selectPackageForTrip = async (req, res) => {
  try {
    const {
      packageId,
      packageName,
      tourPlanId,
      days = 3,
      travelers = 2,
      vehicleType = 'Car',
      hotelId = null,
      roomType = null,
      numberOfRooms = null,
      mealType = 'Vegetarian',
      selectedMealOption = null,
      addGuide = false,
      guideId = null,
      selectedGuideOption = null,
      targetCurrency = 'LKR'
    } = req.body || {};

    let pkg = null;
    if (packageId && /^[0-9a-fA-F]{24}$/.test(packageId)) {
      pkg = await Package.findById(packageId);
    }
    if (!pkg && packageName) {
      pkg = await Package.findOne({ packageName: new RegExp(`^${packageName}$`, 'i') });
    }
    if (!pkg) {
      return res.status(404).json({
        success: false,
        error: 'Valid packageId or packageName (Basic, Standard, Premium) is required.'
      });
    }

    // Calculate authoritative pricing for this selection
    const pricing = await calculateCompleteTourPricing({
      packageId: pkg._id,
      packageName: pkg.packageName,
      days,
      travelers,
      vehicleType,
      hotelId,
      roomType,
      numberOfRooms,
      mealType,
      selectedMealOption,
      addGuide,
      guideId,
      selectedGuideOption,
      targetCurrency
    });

    // If tourPlanId is provided, update that TourPlan in MongoDB
    let updatedTourPlan = null;
    if (tourPlanId && /^[0-9a-fA-F]{24}$/.test(tourPlanId)) {
      updatedTourPlan = await TourPlan.findByIdAndUpdate(
        tourPlanId,
        {
          $set: {
            packageId: pkg._id,
            packageName: pkg.packageName,
            days,
            travelers,
            transportType: vehicleType,
            selectedHotelId: hotelId || null,
            selectedRoomType: roomType || '',
            numberOfRooms: numberOfRooms || 1,
            selectedGuideId: guideId || null,
            mealType: pkg.packageName === 'Premium' ? mealType : 'None',
            customizations: {
              addGuide,
              selectedMealOption,
              selectedGuideOption
            },
            pricingSummary: pricing,
            totalEstimatedCostLKR: pricing.summary.totalEstimatedCostLKR,
            currency: pricing.currency.code
          }
        },
        { new: true }
      );
    }

    // If req.user is present, also store selected package in TouristProfile
    if (req.user && req.user.id) {
      await TouristProfile.findOneAndUpdate(
        { userId: req.user.id },
        {
          $set: {
            selectedPackageId: pkg._id,
            selectedPackageName: pkg.packageName
          }
        },
        { upsert: true, new: true }
      );
    }

    const rateData = await getExchangeRates();
    const enrichedPackage = enrichPackageWithCurrency(pkg, rateData, targetCurrency);

    res.status(200).json({
      success: true,
      message: `${pkg.packageName} Package selected successfully.`,
      data: {
        selectedPackage: enrichedPackage,
        pricing,
        updatedTourPlan
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
