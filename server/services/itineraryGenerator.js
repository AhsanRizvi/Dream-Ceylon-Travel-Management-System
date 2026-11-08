const Destination = require('../models/Destination');
const {
  calculateHaversineDistanceKm,
  enrichDestinationMetadata
} = require('./recommendationEngine');

/**
 * Helper: convert minutes since midnight (e.g. 480) to "08:00 AM"
 */
const minutesToTimeString = (totalMinutes) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const hours24 = Math.floor(clamped / 60);
  const mins = clamped % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hours12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
};

/**
 * Round minutes to nearest 15-minute slot
 */
const roundTo15 = (mins) => Math.round(mins / 15) * 15;

/**
 * Estimate road distance and travel duration between two destinations
 * using Haversine distance * Sri Lankan terrain road factor (1.32x)
 * and average speed by vehicle type.
 * Clearly marked as an estimate (isEstimatedTravel: true).
 */
const estimateTravelBetween = (origin, dest, transportType = 'Car') => {
  const straightKm = calculateHaversineDistanceKm(
    origin.latitude,
    origin.longitude,
    dest.latitude,
    dest.longitude
  );

  if (straightKm === null) {
    return {
      distanceKm: 35,
      durationMinutes: 60,
      isEstimatedTravel: true
    };
  }

  // Road winding multiplier in Sri Lanka (hill country vs plains)
  const isHillCountry =
    ['Nuwara Eliya', 'Badulla', 'Kandy', 'Matale'].includes(origin.district) ||
    ['Nuwara Eliya', 'Badulla', 'Kandy', 'Matale'].includes(dest.district);
  const roadMultiplier = isHillCountry ? 1.38 : 1.26;
  const roadKm = Number((straightKm * roadMultiplier).toFixed(1));

  // Realistic average speeds on Sri Lankan highways/hill roads (km/h)
  const speeds = {
    Motorcycle: 40,
    Car: 46,
    Van: 42,
    Bus: 35,
    Train: 38
  };
  const speedKmh = speeds[transportType] || 44;

  const rawMinutes = (roadKm / speedKmh) * 60;
  const durationMinutes = Math.max(30, roundTo15(rawMinutes));

  return {
    distanceKm: roadKm,
    durationMinutes,
    isEstimatedTravel: true
  };
};

/**
 * Order destinations into a practical continuous route using Nearest-Neighbor Haversine clustering
 * so the itinerary does not schedule impossible or zig-zag travel combinations.
 */
const orderDestinationsGeographically = (destinations) => {
  if (!Array.isArray(destinations) || destinations.length <= 2) {
    return destinations || [];
  }

  const remaining = [...destinations];
  const ordered = [remaining.shift()];

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const dist = calculateHaversineDistanceKm(
        current.latitude,
        current.longitude,
        candidate.latitude,
        candidate.longitude
      );
      const effectiveDist = dist !== null ? dist : 999;
      if (effectiveDist < nearestDist) {
        nearestDist = effectiveDist;
        nearestIdx = i;
      }
    }

    ordered.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return ordered;
};

/**
 * Determine optimal start time (in minutes from midnight) based on destination's bestVisitTime
 */
const getPreferredStartMinutes = (dest) => {
  const bestTime = (dest.bestVisitTime || 'Morning').toLowerCase();
  if (bestTime.includes('sunrise') || bestTime.includes('early morning')) {
    return 7 * 60 + 30; // 07:30 AM
  }
  if (bestTime.includes('morning')) {
    return 8 * 60; // 08:00 AM
  }
  return 8 * 60 + 30; // 08:30 AM
};

/**
 * Generate supplementary local experience activities when trip days exceed selected destination count
 * so every day of the trip has a meaningful, non-duplicate schedule in the active district.
 */
