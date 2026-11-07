const Package = require('../models/Package');
const Hotel = require('../models/Hotel');
const Guide = require('../models/Guide');
const TourPlan = require('../models/TourPlan');
const {
  normalizeToLKR,
  getExchangeRates,
  convertFromLKR,
  SUPPORTED_CURRENCIES
} = require('./currencyService');

/**
 * Authoritative Transport Pricing Rules in LKR (Sri Lankan Rupees)
 * Clearly distinguishes between per-day, per-kilometer, per-vehicle, and per-person charges.
 */
const TRANSPORT_PRICING_RULES_LKR = {
  Motorcycle: {
    vehicleType: 'Motorcycle',
    label: 'Touring Scooter / Motorcycle (1–2 Pax)',
    capacityPerVehicle: 2,
    ratePerDayPerVehicleLKR: 6500,
    includedKmPerDay: 120,
    ratePerExtraKmLKR: 45,
    directRouteRatePerKmLKR: 55,
    chargeBasis: 'per_vehicle_per_day_plus_excess_km',
    description: 'Ideal for solo backpackers or couples exploring scenic hill-country & coastal roads.'
  },
  Car: {
    vehicleType: 'Car',
    label: 'Air-Conditioned Sedan Car with Chauffeur (1–3 Pax)',
    capacityPerVehicle: 3,
    ratePerDayPerVehicleLKR: 15000,
    includedKmPerDay: 150,
    ratePerExtraKmLKR: 85,
    directRouteRatePerKmLKR: 95,
    chargeBasis: 'per_vehicle_per_day_plus_excess_km',
    description: 'Private air-conditioned sedan car with licensed chauffeur-driver, fuel, and highway tolls.'
  },
  Van: {
    vehicleType: 'Van',
    label: 'Air-Conditioned KDH Passenger Van with Chauffeur (4–8 Pax)',
    capacityPerVehicle: 8,
    ratePerDayPerVehicleLKR: 24000,
    includedKmPerDay: 180,
    ratePerExtraKmLKR: 115,
    directRouteRatePerKmLKR: 130,
    chargeBasis: 'per_vehicle_per_day_plus_excess_km',
    description: 'Spacious high-roof tourist van with dual A/C, luggage bay, and licensed chauffeur.'
  },
  Bus: {
    vehicleType: 'Bus',
    label: 'Tourist Mini-Coach with Chauffeur (9–20 Pax)',
    capacityPerVehicle: 20,
    ratePerDayPerVehicleLKR: 36000,
    includedKmPerDay: 200,
    ratePerExtraKmLKR: 160,
    directRouteRatePerKmLKR: 175,
    chargeBasis: 'per_vehicle_per_day_plus_excess_km',
    description: 'Group touring mini-coach with dedicated driver and assistant.'
  }
};

/**
 * Authoritative Meal Type Pricing Rules in LKR (per person, per day - Breakfast, Lunch & Dinner)
 */
const MEAL_TYPE_RATES_LKR = {
  Vegetarian: {
    mealType: 'Vegetarian',
    label: 'Vegetarian Meal Plan (Breakfast, Lunch & Dinner)',
    ratePerPersonDayLKR: 4500,
    mealsPerDay: 3,
    description: 'Authentic Sri Lankan & continental vegetarian buffets, organic curries, and tropical fruits.'
  },
  Vegan: {
    mealType: 'Vegan',
    label: '100% Plant-Based Vegan Meal Plan (Breakfast, Lunch & Dinner)',
    ratePerPersonDayLKR: 4800,
    mealsPerDay: 3,
    description: 'Coconut-milk curries, jackfruit delicacies, red rice, fresh salads, and herbal infusions.'
  },
  Seafood: {
    mealType: 'Seafood',
    label: 'Coastal Seafood Deluxe Meal Plan (Breakfast, Lunch & Dinner)',
    ratePerPersonDayLKR: 7500,
    mealsPerDay: 3,
    description: 'Fresh Indian Ocean catch including lagoon crab, jumbo prawns, grilled seer fish, and tuna.'
  },
  'All meat types': {
    mealType: 'All meat types',
    label: 'All Meat & Mixed Gourmet Plan (Breakfast, Lunch & Dinner)',
    ratePerPersonDayLKR: 6500,
    mealsPerDay: 3,
    description: 'Full selection of poultry, beef, mutton, seafood, and traditional Sri Lankan rice & curry spreads.'
  }
};

/**
 * Package Tier Coordination & Facility Rules in LKR
 */
