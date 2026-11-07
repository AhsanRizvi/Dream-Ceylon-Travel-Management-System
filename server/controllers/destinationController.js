const mongoose = require('mongoose');
const Destination = require('../models/Destination');
const Review = require('../models/Review');
const TourPlan = require('../models/TourPlan');
const Hotel = require('../models/Hotel');
const Guide = require('../models/Guide');

/**
 * Dream Ceylon Tourism Management System
 * Destination Controller (Including Module 7: Popular, Most-Viewed & Last-Minute Recommendations)
 * Student Reg: SEU/IS/22/ICT/037
 * University: South Eastern University of Sri Lanka
 */

// In-memory recent view deduplication cache to prevent accidental double counting
// from React StrictMode double mounts or rapid repeated component renders.
// Key: `${sessionKey}:${destinationId}` -> timestamp (ms)
const recentViewCache = new Map();
const VIEW_COOLDOWN_MS = 4000; // 4 seconds deduplication window per client session

// Helper: Haversine distance in km between two coordinates
const computeHaversineKm = (lat1, lon1, lat2, lon2) => {
  if (
    typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
    Number.isNaN(lat1) || Number.isNaN(lon1) || Number.isNaN(lat2) || Number.isNaN(lon2)
  ) {
    return null;
  }
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
};

// Canonical name normalization to merge synonymous destination records in curated feeds
const getCanonicalDestinationKey = (name = '') => {
  const n = name.trim().toLowerCase();
  if (n === 'sigiriya' || n === 'sigiriya rock fortress') return 'sigiriya';
  if (n === 'mirissa' || n === 'mirissa beach') return 'mirissa';
  if (n === 'kandy' || n === 'temple of the tooth (kandy)' || n === 'kandy temple of tooth') return 'kandy-tooth';
  return n;
};

// Helper: Aggregate active destination reviews and itinerary counts from MongoDB
const buildDestinationAnalyticsMap = async () => {
  const [reviewAgg, tourPlans] = await Promise.all([
    Review.aggregate([
      { $match: { targetType: 'destination', status: 'active' } },
      {
        $group: {
          _id: '$targetId',
          averageRating: { $avg: '$score' },
          reviewCount: { $sum: 1 },
          star5: { $sum: { $cond: [{ $eq: ['$score', 5] }, 1, 0] } },
          star4: { $sum: { $cond: [{ $eq: ['$score', 4] }, 1, 0] } }
        }
      }
    ]),
    TourPlan.find({}, 'stops').lean().catch(() => [])
  ]);

  const reviewStatsById = new Map();
  let totalReviewScoreSum = 0;
  let totalReviewCount = 0;

  reviewAgg.forEach((r) => {
    const avg = Number(r.averageRating.toFixed(2));
    reviewStatsById.set(r._id.toString(), {
      averageRating: avg,
      reviewCount: r.reviewCount,
      positiveCount: (r.star5 || 0) + (r.star4 || 0)
    });
    totalReviewScoreSum += r.averageRating * r.reviewCount;
    totalReviewCount += r.reviewCount;
  });

  const itineraryCountById = new Map();
  tourPlans.forEach((plan) => {
    if (Array.isArray(plan.stops)) {
      plan.stops.forEach((stopId) => {
        if (stopId) {
          const key = stopId.toString();
          itineraryCountById.set(key, (itineraryCountById.get(key) || 0) + 1);
        }
      });
    }
  });

  const globalMeanRating = totalReviewCount > 0
    ? Number((totalReviewScoreSum / totalReviewCount).toFixed(2))
    : 4.6;

  return {
    reviewStatsById,
    itineraryCountById,
    globalMeanRating,
    totalReviewCount
  };
};

