
const mongoose = require('mongoose');

// Individual activity schema
const ActivitySchema = new mongoose.Schema({
  activityId: {
    type: String
  },

  type: {
    type: String,
    enum: ['visit', 'travel', 'meal', 'rest', 'check_in'],
    default: 'visit'
  },

  title: {
    type: String,
    required: true
  },

  destinationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination',
    default: null
  },

  destinationName: {
    type: String
  },

  district: {
    type: String
  },

  category: {
    type: String
  },

  image: {
    type: String
  },

  latitude: {
    type: Number
  },

  longitude: {
    type: Number
  },

  startTime: {
    type: String,
    required: true
  },

  endTime: {
    type: String,
    required: true
  },

  durationMinutes: {
    type: Number,
    default: 60
  },

  bestVisitTime: {
    type: String
  },

  openingHours: {
    type: String
  },

  distanceKm: {
    type: Number
  },

  isEstimatedTravel: {
    type: Boolean,
    default: true
  },

  description: {
    type: String
  },

  notes: {
    type: String
  }

}, { _id: true });


// Daily itinerary schema
const DailyItinerarySchema = new mongoose.Schema({
  dayNumber: {
    type: Number,
    required: true
  },

  date: {
    type: Date
  },

  title: {
    type: String
  },

  districtFocus: {
    type: String
  },

  totalActivityHours: {
    type: Number,
    default: 0
  },

  totalTravelMinutes: {
    type: Number,
    default: 0
  },

  notes: {
    type: String
  },

  activities: [ActivitySchema]

}, { _id: true });


// Main Tour Plan schema
const TourPlanSchema = new mongoose.Schema({

  // Tourist details
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
    min: 1,
    max: 30
  },

  travelers: {
    type: Number,
    default: 1,
    min: 1,
    max: 50
  },

  stops: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination'
  }],

  dates: {
    start: {
      type: Date
    },
    end: {
      type: Date
    }
  },

  times: {
    type: String
  },


  // Transportation details
  transportType: {
    type: String,
    enum: ['Motorcycle', 'Car', 'Van', 'Bus', 'Train', 'Public'],
    default: 'Car'
  },

  startLocation: {
    type: Object
  },

  routeData: {
    type: Object
  },


  // Planner preferences
  preferences: {
    mealType: {
      type: String,
      default: 'All meat types'
    },

    environments: [{
      type: String
    }],

    interests: [{
      type: String
    }],

    weatherPreference: {
      type: String,
      default: 'Cool'
    },

    transportation: {
      type: String,
      default: 'Car'
    },

    guideRequirement: {
      type: String,
      default: 'Not required'
    },

    packageLevel: {
      type: String,
      enum: ['Basic', 'Standard', 'Premium'],
      default: 'Standard'
    },

    selectedMealOption: {
      type: String
    },

    selectedGuideOption: {
      type: String
    },

    addGuide: {
      type: Boolean,
      default: false
    }
  },


  // Daily itinerary
  dailyItinerary: [DailyItinerarySchema],


  // Planner cost estimate
  costEstimate: {
    baseTotal: {
      type: Number,
      default: 0
    },

    guideCost: {
      type: Number,
      default: 0
    },

    mealExtraCost: {
      type: Number,
      default: 0
    },

    grandTotal: {
      type: Number,
      default: 0
    }
  },


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
  },


  // Plan status
  status: {
    type: String,
    enum: ['Draft', 'Saved', 'Confirmed', 'Completed'],
    default: 'Saved'
  }

}, { timestamps: true });


module.exports = mongoose.model('TourPlan', TourPlanSchema);