const PACKAGE_TIER_DEFAULTS_LKR = {
  Basic: {
    packageName: 'Basic',
    tierCoordinationPerPersonDayLKR: 4500,
    defaultAccommodationPerRoomNightLKR: 0,
    defaultGuideRatePerDayLKR: 0,
    includesAccommodation: false,
    includesMeals: false,
    includesGuide: false,
    allowOptionalGuide: false,
    allowOptionalHotel: false,
    allowOptionalMeals: false,
    nonFoodFacilities: [
      'Personalized destination recommendations & day-by-day itinerary schedule',
      'Turn-by-turn route planning & road distance optimization',
      '24/7 emergency road assistance hotline'
    ]
  },
  Standard: {
    packageName: 'Standard',
    tierCoordinationPerPersonDayLKR: 7500,
    defaultAccommodationPerRoomNightLKR: 36000, // 3-4 Star handpicked hotel estimate (~$120/night)
    defaultGuideRatePerDayLKR: 13500, // Optional guide add-on (~$45/day)
    includesAccommodation: true,
    includesMeals: false,
    includesGuide: false,
    allowOptionalGuide: true,
    allowOptionalHotel: true,
    allowOptionalMeals: false,
    nonFoodFacilities: [
      'On-board 4G Wi-Fi router & chilled bottled mineral water',
      'Hotel check-in coordination, luggage porterage & concierge support',
      'All expressway toll charges, parking & chauffeur lodging'
    ]
  },
  Premium: {
    packageName: 'Premium',
    tierCoordinationPerPersonDayLKR: 16500,
    defaultAccommodationPerRoomNightLKR: 63000, // 5-Star luxury resort estimate (~$210/night)
    defaultGuideRatePerDayLKR: 18000, // Specialist national guide included (~$60/day)
    includesAccommodation: true,
    includesMeals: true,
    includesGuide: true,
    allowOptionalGuide: true,
    allowOptionalHotel: true,
    allowOptionalMeals: true,
    nonFoodFacilities: [
      'VIP Airport fast-track lounge & priority baggage handling',
      'UNESCO heritage site entrance passes & national park safari jeep permits',
      'Complimentary Ayurvedic wellness spa voucher & cultural dance show tickets',
      'On-board Wi-Fi, refreshments & 24/7 personal travel butler'
    ]
  }
};

/**
 * 1. Calculate Transportation Charges in LKR
 */
const calculateTransportationCost = ({
  vehicleType = 'Car',
  days = 1,
  travelers = 1,
  routeDistanceKm = 0
}) => {
  const normalizedVehicle =
    TRANSPORT_PRICING_RULES_LKR[vehicleType]
      ? vehicleType
      : vehicleType?.toLowerCase() === 'motorcycle' || vehicleType?.toLowerCase() === 'bike'
      ? 'Motorcycle'
      : vehicleType?.toLowerCase() === 'van'
      ? 'Van'
      : vehicleType?.toLowerCase() === 'bus'
      ? 'Bus'
      : 'Car';

  const rule = TRANSPORT_PRICING_RULES_LKR[normalizedVehicle];
  const safeDays = Math.max(1, Number(days) || 1);
  const safeTravelers = Math.max(1, Number(travelers) || 1);
  const safeDistanceKm = Math.max(0, Number(routeDistanceKm) || 0);

  // Determine how many vehicles are required for the group size
  const vehiclesCount = Math.max(1, Math.ceil(safeTravelers / rule.capacityPerVehicle));

  // Per-day vehicle base charge
  const baseVehicleDaysLKR = rule.ratePerDayPerVehicleLKR * safeDays * vehiclesCount;

  // Distance calculation: compare routeDistanceKm against included daily km allowance
  const includedTotalKm = rule.includedKmPerDay * safeDays;
  const excessKm = safeDistanceKm > includedTotalKm ? Number((safeDistanceKm - includedTotalKm).toFixed(1)) : 0;
  const excessDistanceChargeLKR = Math.round(excessKm * rule.ratePerExtraKmLKR * vehiclesCount);

  const totalLKR = baseVehicleDaysLKR + excessDistanceChargeLKR;
  const perPersonLKR = Math.round(totalLKR / safeTravelers);

  return {
    included: true,
    vehicleType: normalizedVehicle,
    vehicleLabel: rule.label,
    capacityPerVehicle: rule.capacityPerVehicle,
    vehiclesCount,
    days: safeDays,
    travelers: safeTravelers,
    ratePerDayPerVehicleLKR: rule.ratePerDayPerVehicleLKR,
    includedTotalKm,
    routeDistanceKm: safeDistanceKm,
    excessKm,
    ratePerExtraKmLKR: rule.ratePerExtraKmLKR,
    baseVehicleDaysLKR,
    excessDistanceChargeLKR,
    totalLKR,
    perPersonLKR,
    chargeBasis: rule.chargeBasis,
    pricingType: safeDistanceKm > 0 ? 'confirmed_route_estimate' : 'estimated',
    breakdownText:
      excessKm > 0
        ? `${vehiclesCount} × ${normalizedVehicle} for ${safeDays} day(s) (Rs. ${rule.ratePerDayPerVehicleLKR.toLocaleString()}/day) + ${excessKm} excess km × Rs. ${rule.ratePerExtraKmLKR}/km`
        : `${vehiclesCount} × ${normalizedVehicle} for ${safeDays} day(s) × Rs. ${rule.ratePerDayPerVehicleLKR.toLocaleString()}/day (includes up to ${includedTotalKm} km)`
  };
};

