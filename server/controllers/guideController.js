const Guide = require('../models/Guide');
const { normalizeToLKR, getExchangeRates, SUPPORTED_CURRENCIES } = require('../services/currencyService');

exports.getGuides = async (req, res) => {
  try {
    const targetCurrency = (req.query.currency || 'LKR').toUpperCase();
    const validCurrency = SUPPORTED_CURRENCIES[targetCurrency] ? targetCurrency : 'LKR';
    const [guides, rateData] = await Promise.all([
      Guide.find().populate('userId', 'name email'),
      getExchangeRates()
    ]);

    const rate = validCurrency === 'LKR' ? 1 : rateData.rates[validCurrency] || 1;
    const decimals = SUPPORTED_CURRENCIES[validCurrency]?.decimals ?? 2;

    const enriched = guides.map((g) => {
      const obj = g.toObject ? g.toObject() : { ...g };
      const dailyRateLKR = normalizeToLKR(obj.dailyRate, obj.currency || 'LKR', 1000);
      return {
        ...obj,
        currency: 'LKR',
        dailyRateLKR,
        dailyRate: dailyRateLKR,
        dailyRateConverted: Number((dailyRateLKR * rate).toFixed(decimals)),
        displayCurrency: validCurrency,
        displayCurrencySymbol: SUPPORTED_CURRENCIES[validCurrency]?.symbol || 'Rs.'
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      baseCurrency: 'LKR',
      displayCurrency: validCurrency,
      data: enriched
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.createGuide = async (req, res) => {
  try {
    req.body.userId = req.user.id;
    if (req.body.dailyRate) {
      req.body.dailyRate = normalizeToLKR(req.body.dailyRate, req.body.currency || 'LKR', 1000);
      req.body.currency = 'LKR';
    }
    const guide = await Guide.create(req.body);
    res.status(201).json({ success: true, data: guide });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateGuide = async (req, res) => {
  try {
    const guide = await Guide.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: guide });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteGuide = async (req, res) => {
  try {
    await Guide.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
