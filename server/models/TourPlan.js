const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  activityId: { type: String },
  type: {
    type: String,
    enum: ['visit', 'travel', 'meal', 'rest', 'check_in'],
    default: 'visit'
  },
  title: { type: String, required: true },
  destinationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination',
    default: null
  },
  destinationName: { type: String },
  district: { type: String },
  category: { type: String },
  image: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  durationMinutes: { type: Number, default: 60 },
  bestVisitTime: { type: String },
  openingHours: { type: String },
  distanceKm: { type: Number },
  isEstimatedTravel: { type: Boolean, default: true },
  description: { type: String },
  notes: { type: String }
}, { _id: true });

const DailyItinerarySchema = new mongoose.Schema({
  dayNumber: { type: Number, required: true },
  date: { type: Date },
  title: { type: String },
  districtFocus: { type: String },
  totalActivityHours: { type: Number, default: 0 },
  totalTravelMinutes: { type: Number, default: 0 },
  notes: { type: String },
  activities: [ActivitySchema]
}, { _id: true });

const TourPlanSchema = new mongoose.Schema({
  touristId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Personalized Sri Lanka Tour Plan' },
  days: { type: Number, required: true, min: 1, max: 30 },
  travelers: { type: Number, default: 2, min: 1, max: 50 },
  stops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Destination' }],
  dates: {
    start: { type: Date },
    end: { type: Date }
  },
  times: { type: String },
  transportType: {
    type: String,
    enum: ['Motorcycle', 'Car', 'Van', 'Bus', 'Train', 'Public'],
    default: 'Car'
  },
  preferences: {
    mealType: { type: String, default: 'All meat types' },
    environments: [{ type: String }],
    interests: [{ type: String }],
    weatherPreference: { type: String, default: 'Cool' },
    transportation: { type: String, default: 'Car' },
    guideRequirement: { type: String, default: 'Not required' },
    packageLevel: { type: String, enum: ['Basic', 'Standard', 'Premium'], default: 'Standard' },
    selectedMealOption: { type: String },
    selectedGuideOption: { type: String },
    addGuide: { type: Boolean, default: false }
  },
  dailyItinerary: [DailyItinerarySchema],
  costEstimate: {
    baseTotal: { type: Number, default: 0 },
    guideCost: { type: Number, default: 0 },
    mealExtraCost: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 }
  },
  routeData: { type: Object },
  status: {
    type: String,
    enum: ['Draft', 'Saved', 'Confirmed', 'Completed'],
    default: 'Saved'
  }
}, { timestamps: true });

module.exports = mongoose.model('TourPlan', TourPlanSchema);