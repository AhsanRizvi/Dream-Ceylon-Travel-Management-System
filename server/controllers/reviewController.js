const mongoose = require('mongoose');
const Review = require('../models/Review');
const Guide = require('../models/Guide');
const Hotel = require('../models/Hotel');
const Booking = require('../models/Booking');
const {
  normalizeTargetType,
  recalculateTargetRating,
  getPopularTargets
} = require('../services/ratingService');

// Helper: verify target exists in database
const findTargetEntity = async (normalizedType, targetId) => {
  if (!mongoose.Types.ObjectId.isValid(targetId)) return null;
  if (normalizedType === 'guide') {
    return await Guide.findById(targetId).populate('userId', 'name email');
  }
  if (normalizedType === 'hotel') {
    return await Hotel.findById(targetId).populate('ownerId', 'name email');
  }
  return null;
};

// @desc    Create a review for a guide or hotel
// @route   POST /api/reviews
// @access  Private (tourist)
exports.createReview = async (req, res) => {
  try {
    const { targetType, targetId, score, comment } = req.body;

    // 1. Validate targetType against explicit allowlist
    const normalizedType = normalizeTargetType(targetType);
    if (!normalizedType) {
      return res.status(400).json({
        success: false,
        error: 'Invalid targetType. Must be either "guide" or "hotel".'
      });
    }

    // 2. Validate targetId is a valid MongoDB ObjectId
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid targetId provided.'
      });
    }

    // 3. Validate rating score (integer 1..5)
    const numericScore = Number(score);
    if (!Number.isInteger(numericScore) || numericScore < 1 || numericScore > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating score must be a whole number between 1 and 5.'
      });
    }

    // 4. Validate comment
    if (!comment || typeof comment !== 'string' || comment.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid review comment (at least 3 characters).'
      });
    }

    if (comment.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Review comment cannot exceed 1000 characters.'
      });
    }

    // 5. Ensure target Guide or Hotel exists
    const targetEntity = await findTargetEntity(normalizedType, targetId);
    if (!targetEntity) {
      return res.status(404).json({
        success: false,
        error: `${normalizedType === 'guide' ? 'Guide' : 'Hotel'} not found.`
      });
    }

    // 6. Prevent self-review if user is also the owner/guide
    const ownerUserId = normalizedType === 'guide'
      ? targetEntity.userId?._id?.toString() || targetEntity.userId?.toString()
      : targetEntity.ownerId?._id?.toString() || targetEntity.ownerId?.toString();
    if (ownerUserId && ownerUserId === req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You cannot submit a review for your own service.'
      });
    }

    // 7. Prevent duplicate review by the same tourist for the same target
    const existingReview = await Review.findOne({
      authorId: req.user.id,
      targetType: normalizedType,
      targetId: targetId,
      status: { $ne: 'removed' }
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: 'You have already submitted a review for this service. You can edit your existing review instead.'
      });
    }

    // 8. Check Booking model to verify if tourist has booked / completed this service
    const bookingField = normalizedType === 'guide' ? 'guideId' : 'hotelId';
    const matchingBookings = await Booking.find({
      touristId: req.user.id,
      [bookingField]: targetId,
      status: { $ne: 'Cancelled' }
    }).sort({ createdAt: -1 });

    // If the user has a booking for this service, verify it is Completed (or Confirmed/Completed)
    // If they have only a Pending booking for this target, require completion first
    let verifiedBooking = false;
    let verifiedBookingId = null;

    if (matchingBookings.length > 0) {
      const completedBooking = matchingBookings.find((b) => b.status === 'Completed');
      const confirmedBooking = matchingBookings.find((b) => b.status === 'Confirmed');

      if (completedBooking) {
        verifiedBooking = true;
        verifiedBookingId = completedBooking._id;
      } else if (confirmedBooking) {
        verifiedBooking = true;
        verifiedBookingId = confirmedBooking._id;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Your booking for this service is still Pending. You can review once your booking is Confirmed or Completed.'
        });
      }
    }

    // 9. Create review safely (prevent mass assignment of status, moderation, or authorId)
    const review = await Review.create({
      authorId: req.user.id,
      targetType: normalizedType,
      targetId,
      score: numericScore,
      comment: comment.trim(),
      verifiedBooking,
      bookingId: verifiedBookingId,
      status: 'active'
    });

    await review.populate('authorId', 'name profileImage role');

    // 10. Recalculate and synchronize target rating & reviewCount
    const ratingStats = await recalculateTargetRating(normalizedType, targetId);

    res.status(201).json({
      success: true,
      data: review,
      ratingStats
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get active reviews for a target (supports /:targetType/:targetId, /:id, or query params)
// @route   GET /api/reviews/:targetType/:targetId
// @route   GET /api/reviews/:id
// @route   GET /api/reviews
// @access  Public
exports.getReviews = async (req, res) => {
  try {
    const filter = { status: 'active' };

    const rawType = req.params.targetType || req.query.targetType;
    const rawTargetId = req.params.targetId || req.params.id || req.query.targetId;

    if (rawType) {
      const normalizedType = normalizeTargetType(rawType);
      if (!normalizedType) {
        return res.status(400).json({
          success: false,
          error: 'Invalid targetType. Must be "guide" or "hotel".'
        });
      }
      filter.targetType = normalizedType;
    }

    if (rawTargetId) {
      if (!mongoose.Types.ObjectId.isValid(rawTargetId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid targetId format.'
        });
      }
      filter.targetId = rawTargetId;
    }

    const reviews = await Review.find(filter)
      .populate('authorId', 'name profileImage role')
      .select('-reports -moderationHistory')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get rating statistics & star distribution for a guide or hotel
// @route   GET /api/reviews/ratings/:targetType/:targetId
// @access  Public
exports.getTargetRatingStats = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const normalizedType = normalizeTargetType(targetType);

    if (!normalizedType) {
      return res.status(400).json({
        success: false,
        error: 'Invalid targetType. Must be "guide" or "hotel".'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid targetId format.'
      });
    }

    const targetEntity = await findTargetEntity(normalizedType, targetId);
    if (!targetEntity) {
      return res.status(404).json({
        success: false,
        error: `${normalizedType === 'guide' ? 'Guide' : 'Hotel'} not found.`
      });
    }

    const stats = await recalculateTargetRating(normalizedType, targetId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get popular / top-rated guides or hotels using Bayesian weighted ranking
// @route   GET /api/reviews/popular/:targetType
// @access  Public
exports.getPopularByTargetType = async (req, res) => {
  try {
    const { targetType } = req.params;
    const normalizedType = normalizeTargetType(targetType);

    if (!normalizedType) {
      return res.status(400).json({
        success: false,
        error: 'Invalid targetType. Must be "guide" or "hotel".'
      });
    }

    const result = await getPopularTargets(normalizedType, {
      limit: req.query.limit,
      minReviews: req.query.minReviews
    });

    res.status(200).json({
      success: true,
      count: result.items.length,
      meta: {
        targetType: result.targetType,
        rankingMethod: result.rankingMethod,
        minimumThresholdWeight: result.minimumThresholdWeight,
        globalMeanRating: result.globalMeanRating
      },
      data: result.items
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get authenticated user's own reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      authorId: req.user.id,
      status: { $ne: 'removed' }
    })
      .populate('authorId', 'name profileImage role')
      .select('-reports')
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with target display name for user dashboard convenience
    const enrichedReviews = await Promise.all(
      reviews.map(async (rev) => {
        let targetName = 'Unknown Service';
        let targetDetails = null;
        if (rev.targetType === 'hotel') {
          const hotel = await Hotel.findById(rev.targetId).select('name location pricePerNight rating').lean();
          if (hotel) {
            targetName = hotel.name;
            targetDetails = hotel;
          }
        } else if (rev.targetType === 'guide') {
          const guide = await Guide.findById(rev.targetId).populate('userId', 'name').lean();
          if (guide) {
            targetName = guide.name || guide.userId?.name || 'Certified Tour Guide';
            targetDetails = guide;
          }
        }
        return {
          ...rev,
          targetName,
          targetDetails
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedReviews.length,
      data: enrichedReviews
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update an existing review (only review author)
// @route   PUT /api/reviews/:id
// @access  Private (tourist / author)
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid review ID.' });
    }

    const review = await Review.findById(id);
    if (!review || review.status === 'removed') {
      return res.status(404).json({ success: false, error: 'Review not found.' });
    }

    // Verify ownership
    if (review.authorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to edit this review.'
      });
    }

    if (review.status === 'hidden') {
      return res.status(403).json({
        success: false,
        error: 'This review is currently hidden by moderation and cannot be edited.'
      });
    }

    const { score, comment } = req.body;

    if (score !== undefined) {
      const numericScore = Number(score);
      if (!Number.isInteger(numericScore) || numericScore < 1 || numericScore > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating score must be a whole number between 1 and 5.'
        });
      }
      review.score = numericScore;
    }

    if (comment !== undefined) {
      if (typeof comment !== 'string' || comment.trim().length < 3) {
        return res.status(400).json({
          success: false,
          error: 'Review comment must be at least 3 characters long.'
        });
      }
      if (comment.trim().length > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Review comment cannot exceed 1000 characters.'
        });
      }
      review.comment = comment.trim();
    }

    await review.save();
    await review.populate('authorId', 'name profileImage role');

    const ratingStats = await recalculateTargetRating(review.targetType, review.targetId);

    res.status(200).json({
      success: true,
      data: review,
      ratingStats
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete a review (author or admin)
// @route   DELETE /api/reviews/:id
// @access  Private (author or admin)
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid review ID.' });
    }

    const review = await Review.findById(id);
    if (!review || review.status === 'removed') {
      return res.status(404).json({ success: false, error: 'Review not found.' });
    }

    const isOwner = review.authorId.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to delete this review.'
      });
    }

    const { targetType, targetId } = review;

    // If deleted by admin or if review has reports, preserve record as soft-deleted ('removed')
    // for audit history; if ordinary author deletes their own clean review, delete or mark removed
    if (isAdmin || (review.reports && review.reports.length > 0)) {
      review.status = 'removed';
      review.moderatedBy = req.user.id;
      review.moderatedAt = Date.now();
      review.moderationHistory.push({
        adminId: req.user.id,
        action: 'remove',
        note: isAdmin ? 'Removed by administrator' : 'Removed by author after report'
      });
      await review.save();
    } else {
      await Review.findByIdAndDelete(id);
    }

    const ratingStats = await recalculateTargetRating(targetType, targetId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully.',
      data: {},
      ratingStats
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Report an inappropriate review
// @route   POST /api/reviews/:id/report
// @access  Private (any authenticated user)
exports.reportReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, details } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid review ID.' });
    }

    const allowedReasons = ['inappropriate', 'abusive', 'spam', 'irrelevant', 'other'];
    const normalizedReason = reason ? reason.toString().trim().toLowerCase() : '';
    if (!allowedReasons.includes(normalizedReason)) {
      return res.status(400).json({
        success: false,
        error: `Invalid report reason. Must be one of: ${allowedReasons.join(', ')}.`
      });
    }

    const review = await Review.findById(id);
    if (!review || review.status === 'removed') {
      return res.status(404).json({ success: false, error: 'Review not found.' });
    }

    // Prevent reporting own review
    if (review.authorId.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'You cannot report your own review.'
      });
    }

    // Prevent duplicate reports from the same user
    const alreadyReported = review.reports.some(
      (rep) => rep.reportedBy.toString() === req.user.id.toString()
    );

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        error: 'You have already reported this review. Our moderation team will review it.'
      });
    }

    review.reports.push({
      reportedBy: req.user.id,
      reason: normalizedReason,
      details: details ? details.toString().trim().slice(0, 500) : '',
      status: 'pending'
    });
    review.isReported = true;

    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review reported successfully for administrator moderation.',
      data: {
        reviewId: review._id,
        isReported: review.isReported,
        reportCount: review.reports.length
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get reported / moderated reviews for administrators
// @route   GET /api/reviews/admin/reported
// @access  Private (admin only)
exports.getReportedReviews = async (req, res) => {
  try {
    const statusFilter = req.query.status; // optional: 'active', 'hidden', 'removed', 'all'
    const query = {
      $or: [
        { isReported: true },
        { 'reports.0': { $exists: true } },
        { status: { $in: ['hidden', 'removed'] } }
      ]
    };

    if (statusFilter && ['active', 'hidden', 'removed'].includes(statusFilter)) {
      query.status = statusFilter;
    }

    const reviews = await Review.find(query)
      .populate('authorId', 'name email role profileImage')
      .populate('reports.reportedBy', 'name email role')
      .populate('moderatedBy', 'name email')
      .populate('moderationHistory.adminId', 'name email')
      .sort({ isReported: -1, updatedAt: -1 })
      .lean();

    // Enrich with target names
    const enriched = await Promise.all(
      reviews.map(async (rev) => {
        let targetName = 'Unknown Target';
        if (rev.targetType === 'hotel') {
          const hotel = await Hotel.findById(rev.targetId).select('name location').lean();
          if (hotel) targetName = `${hotel.name} (${hotel.location})`;
        } else if (rev.targetType === 'guide') {
          const guide = await Guide.findById(rev.targetId).populate('userId', 'name').lean();
          if (guide) targetName = guide.name || guide.userId?.name || 'Tour Guide';
        }
        return {
          ...rev,
          targetName,
          pendingReportsCount: (rev.reports || []).filter((r) => r.status === 'pending').length
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Moderate a review (hide, restore, remove, dismiss_reports)
// @route   PATCH /api/reviews/admin/:id/moderate
// @access  Private (admin only)
exports.moderateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid review ID.' });
    }

    const allowedActions = ['hide', 'restore', 'remove', 'dismiss_reports'];
    if (!action || !allowedActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Invalid moderation action. Allowed actions: ${allowedActions.join(', ')}.`
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found.' });
    }

    if (action === 'hide') {
      review.status = 'hidden';
      review.reports.forEach((rep) => {
        if (rep.status === 'pending') rep.status = 'reviewed';
      });
    } else if (action === 'restore') {
      review.status = 'active';
      review.isReported = false;
      review.reports.forEach((rep) => {
        if (rep.status === 'pending') rep.status = 'dismissed';
      });
    } else if (action === 'remove') {
      review.status = 'removed';
      review.reports.forEach((rep) => {
        if (rep.status === 'pending') rep.status = 'reviewed';
      });
    } else if (action === 'dismiss_reports') {
      review.isReported = false;
      review.reports.forEach((rep) => {
        rep.status = 'dismissed';
      });
    }

    review.moderationNote = note ? note.toString().trim().slice(0, 500) : review.moderationNote;
    review.moderatedBy = req.user.id;
    review.moderatedAt = Date.now();
    review.moderationHistory.push({
      adminId: req.user.id,
      action,
      note: note ? note.toString().trim().slice(0, 500) : `Action: ${action}`
    });

    await review.save();
    await review.populate('authorId', 'name email role');
    await review.populate('moderatedBy', 'name email');

    // Recalculate target ratings since hidden/removed reviews are excluded from public averages
    const ratingStats = await recalculateTargetRating(review.targetType, review.targetId);

    res.status(200).json({
      success: true,
      message: `Review moderation action "${action}" applied successfully.`,
      data: review,
      ratingStats
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
