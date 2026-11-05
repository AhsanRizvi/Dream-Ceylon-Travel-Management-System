const mongoose = require('mongoose');

const GuideSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String },
  bio: { type: String },
  serviceAreas: [{ type: String }],
  languages: [{ type: String }],
  dailyRate: { type: Number, required: true },
  availability: { type: Boolean, default: true },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('Guide', GuideSchema);
