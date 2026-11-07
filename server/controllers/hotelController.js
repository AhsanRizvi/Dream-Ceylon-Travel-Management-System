const Hotel = require('../models/Hotel');
const { normalizeToLKR, getExchangeRates, SUPPORTED_CURRENCIES } = require('../services/currencyService');

exports.getHotels = async (req, res) => {
  try {
    const targetCurrency = (req.query.currency || 'LKR').toUpperCase();
    const validCurrency = SUPPORTED_CURRENCIES[targetCurrency] ? targetCurrency : 'LKR';
    const [hotels, rateData] = await Promise.all([
      Hotel.find().populate('ownerId', 'name'),
      getExchangeRates()
    ]);

    const rate = validCurrency === 'LKR' ? 1 : rateData.rates[validCurrency] || 1;
    const decimals = SUPPORTED_CURRENCIES[validCurrency]?.decimals ?? 2;

    const enriched = hotels.map((h) => {
      const obj = h.toObject ? h.toObject() : { ...h };
      const pricePerNightLKR = normalizeToLKR(obj.pricePerNight, obj.currency || 'LKR', 1000);
      return {
        ...obj,
        currency: 'LKR',
        pricePerNightLKR,
        pricePerNight: pricePerNightLKR,
        pricePerNightConverted: Number((pricePerNightLKR * rate).toFixed(decimals)),
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

exports.createHotel = async (req, res) => {
  try {
    req.body.ownerId = req.user.id;
    if (req.body.pricePerNight) {
      req.body.pricePerNight = normalizeToLKR(req.body.pricePerNight, req.body.currency || 'LKR', 1000);
      req.body.currency = 'LKR';
    }
    const hotel = await Hotel.create(req.body);
    res.status(201).json({ success: true, data: hotel });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: hotel });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteHotel = async (req, res) => {
  try {
    await Hotel.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
