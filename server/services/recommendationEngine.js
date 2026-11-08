const Destination = require('../models/Destination');

/**
 * Haversine formula to calculate great-circle distance (in km) between two GPS coordinates.
 */
const calculateHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    Number.isNaN(lat1) ||
    Number.isNaN(lon1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lon2)
  ) {
    return null;
  }

  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
};

/**
 * Domain knowledge metadata map for Sri Lanka's iconic destinations.
 * Used both to enrich existing Destination records and as a reliable fallback
 * when a Destination document only stores base fields (name, category, district).
 */
const DESTINATION_METADATA_MAP = {
  sigiriya: {
    environments: ['Hiking', 'Plains', 'Forest and Nature'],
    weatherSuitability: ['Hot', 'Cloudy'],
    estimatedDurationHours: 3.5,
    openingHours: '07:00 AM - 05:30 PM',
    defaultViewCount: 1540
  },
  ella: {
    environments: ['Mountains', 'Hiking', 'Waterfalls', 'Forest and Nature'],
    weatherSuitability: ['Cool', 'Cloudy'],
    estimatedDurationHours: 4.0,
    openingHours: '06:00 AM - 06:00 PM',
    defaultViewCount: 1320
  },
  kandy: {
    environments: ['Lakes', 'Mountains', 'Forest and Nature'],
    weatherSuitability: ['Cool', 'Cloudy', 'Hot'],
    estimatedDurationHours: 3.5,
    openingHours: '06:00 AM - 08:00 PM',
    defaultViewCount: 1180
  },
  'galle fort': {
    environments: ['Seaside', 'Plains'],
    weatherSuitability: ['Hot', 'Cloudy'],
    estimatedDurationHours: 3.0,
    openingHours: '06:00 AM - 09:00 PM',
    defaultViewCount: 1450
  },
  'yala national park': {
    environments: ['Forest and Nature', 'Plains', 'Lakes', 'Seaside'],
    weatherSuitability: ['Hot'],
    estimatedDurationHours: 4.0,
    openingHours: '06:00 AM - 06:00 PM',
    defaultViewCount: 1620
  },
  'nuwara eliya': {
    environments: ['Mountains', 'Lakes', 'Waterfalls', 'Forest and Nature'],
    weatherSuitability: ['Cool', 'Cloudy'],
    estimatedDurationHours: 4.0,
    openingHours: '07:00 AM - 06:00 PM',
    defaultViewCount: 1290
  },
  mirissa: {
    environments: ['Seaside'],
    weatherSuitability: ['Hot', 'Cloudy'],
    estimatedDurationHours: 3.5,
    openingHours: '06:00 AM - 07:00 PM',
    defaultViewCount: 1380
  },
  'arugam bay': {
    environments: ['Seaside', 'Lakes', 'Plains'],
    weatherSuitability: ['Hot'],
    estimatedDurationHours: 3.5,
    openingHours: '06:00 AM - 07:00 PM',
    defaultViewCount: 990
  },
  'horton plains': {
    environments: ['Plains', 'Hiking', 'Waterfalls', 'Forest and Nature', 'Mountains'],
    weatherSuitability: ['Cool', 'Cloudy'],
    estimatedDurationHours: 4.0,
    openingHours: '06:00 AM - 04:00 PM',
    defaultViewCount: 870
  }
};

/**
 * Category-to-environment mapping for any custom/new destinations added by admins.
 */
const CATEGORY_TO_ENVIRONMENTS = {
  beach: ['Seaside'],
  seaside: ['Seaside'],
  mountain: ['Mountains', 'Hiking', 'Waterfalls'],
  mountains: ['Mountains', 'Hiking', 'Waterfalls'],
  forest: ['Forest and Nature', 'Hiking', 'Waterfalls'],
  nature: ['Forest and Nature', 'Mountains', 'Waterfalls', 'Hiking'],
  wildlife: ['Forest and Nature', 'Plains', 'Lakes'],
  cultural: ['Plains', 'Lakes'],
  historical: ['Plains', 'Hiking']
};

/**
 * District-to-weather mapping for Sri Lankan districts.
 */
