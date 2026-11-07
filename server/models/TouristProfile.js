const mongoose = require('mongoose');

const TouristProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  groupSize: { type: Number, default: 1 },
  mealType: {
    type: String,
    enum: ['Vegetarian', 'Vegan', 'Seafood', 'All meat types', 'Non-Vegetarian', 'Halal', 'Any'],
    default: 'Any'
  },
  interests: [{ type: String }],
  weatherPreference: { type: String, enum: ['Hot', 'Cold', 'Cool', 'Cloudy', 'Mild', 'Moderate', 'Any'], default: 'Any' },
  preferredCurrency: {
    type: String,
    enum: ['LKR', 'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'QAR'],
    default: 'LKR'
  },
  selectedPackageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
  selectedPackageName: { type: String, enum: ['Basic', 'Standard', 'Premium'] }
}, { timestamps: true });

module.exports = mongoose.model('TouristProfile', TouristProfileSchema);
