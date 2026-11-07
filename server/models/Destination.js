const mongoose = require('mongoose');

const DestinationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  district: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  rating: { type: Number, min: 1, max: 5 },
  reviewCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  bestVisitTime: { type: String },
  image: { type: String },
  imageUrl: { type: String },
  // Extended metadata for Module 1 (Recommendation) & Module 6 (Scheduling)
  environments: [{ type: String }],
  weatherSuitability: [{ type: String }],
  estimatedDurationHours: { type: Number, default: 3 },
  openingHours: { type: String, default: '06:00 AM - 06:00 PM' }
}, { timestamps: true });

module.exports = mongoose.model('Destination', DestinationSchema);