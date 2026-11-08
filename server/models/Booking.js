const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  touristId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tourPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourPlan', default: null },
  bookingType: {
    type: String,
    enum: ['guide', 'hotel', 'combined'],
    default: 'combined'
  },
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', default: null },
  guideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guide', default: null },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Rejected', 'Cancelled', 'Completed'],
    default: 'Pending'
  },
  currency: { type: String, default: 'LKR' },
  totalAmount: { type: Number, required: true, min: 0 },

  // Guide Booking Details
  startDate: { type: Date },
  endDate: { type: Date },
  serviceDays: { type: Number, min: 1 },
  dailyRateLKR: { type: Number, min: 0 },
  travelersCount: { type: Number, min: 1, default: 1 },
  serviceNotes: { type: String, trim: true, default: '' },

  // Hotel Booking Details
  roomId: { type: mongoose.Schema.Types.ObjectId, default: null },
  roomType: { type: String, trim: true, default: '' },
  roomQuantity: { type: Number, min: 1, default: 1 },
  checkInDate: { type: Date },
  checkOutDate: { type: Date },
  nights: { type: Number, min: 1 },
  guestsCount: { type: Number, min: 1, default: 1 },
  roomRatePerNightLKR: { type: Number, min: 0 },
  specialRequests: { type: String, trim: true, default: '' },

  // Service Provider Response Metadata
  providerNote: { type: String, trim: true, default: '' },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  respondedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

BookingSchema.index({ touristId: 1, createdAt: -1 });
BookingSchema.index({ guideId: 1, status: 1, startDate: 1, endDate: 1 });
BookingSchema.index({ hotelId: 1, status: 1, checkInDate: 1, checkOutDate: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