/**
 * 2. Calculate Accommodation Charges in LKR
 * Integrates directly with Member 4's Hotel model when hotelId is provided.
 */
const calculateAccommodationCost = async ({
  packageName = 'Standard',
  days = 1,
  stayNights = null,
  travelers = 1,
  hotelId = null,
  roomType = null,
  numberOfRooms = null
}) => {
  const tierRule = PACKAGE_TIER_DEFAULTS_LKR[packageName] || PACKAGE_TIER_DEFAULTS_LKR.Standard;
  const safeDays = Math.max(1, Number(days) || 1);
  const nights = stayNights !== null && Number(stayNights) > 0 ? Number(stayNights) : safeDays;
  const safeTravelers = Math.max(1, Number(travelers) || 1);

  // Basic Package Rule: Accommodation is NOT automatically included
  if (packageName === 'Basic' && !hotelId) {
    return {
      included: false,
      hotelId: null,
      hotelName: 'Not Included in Basic Package',
      location: null,
      roomType: 'Self-Arranged by Tourist',
      roomsCount: 0,
      roomCapacity: 0,
      nights: 0,
      ratePerNightLKR: 0,
      totalLKR: 0,
      availabilityStatus: 'Not Applicable',
      isAvailable: true,
      nonFoodFacilities: [],
      pricingType: 'excluded',
      breakdownText: 'Basic Package does not include hotel accommodation (self-arranged).'
    };
  }

  // Check if a specific partner hotel from MongoDB was selected
  let hotelDoc = null;
  if (hotelId) {
    try {
      hotelDoc = await Hotel.findById(hotelId).lean();
    } catch (e) {
      hotelDoc = null;
    }
  }

  if (hotelDoc) {
    const baseNightlyLKR = normalizeToLKR(hotelDoc.pricePerNight, hotelDoc.currency || 'LKR', 1000);
    let matchedRoom = null;
    if (Array.isArray(hotelDoc.rooms) && hotelDoc.rooms.length > 0) {
      if (roomType) {
        matchedRoom = hotelDoc.rooms.find(
          (r) => r.type && r.type.toLowerCase() === roomType.toLowerCase()
        );
      }
      if (!matchedRoom) {
        matchedRoom = hotelDoc.rooms[0];
      }
    }

    const roomCapacity = Math.max(1, Number(matchedRoom?.capacity) || 2);
    const minRoomsForParty = Math.ceil(safeTravelers / roomCapacity);
    const roomsCount =
      numberOfRooms && Number(numberOfRooms) > 0
        ? Math.max(Number(numberOfRooms), minRoomsForParty)
        : minRoomsForParty;

    // Room-specific rate if defined, or suite multiplier if family/suite room
    let roomNightlyLKR = baseNightlyLKR;
    if (matchedRoom?.pricePerNight) {
      roomNightlyLKR = normalizeToLKR(matchedRoom.pricePerNight, hotelDoc.currency || 'LKR', 1000);
    } else if (matchedRoom && roomCapacity > 2) {
      roomNightlyLKR = Math.round(baseNightlyLKR * 1.35);
    }

    const availableRoomInventory = matchedRoom?.count ?? 10;
    const isAvailable = Boolean(hotelDoc.availability) && availableRoomInventory >= roomsCount;
    const totalLKR = roomNightlyLKR * roomsCount * nights;

    return {
      included: true,
      hotelId: String(hotelDoc._id),
      hotelName: hotelDoc.name,
      location: hotelDoc.location,
      roomType: matchedRoom?.type || roomType || 'Standard Double Room',
      roomsCount,
      roomCapacity,
      availableRoomInventory,
      nights,
      ratePerNightLKR: roomNightlyLKR,
      totalLKR,
      availabilityStatus: isAvailable
        ? 'Available (Verified Partner Record)'
        : !hotelDoc.availability
        ? 'Hotel Currently Unavailable'
        : `Limited Inventory (${availableRoomInventory} rooms left)`,
      isAvailable,
      nonFoodFacilities:
        hotelDoc.facilities && hotelDoc.facilities.length > 0
          ? hotelDoc.facilities
          : tierRule.nonFoodFacilities,
      pricingType: 'confirmed',
      breakdownText: `${hotelDoc.name} (${matchedRoom?.type || 'Standard Room'}) — ${roomsCount} room(s) × ${nights} night(s) × Rs. ${roomNightlyLKR.toLocaleString()}/night`
    };
  }

  // Otherwise use package tier estimated hotel rate (Standard 3-4★ or Premium 5★)
  const roomCapacity = 2;
  const minRoomsForParty = Math.ceil(safeTravelers / roomCapacity);
  const roomsCount =
    numberOfRooms && Number(numberOfRooms) > 0
      ? Math.max(Number(numberOfRooms), minRoomsForParty)
      : minRoomsForParty;
  const ratePerNightLKR = tierRule.defaultAccommodationPerRoomNightLKR;
  const totalLKR = ratePerNightLKR * roomsCount * nights;

  return {
    included: true,
    hotelId: null,
    hotelName:
      packageName === 'Premium'
        ? '5-Star Luxury Resort / Heritage Villa (Tier Estimate)'
        : '3–4 Star Handpicked Partner Hotel (Tier Estimate)',
    location: 'Itinerary Destinations',
    roomType: packageName === 'Premium' ? 'Luxury Deluxe Suite' : 'Superior Double Room',
    roomsCount,
    roomCapacity,
    nights,
    ratePerNightLKR,
    totalLKR,
    availabilityStatus: 'Estimated Tier Rate (Select a specific partner hotel to confirm)',
    isAvailable: true,
    nonFoodFacilities: tierRule.nonFoodFacilities,
    pricingType: 'estimated',
    breakdownText: `${roomsCount} room(s) × ${nights} night(s) × Rs. ${ratePerNightLKR.toLocaleString()}/night (${packageName} Tier Estimate)`
  };
};

