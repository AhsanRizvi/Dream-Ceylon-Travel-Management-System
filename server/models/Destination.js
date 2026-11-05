const mongoose = require('mongoose');

const DestinationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  district: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  rating: { type: Number, min: 1, max: 5 },
  viewCount: { type: Number, default: 0 },
  bestVisitTime: { type: String },
  image: { type: String },
  imageUrl: { type: String }
});

module.exports = mongoose.model('Destination', DestinationSchema);