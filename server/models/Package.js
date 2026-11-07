const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
  packageName: { 
    type: String, 
    enum: ['Basic', 'Standard', 'Premium'], 
    required: true,
    unique: true 
  },
  badge: { type: String },
  tagline: { type: String },
  description: { type: String },
  currency: { type: String, default: 'LKR' },
  baseCharge: { type: Number, required: true }, // Stored in LKR (authoritative base currency)
  baseChargeLKR: { type: Number }, // Explicit LKR mirror field
  startingPriceLKR: { type: Number },
  includedFacilities: [{ type: String }],
  excludedFacilities: [{ type: String }],
  optionalServices: [{ type: String }],
  features: {
    transport: { type: String, default: 'Standard Transport' },
    accommodation: { type: String, default: 'Not Included' },
    meals: { type: String, default: 'Not Included' },
    tourGuide: { type: String, default: 'Not Included' },
    nonFoodFacilities: [{ type: String }]
  },
  inclusions: {
    destinationsAndItinerary: { type: Boolean, default: true },
    routeAndTransport: { type: Boolean, default: true },
    accommodationIncluded: { type: Boolean, default: false },
    mealsIncluded: { type: Boolean, default: false },
    guideIncluded: { type: Boolean, default: false }
  },
  allowHotelSelection: { type: Boolean, default: false },
  allowGuideAddon: { type: Boolean, default: false },
  guideAddonPrice: { type: Number, default: 0 }, // Stored in LKR
  allowMealSelection: { type: Boolean, default: false },
  allowGuideSelection: { type: Boolean, default: false },
  mealOptions: [{
    name: { type: String },
    mealType: { type: String },
    description: { type: String },
    extraCostPerDay: { type: Number, default: 0 } // Stored in LKR
  }],
  guideOptions: [{
    name: { type: String },
    specialty: { type: String },
    languages: [{ type: String }],
    dailyRate: { type: Number, default: 0 } // Stored in LKR
  }],
  pricingRules: { type: Object }
}, { timestamps: true });

module.exports = mongoose.model('Package', PackageSchema);
