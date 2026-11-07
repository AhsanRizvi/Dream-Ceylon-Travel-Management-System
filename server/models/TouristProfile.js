const mongoose = require('mongoose');

const TouristProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  travelDays: { type: Number, default: 3, min: 1, max: 30 },
  travelers: { type: Number, default: 2, min: 1, max: 50 },
  groupSize: { type: Number, default: 2, min: 1, max: 50 },
  mealType: {
    type: String,
    enum: [
      'Vegetarian',
      'Vegan',
      'Seafood',
      'All meat types',
      'Non-Vegetarian',
      'Halal',
      'Any'
    ],
    default: 'All meat types'
  },
  environments: [{ type: String }],
  interests: [{ type: String }],
  weatherPreference: {
    type: String,
    enum: ['Cool', 'Hot', 'Cloudy', 'Cold', 'Moderate', 'Any'],
    default: 'Cool'
  },
  transportation: {
    type: String,
    enum: ['Motorcycle', 'Car', 'Van', 'Bus', 'Train', 'Public'],
    default: 'Car'
  },
  guideRequirement: {
    type: String,
    enum: ['Required', 'Not required'],
    default: 'Not required'
  },
  guideRequired: { type: Boolean, default: false },
  packageLevel: {
    type: String,
    enum: ['Basic', 'Standard', 'Premium'],
    default: 'Standard'
  },
  startDate: { type: Date },
  preferredCurrency: { type: String, default: 'USD' }
}, { timestamps: true });

module.exports = mongoose.model('TouristProfile', TouristProfileSchema);