// Helper: Deduplicate canonical destination aliases while preserving richer metadata & combined stats
const deduplicateDestinationsWithStats = (destinations, reviewStatsById, itineraryCountById) => {
  const groups = new Map();

  destinations.forEach((dest) => {
    const idStr = dest._id.toString();
    const key = getCanonicalDestinationKey(dest.name);
    const rev = reviewStatsById.get(idStr) || { averageRating: null, reviewCount: 0, positiveCount: 0 };
    const itinCount = itineraryCountById.get(idStr) || 0;

    if (!groups.has(key)) {
      groups.set(key, {
        primary: dest,
        maxViewCount: dest.viewCount || 0,
        combinedReviewCount: rev.reviewCount || (dest.reviewCount || 0),
        weightedReviewSum: rev.averageRating ? rev.averageRating * rev.reviewCount : 0,
        actualReviewDocsCount: rev.reviewCount,
        combinedItineraryCount: itinCount,
        baseRating: dest.rating || 0
      });
    } else {
      const g = groups.get(key);
      // Prefer the record with province & tags (from the 48-destination dataset) as primary display
      if ((!g.primary.province && dest.province) || (dest.name.length > g.primary.name.length && dest.province)) {
        g.primary = dest;
      }
      g.maxViewCount = Math.max(g.maxViewCount, dest.viewCount || 0);
      g.combinedReviewCount += rev.reviewCount;
      g.weightedReviewSum += rev.averageRating ? rev.averageRating * rev.reviewCount : 0;
      g.actualReviewDocsCount += rev.reviewCount;
      g.combinedItineraryCount += itinCount;
      g.baseRating = Math.max(g.baseRating, dest.rating || 0);
    }
  });

  return Array.from(groups.values()).map((g) => {
    const reviewAverage = g.actualReviewDocsCount > 0
      ? Number((g.weightedReviewSum / g.actualReviewDocsCount).toFixed(1))
      : null;
    const effectiveRating = reviewAverage !== null ? reviewAverage : g.baseRating;

    return {
      ...g.primary,
      viewCount: g.maxViewCount,
      rating: effectiveRating,
      baseRating: g.baseRating,
      reviewAverageRating: reviewAverage,
      reviewCount: g.actualReviewDocsCount,
      itineraryCount: g.combinedItineraryCount,
      hasVerifiedReviews: g.actualReviewDocsCount > 0
    };
  });
};

