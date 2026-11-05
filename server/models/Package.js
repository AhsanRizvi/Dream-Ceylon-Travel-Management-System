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
  image: { type: String },
  imageUrl: { type: String },
  baseCharge: { type: Number, required: true },
  includedFacilities: [{ type: String }],
  excludedFacilities: [{ type: String }],
  features: {
    transport: { type: String, default: 'Standard Transport' },
    accommodation: { type: String, default: 'Not Included' },
    meals: { type: String, default: 'Not Included' },
    tourGuide: { type: String, default: 'Not Included' },
  },
  allowGuideAddon: { type: Boolean, default: false },
  guideAddonPrice: { type: Number, default: 0 },
  allowMealSelection: { type: Boolean, default: false },
  allowGuideSelection: { type: Boolean, default: false },
  mealOptions: [{
    name: { type: String },
    description: { type: String },
    extraCostPerDay: { type: Number, default: 0 }
  }],
  guideOptions: [{
    name: { type: String },
    specialty: { type: String },
    languages: [{ type: String }],
    dailyRate: { type: Number, default: 0 }
  }],
  pricingRules: { type: Object }
}, { timestamps: true });

module.exports = mongoose.model('Package', PackageSchema);