const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  name: { type: String, required: true },
  year: { type: Number, required: true },
  type: { type: String, default: 'Public Holiday' },
  description: { type: String },
  isPoya: { type: Boolean, default: false },
  isMercantile: { type: Boolean, default: false }
}, { timestamps: true });

HolidaySchema.index({ year: 1, date: 1 });

module.exports = mongoose.model('Holiday', HolidaySchema);