/**
 * 3. Calculate Food and Meal Charges in LKR
 * Ensures Basic and Standard packages do NOT charge for unincluded meals unless opted in.
 */
const calculateMealCost = ({
  packageName = 'Standard',
  pkgDoc = null,
  days = 1,
  travelers = 1,
  mealType = 'Vegetarian',
  selectedMealOption = null,
  includeOptionalMeals = false
}) => {
  const safeDays = Math.max(1, Number(days) || 1);
  const safeTravelers = Math.max(1, Number(travelers) || 1);

  // Rule check: Basic and Standard packages do NOT automatically include meals
  const mealsIncludedByPackage = packageName === 'Premium' || Boolean(includeOptionalMeals);

  if (!mealsIncludedByPackage) {
    return {
      included: false,
      mealType: 'Excluded',
      mealOptionName:
        packageName === 'Basic'
          ? 'Not Included in Basic Package'
          : 'Excluded by Default in Standard Package',
      mealsPerDay: 0,
      days: safeDays,
      travelers: safeTravelers,
      ratePerPersonDayLKR: 0,
      culinaryPremiumPerPersonDayLKR: 0,
      totalLKR: 0,
      pricingType: 'excluded',
      breakdownText:
        packageName === 'Basic'
          ? 'Food and meal costs are not included in the Basic Package (Rs. 0).'
          : 'Food and meal services are excluded by default in the Standard Package (Rs. 0).'
    };
  }

  // Resolve mealType from either explicit mealType ('Vegetarian', 'Vegan', 'Seafood', 'All meat types')
  // or from selectedMealOption
  let resolvedMealType = mealType;
  if (!MEAL_TYPE_RATES_LKR[resolvedMealType] && selectedMealOption) {
    const lowerOpt = selectedMealOption.toLowerCase();
    if (lowerOpt.includes('seafood')) resolvedMealType = 'Seafood';
    else if (lowerOpt.includes('vegan')) resolvedMealType = 'Vegan';
    else if (lowerOpt.includes('vegetarian')) resolvedMealType = 'Vegetarian';
    else if (lowerOpt.includes('continental') || lowerOpt.includes('halal') || lowerOpt.includes('meat')) {
      resolvedMealType = 'All meat types';
    }
  }
  if (!MEAL_TYPE_RATES_LKR[resolvedMealType]) {
    resolvedMealType = 'Vegetarian';
  }

  const mealRule = MEAL_TYPE_RATES_LKR[resolvedMealType];
  let ratePerPersonDayLKR = mealRule.ratePerPersonDayLKR;
  let culinaryPremiumPerPersonDayLKR = 0;

  // Check if a package-specific gourmet meal option has an extra surcharge
  if (pkgDoc && Array.isArray(pkgDoc.mealOptions) && selectedMealOption) {
    const matchedOpt = pkgDoc.mealOptions.find((m) => m.name === selectedMealOption);
    if (matchedOpt && Number(matchedOpt.extraCostPerDay) > 0) {
      culinaryPremiumPerPersonDayLKR = normalizeToLKR(
        matchedOpt.extraCostPerDay,
        pkgDoc.currency || 'LKR',
        500
      );
    }
  }

  const effectiveDailyRatePerPersonLKR = ratePerPersonDayLKR + culinaryPremiumPerPersonDayLKR;
  const totalLKR = effectiveDailyRatePerPersonLKR * safeDays * safeTravelers;

  return {
    included: true,
    mealType: resolvedMealType,
    mealOptionName: selectedMealOption || mealRule.label,
    mealsPerDay: 3,
    mealsIncludedList: ['Breakfast', 'Lunch', 'Dinner'],
    days: safeDays,
    travelers: safeTravelers,
    ratePerPersonDayLKR,
    culinaryPremiumPerPersonDayLKR,
    effectiveDailyRatePerPersonLKR,
    totalLKR,
    pricingType: 'confirmed_rule',
    breakdownText: `${resolvedMealType} Full-Board (${safeTravelers} traveler(s) × ${safeDays} day(s) × Rs. ${effectiveDailyRatePerPersonLKR.toLocaleString()}/person/day)`
  };
};

