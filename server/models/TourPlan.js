const mongoose = require('mongoose');

const TourPlanSchema = new mongoose.Schema({
  touristId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Personalized Sri Lankan Tour' },
  days: { type: Number, required: true },
  stops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Destination' }],
  dates: {
    start: { type: Date },
    end: { type: Date }
  },
  times: { type: String },
  transportType: { type: String, enum: ['Car', 'Van', 'Motorcycle', 'Bus', 'Train', 'Public'], default: 'Car' },
  startLocation: { type: Object },
  routeData: { type: Object }
}, {
  timestamps: true
});

module.exports = mongoose.model('TourPlan', TourPlanSchema);