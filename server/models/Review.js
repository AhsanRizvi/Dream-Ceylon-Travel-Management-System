const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    enum: ['inappropriate', 'abusive', 'spam', 'irrelevant', 'other'],
    required: true
  },
  details: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'dismissed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ModerationHistorySchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['hide', 'restore', 'remove', 'dismiss_reports'],
    required: true
  },
  note: {
    type: String,
    trim: true,
    maxlength: 500
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const ReviewSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Review author is required']
  },
  targetType: {
    type: String,
    enum: {
      values: ['hotel', 'guide'],
      message: 'Target type must be either hotel or guide'
    },
    required: [true, 'Target type is required']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Target ID is required']
  },
  score: {
    type: Number,
    min: [1, 'Rating score must be at least 1'],
    max: [5, 'Rating score cannot exceed 5'],
    required: [true, 'Rating score is required'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating score must be an integer between 1 and 5'
    }
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    minlength: [3, 'Comment must be at least 3 characters long'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  verifiedBooking: {
    type: Boolean,
    default: false
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'hidden', 'removed'],
    default: 'active'
  },
  isReported: {
    type: Boolean,
    default: false
  },
  reports: [ReportSchema],
  moderationNote: {
    type: String,
    trim: true
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  moderatedAt: {
    type: Date,
    default: null
  },
  moderationHistory: [ModerationHistorySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for fast target lookup, author lookup, and moderation filtering
ReviewSchema.index({ targetType: 1, targetId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ authorId: 1, targetType: 1, targetId: 1 });
ReviewSchema.index({ isReported: 1, status: 1 });

ReviewSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Review', ReviewSchema);