/**
 * 4. Calculate Tour Guide Charges in LKR
 * Integrates directly with Member 4's Guide model when guideId is provided.
 */
const calculateGuideCost = async ({
  packageName = 'Standard',
  pkgDoc = null,
  days = 1,
  guideDays = null,
  addGuide = false,
  guideId = null,
  selectedGuideOption = null
}) => {
  const safeDays = Math.max(1, Number(days) || 1);
  const activeGuideDays =
    guideDays !== null && Number(guideDays) > 0 ? Math.min(safeDays, Number(guideDays)) : safeDays;

  const isGuideActive =
    packageName === 'Premium' ||
    (packageName === 'Standard' && (Boolean(addGuide) || Boolean(guideId))) ||
    (packageName === 'Basic' && Boolean(addGuide) && Boolean(guideId));

  if (!isGuideActive) {
    return {
      included: false,
      guideId: null,
      guideName:
        packageName === 'Basic'
          ? 'Not Included in Basic Package'
          : 'Optional Add-On Not Selected',
      languages: [],
      serviceAreas: [],
      availabilityStatus: 'Not Selected',
      isAvailable: true,
      days: 0,
      dailyRateLKR: 0,
      totalLKR: 0,
      pricingType: 'excluded',
      breakdownText:
        packageName === 'Basic'
          ? 'Tour guide service is not included in the Basic Package (Rs. 0).'
          : 'Optional tour guide was not selected for this Standard Package (Rs. 0).'
    };
  }

  // Check if a specific registered Guide from MongoDB was selected
  let guideDoc = null;
  if (guideId) {
    try {
      guideDoc = await Guide.findById(guideId).populate('userId', 'name email').lean();
    } catch (e) {
      guideDoc = null;
    }
  }

  if (guideDoc) {
    const guideName = guideDoc.name || guideDoc.userId?.name || 'Licensed National Tour Guide';
    const dailyRateLKR = normalizeToLKR(guideDoc.dailyRate, guideDoc.currency || 'LKR', 1000);
    const totalLKR = dailyRateLKR * activeGuideDays;

    return {
      included: true,
      guideId: String(guideDoc._id),
      guideName,
      languages: guideDoc.languages || ['English', 'Sinhala'],
      serviceAreas: guideDoc.serviceAreas || ['Island-wide'],
      availabilityStatus: guideDoc.availability
        ? 'Available (Verified Guide Record)'
        : 'Guide Currently Marked Unavailable',
      isAvailable: Boolean(guideDoc.availability),
      days: activeGuideDays,
      dailyRateLKR,
      totalLKR,
      pricingType: 'confirmed',
      breakdownText: `${guideName} (Licensed Guide) — ${activeGuideDays} day(s) × Rs. ${dailyRateLKR.toLocaleString()}/day`
    };
  }

  // Otherwise use package guide option or Standard add-on rate
  let dailyRateLKR =
    packageName === 'Premium'
      ? PACKAGE_TIER_DEFAULTS_LKR.Premium.defaultGuideRatePerDayLKR
      : pkgDoc?.guideAddonPrice
      ? normalizeToLKR(pkgDoc.guideAddonPrice, pkgDoc.currency || 'LKR', 1000)
      : PACKAGE_TIER_DEFAULTS_LKR.Standard.defaultGuideRatePerDayLKR;

  let specialistProfile = null;
  if (packageName === 'Premium' && pkgDoc && Array.isArray(pkgDoc.guideOptions)) {
    specialistProfile =
      pkgDoc.guideOptions.find((g) => g.name === selectedGuideOption) || pkgDoc.guideOptions[0];
    if (specialistProfile && Number(specialistProfile.dailyRate) > 0) {
      dailyRateLKR = normalizeToLKR(specialistProfile.dailyRate, pkgDoc.currency || 'LKR', 1000);
    }
  }

  const totalLKR = dailyRateLKR * activeGuideDays;
  const guideLabel =
    specialistProfile?.name ||
    selectedGuideOption ||
    (packageName === 'Premium'
      ? 'Dedicated National Specialist Guide'
      : 'Licensed Tour Guide Add-On');

  return {
    included: true,
    guideId: null,
    guideName: guideLabel,
    languages: specialistProfile?.languages || ['English', 'Sinhala'],
    serviceAreas: ['All Itinerary Destinations'],
    availabilityStatus: 'Estimated Package Guide Allocation',
    isAvailable: true,
    days: activeGuideDays,
    dailyRateLKR,
    totalLKR,
    pricingType: 'estimated',
    breakdownText: `${guideLabel} — ${activeGuideDays} day(s) × Rs. ${dailyRateLKR.toLocaleString()}/day`
  };
};