const DISTRICT_TO_WEATHER = {
  'nuwara eliya': ['Cool', 'Cloudy'],
  badulla: ['Cool', 'Cloudy'],
  kandy: ['Cool', 'Cloudy', 'Hot'],
  matale: ['Hot', 'Cloudy'],
  galle: ['Hot', 'Cloudy'],
  matara: ['Hot', 'Cloudy'],
  hambantota: ['Hot'],
  ampara: ['Hot']
};

/**
 * Enrich a raw Destination mongoose document/object with inferred or stored metadata
 * without mutating coordinates or inventing fake locations.
 */
const enrichDestinationMetadata = (destDoc) => {
  const dest = destDoc.toObject ? destDoc.toObject() : { ...destDoc };
  const key = (dest.name || '').trim().toLowerCase();
  const catKey = (dest.category || '').trim().toLowerCase();
  const distKey = (dest.district || '').trim().toLowerCase();
  const knownMeta = DESTINATION_METADATA_MAP[key];

  // Environments
  let environments = Array.isArray(dest.environments) && dest.environments.length > 0
    ? [...dest.environments]
    : knownMeta
      ? [...knownMeta.environments]
      : [...(CATEGORY_TO_ENVIRONMENTS[catKey] || ['Forest and Nature'])];

  // Also scan description for explicit natural features
  const descLower = (dest.description || '').toLowerCase();
  if (descLower.includes('waterfall') && !environments.includes('Waterfalls')) environments.push('Waterfalls');
  if ((descLower.includes('lake') || descLower.includes('lagoon')) && !environments.includes('Lakes')) environments.push('Lakes');
  if ((descLower.includes('beach') || descLower.includes('ocean') || descLower.includes('coastal')) && !environments.includes('Seaside')) environments.push('Seaside');
  if ((descLower.includes('mountain') || descLower.includes('hill') || descLower.includes('peak')) && !environments.includes('Mountains')) environments.push('Mountains');
  if ((descLower.includes('trail') || descLower.includes('climb') || descLower.includes('trek') || descLower.includes('rock')) && !environments.includes('Hiking')) environments.push('Hiking');
  if ((descLower.includes('plain') || descLower.includes('grassland')) && !environments.includes('Plains')) environments.push('Plains');

  // Weather suitability
  const weatherSuitability = Array.isArray(dest.weatherSuitability) && dest.weatherSuitability.length > 0
    ? [...dest.weatherSuitability]
    : knownMeta
      ? [...knownMeta.weatherSuitability]
      : [...(DISTRICT_TO_WEATHER[distKey] || ['Hot', 'Cloudy'])];

  const estimatedDurationHours = dest.estimatedDurationHours || (knownMeta ? knownMeta.estimatedDurationHours : 3.5);
  const openingHours = dest.openingHours || (knownMeta ? knownMeta.openingHours : '06:00 AM - 06:00 PM');
  const effectiveViewCount = dest.viewCount && dest.viewCount > 0
    ? dest.viewCount
    : (knownMeta ? knownMeta.defaultViewCount : 500);

  return {
    ...dest,
    environments,
    weatherSuitability,
    estimatedDurationHours,
    openingHours,
    effectiveViewCount
  };
};

/**
 * Normalize scoring weights so they always sum to 1.0 (100%).
 * Default weights per specification:
 * - Interest match: 40%
 * - Geographic proximity: 20%
 * - Destination rating: 15%
 * - Popularity: 10%
 * - Weather suitability: 10%
 * - Visiting-time suitability: 5%
 */
const normalizeWeights = (customWeights = {}) => {
  const raw = {
    interest: typeof customWeights.interest === 'number' ? Math.max(0, customWeights.interest) : 40,
    proximity: typeof customWeights.proximity === 'number' ? Math.max(0, customWeights.proximity) : 20,
    rating: typeof customWeights.rating === 'number' ? Math.max(0, customWeights.rating) : 15,
    popularity: typeof customWeights.popularity === 'number' ? Math.max(0, customWeights.popularity) : 10,
    weather: typeof customWeights.weather === 'number' ? Math.max(0, customWeights.weather) : 10,
    visitTime: typeof customWeights.visitTime === 'number' ? Math.max(0, customWeights.visitTime) : 5
  };

  const sum = Object.values(raw).reduce((acc, v) => acc + v, 0) || 100;
  return {
    interest: raw.interest / sum,
    proximity: raw.proximity / sum,
    rating: raw.rating / sum,
    popularity: raw.popularity / sum,
    weather: raw.weather / sum,
    visitTime: raw.visitTime / sum,
    percentages: {
      interest: Math.round((raw.interest / sum) * 100),
      proximity: Math.round((raw.proximity / sum) * 100),
      rating: Math.round((raw.rating / sum) * 100),
      popularity: Math.round((raw.popularity / sum) * 100),
      weather: Math.round((raw.weather / sum) * 100),
      visitTime: Math.round((raw.visitTime / sum) * 100)
    }
  };
};