const getSupplementaryExperience = (anchorDest, dayNum) => {
  const district = anchorDest?.district || 'Sri Lanka';
  const experiencesByDistrict = {
    Matale: {
      title: 'Matale Spice Gardens & Heritage Village Walk',
      description: 'Guided exploration of traditional Ceylon spice plantations, herbal gardens, and local rural craftsmanship in Matale District.',
      durationMinutes: 150
    },
    Badulla: {
      title: 'Highland Tea Factory Tour & Scenic Valley Trail',
      description: 'Visit an authentic Ceylon tea estate in Badulla District to witness tea leaf plucking, processing, and highland tasting.',
      durationMinutes: 150
    },
    Kandy: {
      title: 'Royal Botanical Gardens & Kandy Cultural Dance Show',
      description: 'Stroll through Peradeniya’s Royal Botanical Gardens followed by traditional Kandyan cultural drumming and dance.',
      durationMinutes: 180
    },
    Galle: {
      title: 'Southern Coastal Lagoon & Cinnamon Island Excursion',
      description: 'Explore the scenic southern coastline, traditional stilt fishing viewpoints, and artisanal cinnamon peeling in Galle District.',
      durationMinutes: 150
    },
    Hambantota: {
      title: 'Bundala Bird Sanctuary & Southern Dry-Zone Nature Walk',
      description: 'Peaceful coastal wetland and lagoon birdwatching excursion in Hambantota District.',
      durationMinutes: 150
    },
    'Nuwara Eliya': {
      title: 'Pedro Tea Estate & Gregory Lake Highland Promenade',
      description: 'Leisurely highland morning amidst misty tea terraces and scenic boat promenade around Gregory Lake.',
      durationMinutes: 150
    },
    Matara: {
      title: 'Southern Coconut Tree Hill & Coastal Snorkeling Cove',
      description: 'Morning coastal walk along palm-fringed cliffs and calm reef coves in Matara District.',
      durationMinutes: 150
    },
    Ampara: {
      title: 'Pottuvil Lagoon Mangrove Eco-Safari',
      description: 'Tranquil boat safari through mangrove ecosystems and coastal bird habitats in Ampara District.',
      durationMinutes: 150
    }
  };

  return (
    experiencesByDistrict[district] || {
      title: `${district} Scenic Cultural & Nature Circuit (Day ${dayNum})`,
      description: `Curated regional exploration of ${district}'s scenic viewpoints, local markets, and natural heritage.`,
      durationMinutes: 150
    }
  );
};

/**
 * Main Day-by-Day Smart Itinerary Generator
 *
 * @param {Object} params
 * @param {Array} params.destinations - Array of Destination objects or IDs
 * @param {Number} params.days - Number of travel days (1 to 30)
 * @param {String|Date} params.startDate - Trip start date
 * @param {Object} params.preferences - Tourist preferences (mealType, transportation, guideRequirement, packageLevel, etc.)
 * @param {Boolean} params.preserveOrder - If true, keeps user's manual destination order instead of auto-clustering
 */