// Get all destinations with multi-faceted filtering and search
exports.getDestinations = async (req, res) => {
  try {
    const { category, district, province, tag, search, sort } = req.query;
    let filter = {};

    // Category filter (handles category aliases and case-insensitivity)
    if (category && category !== 'All') {
      const catLower = category.toLowerCase();
      if (catLower === 'historical' || catLower === 'cultural') {
        filter.category = { $in: [/^historical/i, /^cultural/i] };
      } else if (catLower === 'wildlife' || catLower === 'nature') {
        filter.category = { $in: [/^wildlife/i, /^nature/i, /^forest/i] };
      } else if (catLower === 'mountain' || catLower === 'mountains') {
        filter.category = { $in: [/^mountain/i] };
      } else {
        filter.category = new RegExp(`^${category}$`, 'i');
      }
    }

    // District filter
    if (district && district !== 'All') {
      filter.district = new RegExp(`^${district}$`, 'i');
    }

    // Province filter
    if (province && province !== 'All') {
      filter.province = new RegExp(`^${province}$`, 'i');
    }

    // Tag / Interest filter
    if (tag && tag !== 'All') {
      filter.tags = new RegExp(`^${tag}$`, 'i');
    }

    // Keyword search across title, district, province, location, description, and tags
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { district: searchRegex },
        { province: searchRegex },
        { location: searchRegex },
        { category: searchRegex },
        { description: searchRegex },
        { tags: searchRegex }
      ];
    }

    // Sorting options
    let sortOption = { rating: -1, viewCount: -1 };
    if (sort === 'name-asc') sortOption = { name: 1 };
    if (sort === 'name-desc') sortOption = { name: -1 };
    if (sort === 'views') sortOption = { viewCount: -1, rating: -1 };
    if (sort === 'rating') sortOption = { rating: -1, viewCount: -1 };

    const destinations = await Destination.find(filter).sort(sortOption);

    res.status(200).json({ 
      success: true, 
      count: destinations.length, 
      data: destinations 
    });
  } catch (err) {
    console.error('Error in getDestinations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Retrieve distinct categories, districts, and provinces for dynamic filter options
exports.getFilterMetadata = async (req, res) => {
  try {
    const [categories, districts, provinces, totalCount] = await Promise.all([
      Destination.distinct('category'),
      Destination.distinct('district'),
      Destination.distinct('province'),
      Destination.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      data: {
        categories: categories.filter(Boolean).sort(),
        districts: districts.filter(Boolean).sort(),
        provinces: provinces.filter(Boolean).sort(),
        totalCount
      }
    });
  } catch (err) {
    console.error('Error in getFilterMetadata:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================================
// MODULE 7: POPULAR, MOST-VIEWED AND LAST-MINUTE RECOMMENDATIONS
// ============================================================================

/**
 * @desc    Safely record a tourist view on a destination detail page
 * @route   POST /api/destinations/:id/view
 * @access  Public
 */
exports.recordDestinationView = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid destination ID format.'
      });
    }

    // Ignore automated background prefetches if flagged
    const isBackground =
      req.headers?.['x-background-fetch'] === 'true' ||
      req.headers?.['purpose'] === 'prefetch' ||
      req.body?.isBackground === true;

    if (isBackground) {
      const existing = await Destination.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Destination not found' });
      }
      return res.status(200).json({
        success: true,
        counted: false,
        reason: 'Background prefetch ignored',
        viewCount: existing.viewCount || 0,
        data: existing
      });
    }

    // Deduplicate accidental repeated component renders within cooldown window
    const sessionKey =
      req.body?.sessionId ||
      req.headers?.['x-session-id'] ||
      req.user?.id ||
      req.ip ||
      'default-client';
    const forceCount = req.body?.force === true;
    const cacheKey = `${sessionKey}:${id}`;
    const now = Date.now();
    const lastViewed = recentViewCache.get(cacheKey);

    if (!forceCount && lastViewed && now - lastViewed < VIEW_COOLDOWN_MS) {
      const existing = await Destination.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Destination not found' });
      }
      return res.status(200).json({
        success: true,
        counted: false,
        deduplicated: true,
        viewCount: existing.viewCount || 0,
        data: existing
      });
    }

    recentViewCache.set(cacheKey, now);

    // Periodically prune old entries from deduplication map
    if (recentViewCache.size > 500) {
      for (const [k, ts] of recentViewCache.entries()) {
        if (now - ts > VIEW_COOLDOWN_MS * 5) {
          recentViewCache.delete(k);
        }
      }
    }

    const updated = await Destination.findByIdAndUpdate(
      id,
      {
        $inc: { viewCount: 1 },
        $set: { lastViewedAt: new Date() }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Destination not found' });
    }

    return res.status(200).json({
      success: true,
      counted: true,
      viewCount: updated.viewCount,
      data: updated
    });
  } catch (err) {
    console.error('Error in recordDestinationView:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get Most-Viewed Sri Lankan Destinations sorted by actual viewCount
 * @route   GET /api/destinations/most-viewed
 * @access  Public
 */
exports.getMostViewedDestinations = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(48, parseInt(req.query?.limit, 10) || 8));
    const category = req.query?.category;
    const district = req.query?.district;

    const filter = {};
    if (category && category !== 'All') {
      filter.category = new RegExp(`^${category}$`, 'i');
    }
    if (district && district !== 'All') {
      filter.district = new RegExp(`^${district}$`, 'i');
    }

    const rawDestinations = await Destination.find(filter).sort({ viewCount: -1, rating: -1 }).lean();
    const { reviewStatsById, itineraryCountById } = await buildDestinationAnalyticsMap();

    const deduplicated = deduplicateDestinationsWithStats(
      rawDestinations,
      reviewStatsById,
      itineraryCountById
    );

    const sorted = deduplicated
      .sort((a, b) => {
        if ((b.viewCount || 0) !== (a.viewCount || 0)) {
          return (b.viewCount || 0) - (a.viewCount || 0);
        }
        return (b.rating || 0) - (a.rating || 0);
      })
      .slice(0, limit)
      .map((dest, index) => ({
        ...dest,
        rank: index + 1
      }));

    return res.status(200).json({
      success: true,
      count: sorted.length,
      meta: {
        sortBy: 'viewCount (descending)',
        totalTrackedViews: deduplicated.reduce((acc, d) => acc + (d.viewCount || 0), 0)
      },
      data: sorted
    });
  } catch (err) {
    console.error('Error in getMostViewedDestinations:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get Top-Rated Destinations integrated with Member 5's Review model & Bayesian ranking
 * @route   GET /api/destinations/top-rated
 * @access  Public
 */
exports.getTopRatedDestinations = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(48, parseInt(req.query?.limit, 10) || 8));
    const minReviews = Math.max(0, parseInt(req.query?.minReviews, 10) || 0);
    const category = req.query?.category;

    const filter = {};
    if (category && category !== 'All') {
      filter.category = new RegExp(`^${category}$`, 'i');
    }

    const rawDestinations = await Destination.find(filter).lean();
    const { reviewStatsById, itineraryCountById, globalMeanRating, totalReviewCount } =
      await buildDestinationAnalyticsMap();

    const deduplicated = deduplicateDestinationsWithStats(
      rawDestinations,
      reviewStatsById,
      itineraryCountById
    );

    const m = 2; // Minimum review confidence threshold for Bayesian smoothing
    const C = globalMeanRating || 4.6;

    const ranked = deduplicated
      .filter((d) => d.reviewCount >= minReviews)
      .map((d) => {
        const v = d.reviewCount || 0;
        const R = v > 0 ? d.reviewAverageRating : (d.baseRating || 0);

        // Bayesian Weighted Average:
        // Prevents a single 5-star review from outranking a destination with many high reviews,
        // and weights destinations with verified tourist reviews higher than unreviewed baseline items.
        let weightedScore = 0;
        let ratingSource = 'Curated Baseline Rating (No Tourist Reviews Yet)';

        if (v > 0) {
          weightedScore = Number((((v / (v + m)) * R) + ((m / (v + m)) * C)).toFixed(2));
          ratingSource = v >= m
            ? `Verified Community Rating (${v} Reviews)`
            : `Initial Tourist Review (${v} Review • Bayesian Smoothed)`;
        } else if (R > 0) {
          // Unreviewed destinations receive a confidence-damped score so reviewed destinations take precedence
          weightedScore = Number((R * 0.85).toFixed(2));
        }

        return {
          ...d,
          rating: R,
          weightedScore,
          ratingSource
        };
      })
      .sort((a, b) => {
        if (b.weightedScore !== a.weightedScore) return b.weightedScore - a.weightedScore;
        if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
        if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
        return (b.viewCount || 0) - (a.viewCount || 0);
      })
      .slice(0, limit)
      .map((dest, idx) => ({
        ...dest,
        rank: idx + 1
      }));

    return res.status(200).json({
      success: true,
      count: ranked.length,
      meta: {
        rankingMethod: 'Bayesian Weighted Average (Review Integrated)',
        minimumThresholdWeight: m,
        globalMeanRating: C,
        totalDestinationReviewsInDb: totalReviewCount
      },
      data: ranked
    });
  } catch (err) {
    console.error('Error in getTopRatedDestinations:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get Popular Places in Sri Lanka (Composite score: View Count + Bayesian Rating + Tour Demand)
 * @route   GET /api/destinations/popular
 * @access  Public
 */
exports.getPopularDestinations = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(48, parseInt(req.query?.limit, 10) || 8));
    const category = req.query?.category;

    const filter = {};
    if (category && category !== 'All') {
      filter.category = new RegExp(`^${category}$`, 'i');
    }

    const rawDestinations = await Destination.find(filter).lean();
    const { reviewStatsById, itineraryCountById, globalMeanRating } =
      await buildDestinationAnalyticsMap();

    const deduplicated = deduplicateDestinationsWithStats(
      rawDestinations,
      reviewStatsById,
      itineraryCountById
    );

    const maxViews = Math.max(1, ...deduplicated.map((d) => d.viewCount || 0));
    const maxEngagement = Math.max(
      1,
      ...deduplicated.map((d) => (d.reviewCount || 0) * 2 + (d.itineraryCount || 0))
    );
    const m = 2;
    const C = globalMeanRating || 4.6;

    const scored = deduplicated
      .map((d) => {
        const v = d.reviewCount || 0;
        const R = v > 0 ? d.reviewAverageRating : (d.baseRating || 0);
        const bayesianRating = v > 0
          ? ((v / (v + m)) * R) + ((m / (v + m)) * C)
          : R * 0.9;

        // 45% Views + 40% Bayesian Rating + 15% Review/Itinerary Engagement
        const viewComponent = ((d.viewCount || 0) / maxViews) * 45;
        const ratingComponent = (Math.min(5, bayesianRating) / 5) * 40;
        const engagementRaw = (d.reviewCount || 0) * 2 + (d.itineraryCount || 0);
        const engagementComponent = (engagementRaw / maxEngagement) * 15;

        const popularityScore = Number(
          Math.min(100, viewComponent + ratingComponent + engagementComponent).toFixed(1)
        );

        let popularityBadge = 'Trending Spot';
        if (popularityScore >= 85) popularityBadge = 'Iconic #1 Choice';
        else if (popularityScore >= 75) popularityBadge = 'Most Popular';
        else if (d.reviewCount >= 2) popularityBadge = 'Traveller Favorite';

        return {
          ...d,
          weightedScore: Number(bayesianRating.toFixed(2)),
          popularityScore,
          popularityBadge
        };
      })
      .sort((a, b) => {
        if (b.popularityScore !== a.popularityScore) return b.popularityScore - a.popularityScore;
        return (b.viewCount || 0) - (a.viewCount || 0);
      })
      .slice(0, limit)
      .map((dest, idx) => ({
        ...dest,
        rank: idx + 1
      }));

    return res.status(200).json({
      success: true,
      count: scored.length,
      meta: {
        formula: '45% Normalized Views + 40% Bayesian Review Rating + 15% Tour & Review Engagement'
      },
      data: scored
    });
  } catch (err) {
    console.error('Error in getPopularDestinations:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get Last-Minute Travel Suggestions based on travel dates, trip duration, proximity,
 *          seasonality, popularity, and actual regional Hotel/Guide availability in MongoDB.
 * @route   GET /api/destinations/last-minute
 * @access  Public
 */
exports.getLastMinuteRecommendations = async (req, res) => {
  try {
    const days = Math.max(1, Math.min(30, parseInt(req.query?.days || req.query?.duration, 10) || 2));
    const limit = Math.max(1, Math.min(24, parseInt(req.query?.limit, 10) || 6));
    const startDateStr = req.query?.startDate || new Date().toISOString().split('T')[0];
    const parsedDate = new Date(startDateStr);
    const travelDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    // Default starting hub: Bandaranaike International Airport (CMB) / Colombo Gateway
    const originLat = req.query?.originLat !== undefined ? parseFloat(req.query.originLat) : 7.1808;
    const originLng = req.query?.originLng !== undefined ? parseFloat(req.query.originLng) : 79.8841;
    const originName = req.query?.originName || 'Bandaranaike International Airport (CMB)';
    const categoryFilter = req.query?.category;
    const districtFilter = req.query?.district;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentMonthIndex = travelDate.getMonth(); // 0..11
    const currentMonthName = monthNames[currentMonthIndex];

    // Determine Sri Lankan regional monsoon suitability for the selected month
    // Nov-Apr (months 10, 11, 0, 1, 2, 3): Ideal for South/West Coast, Cultural Triangle, Hill Country
    // May-Sep (months 4, 5, 6, 7, 8): Ideal for East Coast (Trincomalee, Ampara, Batticaloa) & Cultural Triangle
    const isSouthWestDrySeason = [10, 11, 0, 1, 2, 3].includes(currentMonthIndex);
    const isEastCoastDrySeason = [4, 5, 6, 7, 8].includes(currentMonthIndex);

    const filter = {};
    if (categoryFilter && categoryFilter !== 'All') {
      filter.category = new RegExp(`^${categoryFilter}$`, 'i');
    }
    if (districtFilter && districtFilter !== 'All') {
      filter.district = new RegExp(`^${districtFilter}$`, 'i');
    }

    const [rawDestinations, activeHotels, activeGuides, analytics] = await Promise.all([
      Destination.find(filter).lean(),
      Hotel.find({ availability: true }).select('name location pricePerNight rating facilities').lean().catch(() => []),
      Guide.find({ availability: true }).select('name serviceAreas dailyRate languages rating').lean().catch(() => []),
      buildDestinationAnalyticsMap()
    ]);

    const deduplicated = deduplicateDestinationsWithStats(
      rawDestinations,
      analytics.reviewStatsById,
      analytics.itineraryCountById
    );

    const maxViews = Math.max(1, ...deduplicated.map((d) => d.viewCount || 0));

    const evaluated = deduplicated.map((dest) => {
      const straightKm = computeHaversineKm(originLat, originLng, dest.latitude, dest.longitude);
      // Estimate winding Sri Lankan road distance (~1.28x straight line) and transit time (~45 km/h average)
      const estimatedRoadKm = straightKm !== null ? Number((straightKm * 1.28).toFixed(1)) : null;
      const estimatedDriveHours = estimatedRoadKm !== null ? Number((estimatedRoadKm / 45).toFixed(1)) : null;

      // 1. Trip Duration & Accessibility Suitability (0 - 35 pts)
      let durationScore = 25;
      let accessibilityReason = null;
      if (estimatedRoadKm !== null) {
        if (days === 1) {
          // 1-day trip: strongly favor destinations within ~140 km road distance (< 3 hrs one way)
          if (estimatedRoadKm <= 120) {
            durationScore = 35;
            accessibilityReason = `Quick ${estimatedDriveHours}h drive (${estimatedRoadKm} km) ideal for a 1-day trip`;
          } else if (estimatedRoadKm <= 175) {
            durationScore = 24;
            accessibilityReason = `Reachable in ~${estimatedDriveHours}h (${estimatedRoadKm} km) for a full-day excursion`;
          } else {
            durationScore = 8;
          }
        } else if (days === 2) {
          if (estimatedRoadKm <= 185) {
            durationScore = 35;
            accessibilityReason = `Comfortable ${estimatedDriveHours}h transfer (${estimatedRoadKm} km) for a 2-day weekend escape`;
          } else if (estimatedRoadKm <= 250) {
            durationScore = 24;
            accessibilityReason = `Scenic ${estimatedDriveHours}h drive (${estimatedRoadKm} km) suitable for a 2-day getaway`;
          } else {
            durationScore = 14;
          }
        } else {
          // 3+ days: island-wide destinations are feasible
          durationScore = 32;
          accessibilityReason = `Well-suited for a ${days}-day Sri Lankan itinerary (${estimatedRoadKm} km from origin)`;
        }
      }

      // 2. Travel Date & Seasonal Weather Suitability (0 - 25 pts)
      let seasonalScore = 18;
      let seasonalBadge = `Good in ${currentMonthName}`;
      const bestTimeText = (dest.bestVisitTime || '').toLowerCase();
      const monthLower = currentMonthName.toLowerCase();
      const eastDistricts = ['Trincomalee', 'Batticaloa', 'Ampara'];
      const southWestDistricts = ['Galle', 'Matara', 'Hambantota', 'Colombo', 'Kalutara'];

      if (bestTimeText.includes(monthLower) || bestTimeText.includes('year-round') || bestTimeText.includes('all year')) {
        seasonalScore = 25;
        seasonalBadge = `Peak Season in ${currentMonthName}`;
      } else if (isSouthWestDrySeason && (southWestDistricts.includes(dest.district) || bestTimeText.includes('november') || bestTimeText.includes('december') || bestTimeText.includes('january') || bestTimeText.includes('april'))) {
        seasonalScore = 25;
        seasonalBadge = `Prime Dry Season (${currentMonthName})`;
      } else if (isEastCoastDrySeason && (eastDistricts.includes(dest.district) || bestTimeText.includes('may') || bestTimeText.includes('june') || bestTimeText.includes('july') || bestTimeText.includes('august') || bestTimeText.includes('september'))) {
        seasonalScore = 25;
        seasonalBadge = `Prime East Coast Season (${currentMonthName})`;
      } else if (bestTimeText.includes('morning') || bestTimeText.includes('afternoon')) {
        seasonalScore = 21;
        seasonalBadge = `Suitable Year-Round (${dest.bestVisitTime})`;
      }

      // 3. Popularity & Rating Score (0 - 25 pts)
      const viewPts = ((dest.viewCount || 0) / maxViews) * 12;
      const ratingPts = (Math.min(5, dest.rating || 4.5) / 5) * 13;
      const popularityRatingScore = viewPts + ratingPts;

      // 4. Actual Partner Hotel & Guide Availability in MongoDB (0 - 15 pts)
      const destDistrictLower = (dest.district || '').toLowerCase();
      const destNameLower = (dest.name || '').toLowerCase();

      const matchingHotels = activeHotels.filter((h) => {
        const loc = (h.location || '').toLowerCase();
        return (
          (destDistrictLower && loc.includes(destDistrictLower)) ||
          loc.includes(destNameLower) ||
          destNameLower.includes(loc)
        );
      });

      const matchingGuides = activeGuides.filter((g) => {
        if (!Array.isArray(g.serviceAreas)) return false;
        return g.serviceAreas.some((area) => {
          const areaLower = (area || '').toLowerCase();
          return (
            (destDistrictLower && areaLower.includes(destDistrictLower)) ||
            areaLower.includes(destNameLower) ||
            destNameLower.includes(areaLower)
          );
        });
      });

      const hasRegionalServices = matchingHotels.length > 0 || matchingGuides.length > 0;
      const availabilityScore = hasRegionalServices
        ? Math.min(15, matchingHotels.length * 5 + matchingGuides.length * 5)
        : 6; // Honest baseline for self-arranged public destinations

      const lastMinuteScore = Number(
        Math.min(99, durationScore + seasonalScore + popularityRatingScore + availabilityScore).toFixed(1)
      );

      // Build human-readable recommendation reasons
      const reasons = [];
      if (accessibilityReason) reasons.push(accessibilityReason);
      reasons.push(`${seasonalBadge} • Best time: ${dest.bestVisitTime || 'Morning & Daylight Hours'}`);
      if (hasRegionalServices) {
        reasons.push(
          `${matchingHotels.length} active partner hotel(s) & ${matchingGuides.length} certified guide(s) registered in ${dest.district}`
        );
      } else {
        reasons.push('Open public destination — ideal for self-arranged or day-trip visits');
      }

      return {
        ...dest,
        lastMinuteScore,
        seasonalBadge,
        estimatedRoadDistanceKm: estimatedRoadKm,
        estimatedDriveHours,
        lastMinuteReasons: reasons,
        availabilityInfo: {
          status: hasRegionalServices
            ? 'Partner Services Available in District'
            : 'Suggested Destination (Self-Arranged / Public Access)',
          isConfirmedBooking: false,
          availableHotelsCount: matchingHotels.length,
          availableGuidesCount: matchingGuides.length,
          availableHotels: matchingHotels.map((h) => ({
            _id: h._id,
            name: h.name,
            location: h.location,
            pricePerNight: h.pricePerNight,
            rating: h.rating
          })),
          availableGuides: matchingGuides.map((g) => ({
            _id: g._id,
            name: g.name,
            dailyRate: g.dailyRate,
            rating: g.rating
          })),
          disclaimer: hasRegionalServices
            ? `${matchingHotels.length} partner hotel(s) and ${matchingGuides.length} guide(s) have active availability flags in ${dest.district}. Specific travel-date reservation confirmation is finalized at booking.`
            : `Suggested destination based on ${days}-day trip suitability and ${currentMonthName} weather. No partner hotel or guide is currently registered in ${dest.district} in the database.`
        }
      };
    });

    // For 1-day trips, filter out destinations that are too far (> 210 km road distance) if closer ones exist
    let filtered = evaluated;
    if (days === 1) {
      const reachable = evaluated.filter(
        (d) => d.estimatedRoadDistanceKm === null || d.estimatedRoadDistanceKm <= 210
      );
      if (reachable.length >= 3) {
        filtered = reachable;
      }
    }

    const sorted = filtered
      .sort((a, b) => {
        if (b.lastMinuteScore !== a.lastMinuteScore) return b.lastMinuteScore - a.lastMinuteScore;
        return (b.viewCount || 0) - (a.viewCount || 0);
      })
      .slice(0, limit)
      .map((dest, idx) => ({
        ...dest,
        rank: idx + 1
      }));

    return res.status(200).json({
      success: true,
      count: sorted.length,
      meta: {
        travelDate: travelDate.toISOString().split('T')[0],
        travelMonth: currentMonthName,
        requestedTripDays: days,
        originHub: {
          name: originName,
          latitude: originLat,
          longitude: originLng
        },
        availabilityNote:
          'Recommendations combine live destination popularity, seasonal suitability, road distance, and active Hotel/Guide records in MongoDB. Suggested destinations are clearly distinguished from confirmed reservations.'
      },
      data: sorted
    });
  } catch (err) {
    console.error('Error in getLastMinuteRecommendations:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get single destination by ID (and track view counts unless skipView=true)
exports.getDestinationById = async (req, res) => {
  try {
    const skipView =
      req.query?.skipView === 'true' ||
      req.headers?.['x-background-fetch'] === 'true';

    let destination;
    if (skipView) {
      destination = await Destination.findById(req.params.id);
    } else {
      destination = await Destination.findByIdAndUpdate(
        req.params.id,
        {
          $inc: { viewCount: 1 },
          $set: { lastViewedAt: new Date() }
        },
        { new: true }
      );
    }

    if (!destination) {
      return res.status(404).json({ success: false, error: 'Destination not found' });
    }

    // Attach live review statistics from Review collection
    const reviewAgg = await Review.aggregate([
      {
        $match: {
          targetType: 'destination',
          targetId: new mongoose.Types.ObjectId(destination._id),
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$targetId',
          averageRating: { $avg: '$score' },
          totalReviews: { $sum: 1 }
        }
      }
    ]).catch(() => []);

    const destObj = destination.toObject ? destination.toObject() : { ...destination };
    if (reviewAgg.length > 0) {
      destObj.reviewCount = reviewAgg[0].totalReviews;
      destObj.reviewAverageRating = Number(reviewAgg[0].averageRating.toFixed(1));
      destObj.rating = destObj.reviewAverageRating;
    }

    res.status(200).json({ success: true, data: destObj });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Create a new destination (Admin)
exports.createDestination = async (req, res) => {
  try {
    const destination = await Destination.create(req.body);
    res.status(201).json({ success: true, data: destination });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Update existing destination (Admin)
exports.updateDestination = async (req, res) => {
  try {
    const destination = await Destination.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!destination) return res.status(404).json({ success: false, error: 'Destination not found' });
    res.status(200).json({ success: true, data: destination });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Delete destination (Admin)
exports.deleteDestination = async (req, res) => {
  try {
    const destination = await Destination.findByIdAndDelete(req.params.id);
    if (!destination) return res.status(404).json({ success: false, error: 'Destination not found' });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