/**
 * Normalize weather preference (supports both 'Cool'/'Hot'/'Cloudy' and legacy 'Cold'/'Moderate'/'Any').
 */
const normalizeWeatherPref = (pref) => {
  if (!pref) return 'Any';
  const cleaned = pref.trim().toLowerCase();
  if (cleaned === 'cold' || cleaned === 'cool') return 'Cool';
  if (cleaned === 'hot' || cleaned === 'warm') return 'Hot';
  if (cleaned === 'cloudy' || cleaned === 'moderate' || cleaned === 'misty') return 'Cloudy';
  return 'Any';
};

/**
 * Main Rule-Based Destination Recommendation Engine
 */
exports.recommendDestinations = async (preferences = {}, options = {}) => {
  try {
    const rawDestinations = await Destination.find({});

    // Deduplicate destinations by ID and normalized name
    const seenIds = new Set();
    const seenNames = new Set();
    const allDestinations = [];

    for (const d of rawDestinations) {
      const idStr = d._id.toString();
      const nameStr = (d.name || '').trim().toLowerCase();
      if (!seenIds.has(idStr) && !seenNames.has(nameStr)) {
        seenIds.add(idStr);
        seenNames.add(nameStr);
        allDestinations.push(enrichDestinationMetadata(d));
      }
    }

    if (allDestinations.length === 0) {
      return [];
    }

    const weights = normalizeWeights(preferences.weights || options.weights);

    // Combine environments and interests from input
    const requestedEnvironments = Array.from(
      new Set([
        ...(Array.isArray(preferences.environments) ? preferences.environments : []),
        ...(Array.isArray(preferences.interests) ? preferences.interests : [])
      ].map((e) => (e || '').trim()).filter(Boolean))
    );

    const weatherPref = normalizeWeatherPref(preferences.weatherPreference);
    const travelDays = Math.max(1, Math.min(30, parseInt(preferences.travelDays || preferences.days || 3, 10)));
    const preferredVisitTime = (preferences.preferredVisitTime || 'Any').trim().toLowerCase();

    // Max viewCount across database for popularity normalization
    const maxViews = Math.max(...allDestinations.map((d) => d.effectiveViewCount || 1), 1);

    // Step 1: Compute preliminary scores (excluding proximity) & filter non-matching destinations
    const preliminaryCandidates = [];

    for (const dest of allDestinations) {
      const matchedEnvironments = [];
      let matchedCategoryDirectly = false;

      if (requestedEnvironments.length > 0) {
        for (const reqEnv of requestedEnvironments) {
          const reqLower = reqEnv.toLowerCase();
          // Check direct environment match
          const envHit = dest.environments.find((e) => e.toLowerCase() === reqLower);
          if (envHit) {
            matchedEnvironments.push(envHit);
            continue;
          }
          // Check category match (e.g. Cultural, Wildlife, Beach, Mountain, Nature, Historical)
          if ((dest.category || '').toLowerCase() === reqLower) {
            matchedCategoryDirectly = true;
            matchedEnvironments.push(dest.category);
            continue;
          }
          // Partial synonym match (e.g. "Forest" vs "Forest and Nature", "Mountain" vs "Mountains")
          const synonymHit = dest.environments.find(
            (e) => e.toLowerCase().includes(reqLower) || reqLower.includes(e.toLowerCase())
          );
          if (synonymHit && !matchedEnvironments.includes(synonymHit)) {
            matchedEnvironments.push(synonymHit);
          }
        }
      }

      // Calculate Interest Match Score (0.0 to 1.0)
      let interestUnitScore = 0;
      if (requestedEnvironments.length === 0) {
        interestUnitScore = 0.75; // No specific filter provided
      } else if (matchedEnvironments.length > 0 || matchedCategoryDirectly) {
        // Reward matching multiple selected environments, with high base for at least 1 strong match
        const matchRatio = matchedEnvironments.length / Math.min(requestedEnvironments.length, 3);
        interestUnitScore = Math.min(1.0, 0.65 + 0.35 * matchRatio);
      } else {
        interestUnitScore = 0;
      }

      // Calculate Weather Suitability Score (0.0 to 1.0)
      let weatherUnitScore = 0.5;
      let weatherMatched = false;
      if (weatherPref === 'Any') {
        weatherUnitScore = 0.85;
        weatherMatched = true;
      } else if (dest.weatherSuitability.some((w) => w.toLowerCase() === weatherPref.toLowerCase())) {
        weatherUnitScore = 1.0;
        weatherMatched = true;
      } else if (
        (weatherPref === 'Cloudy' && dest.weatherSuitability.includes('Cool')) ||
        (weatherPref === 'Cool' && dest.weatherSuitability.includes('Cloudy'))
      ) {
        weatherUnitScore = 0.7;
        weatherMatched = true;
      } else {
        weatherUnitScore = 0.15;
      }

      // STRICT RELEVANCE FILTER:
      // Do not recommend destinations simply because they exist in the database.
      // If the user specified environments/interests, the destination MUST match at least one requested environment/category.
      if (requestedEnvironments.length > 0 && interestUnitScore === 0) {
        continue;
      }
      // If user selected no environments at all, require weather match
      if (requestedEnvironments.length === 0 && weatherPref !== 'Any' && !weatherMatched) {
        continue;
      }

      // Calculate Rating Score (0.0 to 1.0)
      const ratingVal = Math.max(1, Math.min(5, Number(dest.rating) || 4.5));
      const ratingUnitScore = ratingVal / 5.0;

      // Calculate Popularity Score (0.0 to 1.0)
      const popularityUnitScore = Math.min(1.0, Math.max(0.2, (dest.effectiveViewCount || 500) / maxViews));

      // Calculate Visiting-Time Suitability Score (0.0 to 1.0)
      const bestTimeStr = (dest.bestVisitTime || 'Morning').trim();
      let visitTimeUnitScore = 0.85;
      if (preferredVisitTime !== 'any') {
        visitTimeUnitScore = bestTimeStr.toLowerCase().includes(preferredVisitTime) ? 1.0 : 0.65;
      } else if (bestTimeStr.toLowerCase().includes('morning') || bestTimeStr.toLowerCase().includes('early')) {
        visitTimeUnitScore = 0.95; // Morning starts fit multi-stop day schedules best
      }

      // Base score before geographic proximity
      const preProximityScore =
        interestUnitScore * weights.interest +
        ratingUnitScore * weights.rating +
        popularityUnitScore * weights.popularity +
        weatherUnitScore * weights.weather +
        visitTimeUnitScore * weights.visitTime;

      preliminaryCandidates.push({
        dest,
        matchedEnvironments: Array.from(new Set(matchedEnvironments)),
        weatherMatched,
        interestUnitScore,
        ratingUnitScore,
        popularityUnitScore,
        weatherUnitScore,
        visitTimeUnitScore,
        preProximityScore
      });
    }

    if (preliminaryCandidates.length === 0) {
      return [];
    }

    // Sort preliminary candidates to identify the primary anchor destination
    preliminaryCandidates.sort((a, b) => b.preProximityScore - a.preProximityScore);
    const anchorDest = preliminaryCandidates[0].dest;

    // Step 2: Calculate Geographic Proximity score using Haversine formula from Anchor Destination
    const scoredResults = preliminaryCandidates.map((item) => {
      const { dest } = item;
      let distanceFromAnchorKm = null;
      let proximityUnitScore = 0.7;

      if (
        typeof dest.latitude === 'number' &&
        typeof dest.longitude === 'number' &&
        typeof anchorDest.latitude === 'number' &&
        typeof anchorDest.longitude === 'number'
      ) {
        distanceFromAnchorKm = calculateHaversineDistanceKm(
          anchorDest.latitude,
          anchorDest.longitude,
          dest.latitude,
          dest.longitude
        );

        if (distanceFromAnchorKm !== null) {
          // 0 km -> 1.0; 100 km -> 0.6; 250+ km -> 0.15
          proximityUnitScore = Math.max(0.15, Math.min(1.0, 1 - distanceFromAnchorKm / 260));
        }
      }

      // Total weighted score (0 to 100)
      const totalWeightedUnit =
        item.interestUnitScore * weights.interest +
        proximityUnitScore * weights.proximity +
        item.ratingUnitScore * weights.rating +
        item.popularityUnitScore * weights.popularity +
        item.weatherUnitScore * weights.weather +
        item.visitTimeUnitScore * weights.visitTime;

      const matchScore = Math.min(99, Math.max(35, Math.round(totalWeightedUnit * 100)));

      // Detailed component scores (out of their respective weight percentages)
      const scoreBreakdown = {
        interestScore: Math.round(item.interestUnitScore * weights.percentages.interest),
        proximityScore: Math.round(proximityUnitScore * weights.percentages.proximity),
        ratingScore: Math.round(item.ratingUnitScore * weights.percentages.rating),
        popularityScore: Math.round(item.popularityUnitScore * weights.percentages.popularity),
        weatherScore: Math.round(item.weatherUnitScore * weights.percentages.weather),
        visitTimeScore: Math.round(item.visitTimeUnitScore * weights.percentages.visitTime),
        weights: weights.percentages
      };

      // Build transparent human-readable recommendation reasons
      const reasons = [];
      if (item.matchedEnvironments.length > 0) {
        reasons.push(`Matches your preferred environments: ${item.matchedEnvironments.join(', ')}`);
      } else {
        reasons.push(`Features ${dest.environments.slice(0, 3).join(', ')} scenery in ${dest.district}`);
      }

      if (weatherPref !== 'Any' && item.weatherMatched) {
        reasons.push(`Ideal for ${weatherPref} weather in ${dest.district} District`);
      } else {
        reasons.push(`Suitable climate (${dest.weatherSuitability.join(' / ')}) in ${dest.district}`);
      }

      if (distanceFromAnchorKm !== null) {
        if (dest._id.toString() === anchorDest._id.toString()) {
          reasons.push(`Primary anchor destination for your route cluster`);
        } else if (distanceFromAnchorKm <= 75) {
          reasons.push(`Nearby destination: ${distanceFromAnchorKm} km from ${anchorDest.name} (Haversine)`);
        } else {
          reasons.push(`${distanceFromAnchorKm} km from ${anchorDest.name} along your Sri Lankan route`);
        }
      }

      if (dest.rating >= 4.7) {
        reasons.push(`Top-rated Sri Lankan landmark (${dest.rating}★ / 5.0)`);
      } else if (dest.rating) {
        reasons.push(`Highly rated by travellers (${dest.rating}★ / 5.0)`);
      }

      if (dest.bestVisitTime) {
        reasons.push(`Best visited during ${dest.bestVisitTime} (~${dest.estimatedDurationHours} hrs visit)`);
      }

      return {
        destination: dest,
        matchScore,
        scoreBreakdown,
        reasons,
        matchedEnvironments: item.matchedEnvironments,
        distanceFromAnchorKm,
        anchorDestinationName: anchorDest.name,
        recommendedForTripDays: travelDays
      };
    });

    // Sort by matchScore descending, then by distanceFromAnchorKm ascending, then rating descending
    scoredResults.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (a.distanceFromAnchorKm !== null && b.distanceFromAnchorKm !== null) {
        if (a.distanceFromAnchorKm !== b.distanceFromAnchorKm) {
          return a.distanceFromAnchorKm - b.distanceFromAnchorKm;
        }
      }
      return (b.destination.rating || 0) - (a.destination.rating || 0);
    });

    // Recommended count adapts to trip duration (up to 2 per day, or all matching candidates so user can choose)
    const maxLimit = options.limit ? parseInt(options.limit, 10) : Math.max(travelDays * 2, 9);
    return scoredResults.slice(0, maxLimit);
  } catch (error) {
    console.error('Recommendation Engine Error:', error);
    throw error;
  }
};

exports.calculateHaversineDistanceKm = calculateHaversineDistanceKm;
exports.enrichDestinationMetadata = enrichDestinationMetadata;
exports.normalizeWeights = normalizeWeights;