/**
 * 5. Master Dynamic Tour Cost Calculation Engine
 * Calculates the complete estimated tour cost in LKR and converts to target currency.
 */
const calculateCompleteTourPricing = async (params = {}) => {
  const {
    packageId = null,
    packageName: requestedPackageName = 'Standard',
    days = 3,
    stayNights = null,
    travelers = 2,
    vehicleType = 'Car',
    routeDistanceKm = 0,
    hotelId = null,
    roomType = null,
    numberOfRooms = null,
    mealType = 'Vegetarian',
    selectedMealOption = null,
    includeOptionalMeals = false,
    addGuide = false,
    guideId = null,
    guideDays = null,
    selectedGuideOption = null,
    targetCurrency = 'LKR'
  } = params;

  const safeDays = Math.max(1, Number(days) || 1);
  const safeTravelers = Math.max(1, Number(travelers) || 1);

  // Resolve Package from MongoDB if available
  let pkgDoc = null;
  if (packageId) {
    try {
      pkgDoc = await Package.findById(packageId).lean();
    } catch (e) {
      pkgDoc = null;
    }
  }
  if (!pkgDoc && requestedPackageName) {
    try {
      pkgDoc = await Package.findOne({ packageName: requestedPackageName }).lean();
    } catch (e) {
      pkgDoc = null;
    }
  }

  const resolvedPackageName = pkgDoc?.packageName || requestedPackageName || 'Standard';
  const tierRule =
    PACKAGE_TIER_DEFAULTS_LKR[resolvedPackageName] || PACKAGE_TIER_DEFAULTS_LKR.Standard;

  // 1. Package Coordination & Included Non-Food Facilities Charge
  const packageCoordinationRatePerPersonDayLKR = tierRule.tierCoordinationPerPersonDayLKR;
  const packageCoordinationTotalLKR =
    packageCoordinationRatePerPersonDayLKR * safeDays * safeTravelers;

  // 2. Transportation Cost
  const transportation = calculateTransportationCost({
    vehicleType,
    days: safeDays,
    travelers: safeTravelers,
    routeDistanceKm
  });

  // 3. Accommodation Cost
  const accommodation = await calculateAccommodationCost({
    packageName: resolvedPackageName,
    days: safeDays,
    stayNights,
    travelers: safeTravelers,
    hotelId,
    roomType,
    numberOfRooms
  });

  // 4. Meal & Food Cost
  const meals = calculateMealCost({
    packageName: resolvedPackageName,
    pkgDoc,
    days: safeDays,
    travelers: safeTravelers,
    mealType,
    selectedMealOption,
    includeOptionalMeals
  });

  // 5. Tour Guide Cost
  const guide = await calculateGuideCost({
    packageName: resolvedPackageName,
    pkgDoc,
    days: safeDays,
    guideDays,
    addGuide,
    guideId,
    selectedGuideOption
  });

  // 6. Subtotal, Additional Charges & Grand Total in LKR
  const corePackageServicesLKR =
    packageCoordinationTotalLKR +
    ( transportation.totalLKR - transportation.excessDistanceChargeLKR ) +
    ( resolvedPackageName !== 'Basic' ? accommodation.totalLKR : 0 ) +
    ( resolvedPackageName === 'Premium'
      ? meals.totalLKR - meals.culinaryPremiumPerPersonDayLKR * safeDays * safeTravelers
      : 0 ) +
    ( resolvedPackageName === 'Premium' ? guide.totalLKR : 0 );

  const additionalChargesLKR =
    transportation.excessDistanceChargeLKR +
    ( resolvedPackageName === 'Basic' ? accommodation.totalLKR : 0 ) +
    ( resolvedPackageName !== 'Premium'
      ? meals.totalLKR
      : meals.culinaryPremiumPerPersonDayLKR * safeDays * safeTravelers ) +
    ( resolvedPackageName !== 'Premium' ? guide.totalLKR : 0 );

  const subtotalLKR =
    packageCoordinationTotalLKR +
    transportation.totalLKR +
    accommodation.totalLKR +
    meals.totalLKR +
    guide.totalLKR;

  const totalEstimatedCostLKR = subtotalLKR;
  const costPerPersonLKR = Number((totalEstimatedCostLKR / safeTravelers).toFixed(2));

  // 7. Convert all amounts to targetCurrency via Module 8 Currency Service
  const normalizedCurrency = SUPPORTED_CURRENCIES[(targetCurrency || 'LKR').toUpperCase()]
    ? (targetCurrency || 'LKR').toUpperCase()
    : 'LKR';

  const rateData = await getExchangeRates();
  const convertSync = (lkrVal) => {
    const rate = normalizedCurrency === 'LKR' ? 1 : rateData.rates[normalizedCurrency] || 1;
    const decimals = SUPPORTED_CURRENCIES[normalizedCurrency]?.decimals ?? 2;
    return Number((Number(lkrVal || 0) * rate).toFixed(decimals));
  };

  // Attach converted values to each breakdown section without overwriting LKR values
  const packageCoordination = {
    included: true,
    packageName: resolvedPackageName,
    ratePerPersonDayLKR: packageCoordinationRatePerPersonDayLKR,
    totalLKR: packageCoordinationTotalLKR,
    totalConverted: convertSync(packageCoordinationTotalLKR),
    nonFoodFacilities: tierRule.nonFoodFacilities,
    pricingType: 'confirmed_rule',
    breakdownText: `${resolvedPackageName} Package Planning, Concierge & Non-Food Facilities (${safeTravelers} traveler(s) × ${safeDays} day(s) × Rs. ${packageCoordinationRatePerPersonDayLKR.toLocaleString()}/day)`
  };

  transportation.totalConverted = convertSync(transportation.totalLKR);
  transportation.perPersonConverted = convertSync(transportation.perPersonLKR);

  accommodation.totalConverted = convertSync(accommodation.totalLKR);
  accommodation.ratePerNightConverted = convertSync(accommodation.ratePerNightLKR);

  meals.totalConverted = convertSync(meals.totalLKR);
  meals.ratePerPersonDayConverted = convertSync(meals.effectiveDailyRatePerPersonLKR || 0);

  guide.totalConverted = convertSync(guide.totalLKR);
  guide.dailyRateConverted = convertSync(guide.dailyRateLKR);

  const totalConversion = await convertFromLKR(totalEstimatedCostLKR, normalizedCurrency, rateData);

  // Determine overall pricing verification status
  const confirmedComponents = [];
  const estimatedComponents = [];
  if (accommodation.included) {
    if (accommodation.pricingType === 'confirmed') confirmedComponents.push('Partner Hotel Rate');
    else estimatedComponents.push('Tier Hotel Estimate');
  }
  if (guide.included) {
    if (guide.pricingType === 'confirmed') confirmedComponents.push('Registered Guide Rate');
    else estimatedComponents.push('Package Guide Estimate');
  }
  if (transportation.routeDistanceKm > 0) {
    confirmedComponents.push('Route Distance Transport');
  } else {
    estimatedComponents.push('Daily Vehicle Transport');
  }

  return {
    packageName: resolvedPackageName,
    packageId: pkgDoc?._id ? String(pkgDoc._id) : null,
    tripParameters: {
      days: safeDays,
      nights: accommodation.nights || safeDays,
      travelers: safeTravelers,
      vehicleType: transportation.vehicleType,
      routeDistanceKm: transportation.routeDistanceKm,
      mealType: meals.mealType
    },
    breakdown: {
      packageCoordination,
      transportation,
      accommodation,
      meals,
      guide
    },
    summary: {
      baseCurrency: 'LKR',
      corePackageServicesLKR,
      corePackageServicesConverted: convertSync(corePackageServicesLKR),
      additionalChargesLKR,
      additionalChargesConverted: convertSync(additionalChargesLKR),
      subtotalLKR,
      subtotalConverted: convertSync(subtotalLKR),
      totalEstimatedCostLKR,
      totalEstimatedCostConverted: totalConversion.convertedAmount,
      formattedTotalLKR: totalConversion.formattedLKR,
      formattedTotalConverted: totalConversion.formattedConverted,
      costPerPersonLKR,
      costPerPersonConverted: convertSync(costPerPersonLKR),
      // Legacy compatibility fields for existing components
      baseTotal: convertSync(corePackageServicesLKR),
      guideCost: guide.totalConverted,
      mealExtraCost: convertSync(
        resolvedPackageName === 'Premium'
          ? meals.culinaryPremiumPerPersonDayLKR * safeDays * safeTravelers
          : meals.totalLKR
      ),
      grandTotal: totalConversion.convertedAmount,
      grandTotalLKR: totalEstimatedCostLKR
    },
    currency: {
      code: normalizedCurrency,
      name: SUPPORTED_CURRENCIES[normalizedCurrency].name,
      symbol: SUPPORTED_CURRENCIES[normalizedCurrency].symbol,
      exchangeRateFromLKR: totalConversion.exchangeRate,
      inverseRateToLKR: totalConversion.inverseRateToLKR,
      rateDate: totalConversion.rateDate,
      rateSource: totalConversion.rateSource,
      isFallback: totalConversion.isFallback,
      limitationNote: totalConversion.limitationNote
    },
    chargeClassification: {
      hasDatabaseConfirmedSelections: confirmedComponents.length > 0,
      confirmedComponents,
      estimatedComponents,
      disclaimer:
        confirmedComponents.length > 0
          ? `Includes verified database rates for: ${confirmedComponents.join(', ')}. Remaining items are estimated based on package rules.`
          : 'All figures are estimated charges based on selected package rules and duration. Select a specific Partner Hotel or Tour Guide to calculate exact property/guide rates.'
    }
  };
};

