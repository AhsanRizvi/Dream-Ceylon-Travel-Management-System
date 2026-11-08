const mongoose = require('mongoose');

const GuideSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: [true, 'Guide full name is required'], trim: true },
  email: { type: String, trim: true },
  contactNumber: { type: String, trim: true, default: '' },
  profilePhoto: { type: String, default: '' },
  bio: { type: String, trim: true, default: '' },
  serviceAreas: [{ type: String, trim: true }],
  languages: [{ type: String, trim: true }],
  expertise: [{ type: String, trim: true }],
  experienceYears: { type: Number, min: 0, default: 1 },
  qualifications: [{ type: String, trim: true }],
  currency: { type: String, default: 'LKR' },
  dailyRate: { type: Number, required: [true, 'Daily service rate is required'], min: 0 },
  availability: { type: Boolean, default: true },
  availabilityNotes: { type: String, default: 'Available for island-wide tours' },
  unavailableDates: [{
    startDate: { type: Date },
    endDate: { type: Date },
    reason: { type: String }
  }],
  serviceStatus: {
    type: String,
    enum: ['active', 'paused', 'Active', 'Paused', 'Inactive'],
    default: 'active'
  },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, default: 0 }
}, { timestamps: true });

GuideSchema.index({ userId: 1 });
GuideSchema.index({ serviceAreas: 1, availability: 1 });
GuideSchema.index({ languages: 1 });

module.exports = mongoose.model('Guide', GuideSchema);
