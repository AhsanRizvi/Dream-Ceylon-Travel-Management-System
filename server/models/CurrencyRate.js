const mongoose = require('mongoose');

const CurrencyRateSchema = new mongoose.Schema({
  baseCurrency: { type: String, default: 'LKR', uppercase: true, trim: true },
  quoteCurrency: { type: String, required: true, uppercase: true, trim: true },
  rate: { type: Number, required: true },
  rateDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  source: { type: String, default: 'frankfurter-api' },
  isFallback: { type: Boolean, default: false },
  limitationNote: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

CurrencyRateSchema.index({ baseCurrency: 1, quoteCurrency: 1 }, { unique: true });

module.exports = mongoose.model('CurrencyRate', CurrencyRateSchema);