/**
 * Calculate pricing for a saved TourPlan by ID
 */
const calculateTourPlanPricingById = async (tourPlanId, targetCurrency = 'LKR') => {
  const plan = await TourPlan.findById(tourPlanId).lean();
  if (!plan) {
    const error = new Error('Tour plan not found');
    error.statusCode = 404;
    throw error;
  }

  const routeDistanceKm = plan.routeData?.distanceKm || (plan.routeData?.distance ? plan.routeData.distance / 1000 : 0);

  const pricing = await calculateCompleteTourPricing({
    packageId: plan.packageId,
    packageName: plan.packageName || 'Standard',
    days: plan.days || 1,
    travelers: plan.travelers || 1,
    vehicleType: plan.transportType || 'Car',
    routeDistanceKm,
    hotelId: plan.selectedHotelId,
    roomType: plan.selectedRoomType,
    numberOfRooms: plan.numberOfRooms,
    mealType: plan.mealType && plan.mealType !== 'None' ? plan.mealType : 'Vegetarian',
    selectedMealOption: plan.customizations?.selectedMealOption,
    addGuide: Boolean(plan.customizations?.addGuide || plan.selectedGuideId),
    guideId: plan.selectedGuideId,
    selectedGuideOption: plan.customizations?.selectedGuideOption,
    targetCurrency: targetCurrency || plan.currency || 'LKR'
  });

  return {
    tourPlanId: String(plan._id),
    tourPlan: plan,
    pricing
  };
};

module.exports = {
  TRANSPORT_PRICING_RULES_LKR,
  MEAL_TYPE_RATES_LKR,
  PACKAGE_TIER_DEFAULTS_LKR,
  calculateTransportationCost,
  calculateAccommodationCost,
  calculateMealCost,
  calculateGuideCost,
  calculateCompleteTourPricing,
  calculateTourPlanPricingById
};