exports.generateDayByDayItinerary = async ({
  destinations = [],
  days = 3,
  startDate = null,
  preferences = {},
  preserveOrder = false
}) => {
  const tripDays = Math.max(1, Math.min(30, parseInt(days, 10) || 3));
  const transportType = preferences.transportation || preferences.transportType || 'Car';
  const mealType = preferences.mealType || 'All meat types';
  const guideRequirement = preferences.guideRequirement || (preferences.guideRequired ? 'Required' : 'Not required');
  const packageLevel = preferences.packageLevel || 'Standard';

  // Resolve full destination documents if IDs were passed
  let resolvedDests = [];
  if (destinations.length > 0) {
    const firstItem = destinations[0];
    if (typeof firstItem === 'string' || (firstItem && !firstItem.name && firstItem._id)) {
      const ids = destinations.map((d) => (typeof d === 'string' ? d : d._id));
      const dbDocs = await Destination.find({ _id: { $in: ids } });
      const docMap = new Map(dbDocs.map((d) => [d._id.toString(), d]));
      resolvedDests = ids.map((id) => docMap.get(id.toString())).filter(Boolean);
    } else {
      resolvedDests = destinations;
    }
  }

  // Deduplicate destinations strictly so the same destination is NEVER assigned multiple times
  const uniqueMap = new Map();
  for (const d of resolvedDests) {
    const idKey = (d._id || d.id || d.name).toString();
    if (!uniqueMap.has(idKey)) {
      uniqueMap.set(idKey, enrichDestinationMetadata(d));
    }
  }

  let uniqueDestinations = Array.from(uniqueMap.values());

  // Order geographically using Nearest-Neighbor Haversine unless user explicitly reordered
  if (!preserveOrder && uniqueDestinations.length > 2) {
    uniqueDestinations = orderDestinationsGeographically(uniqueDestinations);
  }

  // Cap total unique destinations to a realistic limit (max 2 primary destinations per day)
  const maxPracticalStops = tripDays * 2;
  if (uniqueDestinations.length > maxPracticalStops) {
    uniqueDestinations = uniqueDestinations.slice(0, maxPracticalStops);
  }

  // Distribute destinations across the available trip days without duplicating any destination
  // Each day receives 0, 1, or 2 primary destinations
  const buckets = Array.from({ length: tripDays }, () => []);
  const totalStops = uniqueDestinations.length;

  if (totalStops > 0) {
    if (totalStops <= tripDays) {
      // Spread 1 destination per day first
      for (let i = 0; i < totalStops; i++) {
        buckets[i].push(uniqueDestinations[i]);
      }
    } else {
      // Distribute evenly across tripDays (1 to 2 per day)
      let stopIdx = 0;
      for (let dIdx = 0; dIdx < tripDays && stopIdx < totalStops; dIdx++) {
        const remainingStops = totalStops - stopIdx;
        const remainingDays = tripDays - dIdx;
        const countForDay = Math.min(2, Math.ceil(remainingStops / remainingDays));
        for (let k = 0; k < countForDay && stopIdx < totalStops; k++) {
          buckets[dIdx].push(uniqueDestinations[stopIdx++]);
        }
      }
    }
  }

  // Determine concrete start date
  const baseDate = startDate ? new Date(startDate) : new Date(Date.now() + 86400000);
  baseDate.setHours(0, 0, 0, 0);

  const dailyItinerary = [];
  let previousDestination = null;
  let totalRouteDistanceKm = 0;
  let totalRouteTravelMinutes = 0;

  for (let dayIdx = 0; dayIdx < tripDays; dayIdx++) {
    const dayNumber = dayIdx + 1;
    const dayDate = new Date(baseDate);
    dayDate.setDate(baseDate.getDate() + dayIdx);

    const dayStops = buckets[dayIdx];
    const activities = [];
    let dayTravelMinutes = 0;
    let dayVisitMinutes = 0;

    // Starting clock for the day
    let currentClock = dayStops.length > 0 ? getPreferredStartMinutes(dayStops[0]) : 8 * 60 + 30;
    let lunchAdded = false;

    const addLunchBreakIfNeeded = (referenceDistrict) => {
      if (lunchAdded) return;
      const lunchStart = Math.max(currentClock, 12 * 60 + 30); // At least 12:30 PM
      const lunchEnd = lunchStart + 60;
      activities.push({
        activityId: `day-${dayNumber}-lunch`,
        type: 'meal',
        title: `Lunch Break & Refreshments (${mealType})`,
        destinationId: null,
        destinationName: `${referenceDistrict || 'Local'} Dining Stop`,
        district: referenceDistrict || 'Sri Lanka',
        category: 'Dining',
        startTime: minutesToTimeString(lunchStart),
        endTime: minutesToTimeString(lunchEnd),
        durationMinutes: 60,
        isEstimatedTravel: false,
        description: `Scheduled midday dining break tailored for ${mealType} cuisine preferences (${packageLevel} Package).`,
        notes: `Preferred meal type: ${mealType}`
      });
      currentClock = lunchEnd;
      lunchAdded = true;
    };

    if (dayStops.length > 0) {
      for (let sIdx = 0; sIdx < dayStops.length; sIdx++) {
        const stop = dayStops[sIdx];

        // If transitioning from a previous destination (either earlier today or yesterday's final stop)
        if (previousDestination && previousDestination._id.toString() !== stop._id.toString()) {
          const travelEst = estimateTravelBetween(previousDestination, stop, transportType);

          // If inter-city travel is long (> 150 mins) and it's the first stop of the day,
          // schedule morning departure transfer first
          const cappedTravelMins = Math.min(240, travelEst.durationMinutes);
          const travelStart = currentClock;
          const travelEnd = travelStart + cappedTravelMins;

          activities.push({
            activityId: `day-${dayNumber}-travel-${sIdx + 1}`,
            type: 'travel',
            title: `Travel from ${previousDestination.name} to ${stop.name}`,
            destinationId: stop._id,
            destinationName: stop.name,
            district: stop.district,
            category: 'Transfer',
            latitude: stop.latitude,
            longitude: stop.longitude,
            startTime: minutesToTimeString(travelStart),
            endTime: minutesToTimeString(travelEnd),
            durationMinutes: cappedTravelMins,
            distanceKm: travelEst.distanceKm,
            isEstimatedTravel: true,
            description: `Scenic overland transfer via ${transportType} (~${travelEst.distanceKm} km estimated road distance).`,
            notes: `Estimated travel time based on Haversine distance & ${transportType} road speed.`
          });

          currentClock = travelEnd + 15; // 15-min buffer after travel
          dayTravelMinutes += cappedTravelMins;
          totalRouteDistanceKm += travelEst.distanceKm;
          totalRouteTravelMinutes += cappedTravelMins;
        }

        // Check if it is time for lunch before starting the next visit
        if (!lunchAdded && currentClock >= 12 * 60) {
          addLunchBreakIfNeeded(stop.district);
        }

        // Schedule the Destination Visit
        const rawVisitMins = roundTo15((stop.estimatedDurationHours || 3) * 60);
        // Keep daily activity balanced if 2 stops on same day
        const visitDurationMins = dayStops.length > 1 ? Math.min(180, rawVisitMins) : Math.min(240, rawVisitMins);
        const visitStart = currentClock;
        const visitEnd = visitStart + visitDurationMins;

        activities.push({
          activityId: `day-${dayNumber}-visit-${stop._id}`,
          type: 'visit',
          title: `Visit ${stop.name}`,
          destinationId: stop._id,
          destinationName: stop.name,
          district: stop.district,
          category: stop.category,
          image: stop.image || stop.imageUrl,
          latitude: stop.latitude,
          longitude: stop.longitude,
          startTime: minutesToTimeString(visitStart),
          endTime: minutesToTimeString(visitEnd),
          durationMinutes: visitDurationMins,
          bestVisitTime: stop.bestVisitTime || 'Morning',
          openingHours: stop.openingHours || '06:00 AM - 06:00 PM',
          isEstimatedTravel: false,
          description: stop.description,
          notes:
            guideRequirement === 'Required'
              ? `Guided tour at ${stop.name} (Best visit time: ${stop.bestVisitTime || 'Morning'})`
              : `Self-paced exploration at ${stop.name} (Best visit time: ${stop.bestVisitTime || 'Morning'})`
        });

        currentClock = visitEnd + 15;
        dayVisitMinutes += visitDurationMins;
        previousDestination = stop;

        // Add lunch break if we passed midday after the first stop
        if (!lunchAdded && currentClock >= 11 * 60 + 45) {
          addLunchBreakIfNeeded(stop.district);
        }
      }

      // If only 1 destination was visited today and we finished before 02:30 PM, add a relaxed afternoon regional activity
      if (dayStops.length === 1 && currentClock <= 14 * 60 + 30) {
        if (!lunchAdded) {
          addLunchBreakIfNeeded(dayStops[0].district);
        }
        const supp = getSupplementaryExperience(dayStops[0], dayNumber);
        const suppStart = Math.max(currentClock, 14 * 60 + 30);
        const suppEnd = suppStart + 120;
        activities.push({
          activityId: `day-${dayNumber}-leisure`,
          type: 'rest',
          title: supp.title,
          destinationId: null,
          destinationName: `${dayStops[0].district} Regional Experience`,
          district: dayStops[0].district,
          category: 'Cultural & Leisure',
          startTime: minutesToTimeString(suppStart),
          endTime: minutesToTimeString(suppEnd),
          durationMinutes: 120,
          isEstimatedTravel: false,
          description: supp.description,
          notes: `Relaxed afternoon activity in ${dayStops[0].district} District`
        });
        currentClock = suppEnd;
        dayVisitMinutes += 120;
      }
    } else {
      // Fallback when tripDays > number of selected destinations:
      // Schedule a regional exploration day around the last visited destination
      const anchor = previousDestination || uniqueDestinations[0] || {
        name: 'Colombo / Kandy',
        district: 'Kandy'
      };
      const supp = getSupplementaryExperience(anchor, dayNumber);
      const morningStart = 9 * 60;
      const morningEnd = morningStart + supp.durationMinutes;

      activities.push({
        activityId: `day-${dayNumber}-regional-morning`,
        type: 'visit',
        title: supp.title,
        destinationId: null,
        destinationName: `${anchor.district} Regional Circuit`,
        district: anchor.district,
        category: 'Regional Exploration',
        startTime: minutesToTimeString(morningStart),
        endTime: minutesToTimeString(morningEnd),
        durationMinutes: supp.durationMinutes,
        isEstimatedTravel: false,
        description: supp.description,
        notes: `Curated regional exploration in ${anchor.district} District`
      });

      currentClock = morningEnd + 30;
      dayVisitMinutes += supp.durationMinutes;
      addLunchBreakIfNeeded(anchor.district);

      const afternoonStart = Math.max(currentClock, 14 * 60 + 30);
      const afternoonEnd = afternoonStart + 120;
      activities.push({
        activityId: `day-${dayNumber}-regional-afternoon`,
        type: 'rest',
        title: `${anchor.district} Local Crafts, Tea Tasting & Evening Relaxation`,
        destinationId: null,
        destinationName: `${anchor.district} Town Center`,
        district: anchor.district,
        category: 'Leisure',
        startTime: minutesToTimeString(afternoonStart),
        endTime: minutesToTimeString(afternoonEnd),
        durationMinutes: 120,
        isEstimatedTravel: false,
        description: `Unwind with authentic Ceylon tea, local handicraft shopping, and sunset views in ${anchor.district}.`,
        notes: `${packageLevel} Package leisure evening`
      });
      currentClock = afternoonEnd;
      dayVisitMinutes += 120;
    }

    // Ensure lunch is always included on every day
    if (!lunchAdded) {
      addLunchBreakIfNeeded(dayStops[0]?.district || previousDestination?.district || 'Sri Lanka');
    }

    // Evening check-in / dinner wrap-up note
    const activeDistrict =
      dayStops[dayStops.length - 1]?.district ||
      previousDestination?.district ||
      'Sri Lanka';

    const dayTitle =
      dayStops.length > 0
        ? `Day ${dayNumber}: ${dayStops.map((s) => s.name).join(' & ')} (${activeDistrict})`
        : `Day ${dayNumber}: ${activeDistrict} Regional Discovery & Leisure`;

    dailyItinerary.push({
      dayNumber,
      date: dayDate,
      title: dayTitle,
      districtFocus: activeDistrict,
      totalActivityHours: Number(((dayVisitMinutes + dayTravelMinutes) / 60).toFixed(1)),
      totalTravelMinutes: dayTravelMinutes,
      notes: `${dayStops.length} landmark stop(s) • ${mealType} dining • ${transportType} transport`,
      activities
    });
  }

  const endDate = new Date(baseDate);
  endDate.setDate(baseDate.getDate() + tripDays - 1);

  return {
    days: tripDays,
    dates: {
      start: baseDate,
      end: endDate
    },
    stops: uniqueDestinations.map((d) => d._id),
    orderedDestinations: uniqueDestinations,
    dailyItinerary,
    routeSummary: {
      totalDistanceKm: Number(totalRouteDistanceKm.toFixed(1)),
      totalTravelMinutes: totalRouteTravelMinutes,
      transportType,
      isEstimatedTravel: true,
      note: 'Travel times and distances are calculated using GPS Haversine road-adjusted estimates.'
    }
  };
};

exports.estimateTravelBetween = estimateTravelBetween;
exports.orderDestinationsGeographically = orderDestinationsGeographically;

