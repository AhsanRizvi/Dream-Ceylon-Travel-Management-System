const mongoose = require('mongoose');
const Review = require('../models/Review');
const Guide = require('../models/Guide');
const Hotel = require('../models/Hotel');

/**
 * Normalize targetType to lowercase ('guide' or 'hotel')
 */
const normalizeTargetType = (targetType) => {
  if (!targetType || typeof targetType !== 'string') return null;
  const cleaned = targetType.trim().toLowerCase();
  if (cleaned === 'guide' || cleaned === 'guides') return 'guide';
  if (cleaned === 'hotel' || cleaned === 'hotels') return 'hotel';
  return null;
};

/**
 * Calculate rating statistics (averageRating, totalReviews, distribution 1-5)
 * for a given targetType ('guide' | 'hotel') and targetId using MongoDB Aggregation.
 * Also synchronizes the target Guide or Hotel document's rating and reviewCount fields.
 */
const recalculateTargetRating = async (targetType, targetId) => {
  const normalizedType = normalizeTargetType(targetType);
  if (!normalizedType || !mongoose.Types.ObjectId.isValid(targetId)) {
    throw new Error('Invalid targetType or targetId for rating aggregation');
  }

  const objectId = new mongoose.Types.ObjectId(targetId);

  const aggregation = await Review.aggregate([
    {
      $match: {
        targetType: normalizedType,
        targetId: objectId,
        status: 'active'
      }
    },
    {
      $group: {
        _id: '$targetId',
        averageRating: { $avg: '$score' },
        totalReviews: { $sum: 1 },
        star1: { $sum: { $cond: [{ $eq: ['$score', 1] }, 1, 0] } },
        star2: { $sum: { $cond: [{ $eq: ['$score', 2] }, 1, 0] } },
        star3: { $sum: { $cond: [{ $eq: ['$score', 3] }, 1, 0] } },
        star4: { $sum: { $cond: [{ $eq: ['$score', 4] }, 1, 0] } },
        star5: { $sum: { $cond: [{ $eq: ['$score', 5] }, 1, 0] } }
      }
    }
  ]);

  let stats = {
    targetType: normalizedType,
    targetId: targetId.toString(),
    averageRating: 0,
    totalReviews: 0,
    distribution: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    }
  };

  if (aggregation.length > 0) {
    const res = aggregation[0];
    stats.averageRating = Number(res.averageRating.toFixed(1));
    stats.totalReviews = res.totalReviews;
    stats.distribution = {
      1: res.star1,
      2: res.star2,
      3: res.star3,
      4: res.star4,
      5: res.star5
    };
  }

  // Synchronize rating and reviewCount on the target Guide or Hotel document
  const TargetModel = normalizedType === 'guide' ? Guide : Hotel;
  await TargetModel.findByIdAndUpdate(objectId, {
    rating: stats.averageRating,
    reviewCount: stats.totalReviews
  });

  return stats;
};

/**
 * Compute popular / highly-rated items using Bayesian weighted average ranking:
 * weightedScore = (v / (v + m)) * R + (m / (v + m)) * C
 * where:
 *   R = item's average rating
 *   v = item's number of active reviews
 *   m = minimum review threshold (default 2)
 *   C = global mean rating across active reviews for that targetType (or 4.0 fallback)
 *
 * This prevents an item with a single 5-star review from automatically outranking
 * an item with many consistently high reviews.
 */
const getPopularTargets = async (targetType, options = {}) => {
  const normalizedType = normalizeTargetType(targetType);
  if (!normalizedType) {
    throw new Error('Invalid target type. Must be guide or hotel.');
  }

  const limit = Math.max(1, Math.min(50, parseInt(options.limit, 10) || 6));
  const minReviews = Math.max(0, parseInt(options.minReviews, 10) || 0);
  const m = 2; // smoothing weight for Bayesian confidence

  // Calculate global average across all active reviews of this targetType
  const globalAgg = await Review.aggregate([
    { $match: { targetType: normalizedType, status: 'active' } },
    {
      $group: {
        _id: null,
        globalAvg: { $avg: '$score' },
        totalCount: { $sum: 1 }
      }
    }
  ]);

  const C = globalAgg.length > 0 && globalAgg[0].globalAvg ? globalAgg[0].globalAvg : 4.0;

  // Aggregate per-target active review stats
  const perTargetAgg = await Review.aggregate([
    { $match: { targetType: normalizedType, status: 'active' } },
    {
      $group: {
        _id: '$targetId',
        averageRating: { $avg: '$score' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  const statsMap = new Map();
  perTargetAgg.forEach((item) => {
    statsMap.set(item._id.toString(), {
      averageRating: Number(item.averageRating.toFixed(1)),
      totalReviews: item.totalReviews
    });
  });

  const TargetModel = normalizedType === 'guide' ? Guide : Hotel;
  const populateField = normalizedType === 'guide' ? { path: 'userId', select: 'name email profileImage' } : { path: 'ownerId', select: 'name email' };

  const targets = await TargetModel.find().populate(populateField).lean();

  const enriched = targets
    .map((target) => {
      const liveStats = statsMap.get(target._id.toString());
      const R = liveStats ? liveStats.averageRating : (target.rating || 0);
      const v = liveStats ? liveStats.totalReviews : (target.reviewCount || 0);

      // If item has 0 reviews and no initial rating, weightedScore is 0
      const weightedScore = v > 0
        ? Number((((v / (v + m)) * R) + ((m / (v + m)) * C)).toFixed(2))
        : (R > 0 ? Number((R * 0.7).toFixed(2)) : 0);

      return {
        ...target,
        rating: R,
        reviewCount: v,
        weightedScore
      };
    })
    .filter((item) => item.reviewCount >= minReviews)
    .sort((a, b) => {
      if (b.weightedScore !== a.weightedScore) return b.weightedScore - a.weightedScore;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return b.rating - a.rating;
    })
    .slice(0, limit);

  return {
    targetType: normalizedType,
    rankingMethod: 'Bayesian Weighted Average',
    minimumThresholdWeight: m,
    globalMeanRating: Number(C.toFixed(2)),
    items: enriched
  };
};

module.exports = {
  normalizeTargetType,
  recalculateTargetRating,
  getPopularTargets
};

