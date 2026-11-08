
const mongoose = require('mongoose');

const TourPlanSchema = new mongoose.Schema({
  touristId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Tour details
  title: {
    type: String,
    default: 'Personalized Sri Lankan Tour'
  },
  days: {
    type: Number,
    required: true,
    min: 1
  },
  travelers: {
    type: Number,
    default: 1,
    min: 1
  },

  stops: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination'
  }],

  dates: {
    start: { type: Date },
    end: { type: Date }
  },

  times: { type: String },

  // Transportation details
  transportType: {
    type: String,
    enum: ['Motorcycle', 'Car', 'Van', 'Bus', 'Train', 'Public'],
    default: 'Car'
  },

  startLocation: { type: Object },
  routeData: { type: Object },

  // Package details
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package'
  },
  packageName: {
    type: String,
    enum: ['Basic', 'Standard', 'Premium'],
    default: 'Standard'
  },

  // Hotel details
  selectedHotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    default: null
  },
  selectedRoomType: {
    type: String,
    default: ''
  },
  numberOfRooms: {
    type: Number,
    default: 1,
    min: 1
  },

  // Guide details
  selectedGuideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guide',
    default: null
  },

  // Meal preferences
  mealType: {
    type: String,
    enum: ['Vegetarian', 'Vegan', 'Seafood', 'All meat types', 'None'],
    default: 'None'
  },

  // Customization and pricing
  customizations: {
    type: Object,
    default: {}
  },
  pricingSummary: {
    type: Object,
    default: null
  },
  totalEstimatedCostLKR: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'LKR'
  }

}, { timestamps: true });

module.exports = mongoose.model('TourPlan', TourPlanSchema);
