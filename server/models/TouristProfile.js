
const mongoose = require('mongoose');

const TouristProfileSchema = new mongoose.Schema({

  // User details
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Travel details
  travelDays: {
    type: Number,
    default: 3,
    min: 1,
    max: 30
  },

  travelers: {
    type: Number,
    default: 2,
    min: 1,
    max: 50
  },

  groupSize: {
    type: Number,
    default: 2,
    min: 1,
    max: 50
  },

  // Meal preferences
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

  // Destination preferences
  environments: [{
    type: String
  }],

  interests: [{
    type: String
  }],

  // Weather preferences
  weatherPreference: {
    type: String,
    enum: [
      'Cool',
      'Hot',
      'Cloudy',
      'Cold',
      'Moderate',
      'Mild',
      'Any'
    ],
    default: 'Cool'
  },

  // Transportation preferences
  transportation: {
    type: String,
    enum: [
      'Motorcycle',
      'Car',
      'Van',
      'Bus',
      'Train',
      'Public'
    ],
    default: 'Car'
  },

  // Guide preferences
  guideRequirement: {
    type: String,
    enum: ['Required', 'Not required'],
    default: 'Not required'
  },

  guideRequired: {
    type: Boolean,
    default: false
  },

  // Package preferences
  packageLevel: {
    type: String,
    enum: ['Basic', 'Standard', 'Premium'],
    default: 'Standard'
  },

  selectedPackageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package'
  },

  selectedPackageName: {
    type: String,
    enum: ['Basic', 'Standard', 'Premium']
  },

  // Travel date
  startDate: {
    type: Date
  },

  // Currency preferences
  preferredCurrency: {
    type: String,
    enum: ['LKR', 'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'QAR'],
    default: 'LKR'
  }

}, { timestamps: true });

module.exports = mongoose.model('TouristProfile', TouristProfileSchema);
