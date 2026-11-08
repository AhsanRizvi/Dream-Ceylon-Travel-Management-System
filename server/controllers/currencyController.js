const TouristProfile = require('../models/TouristProfile');
const {
  SUPPORTED_CURRENCIES,
  getExchangeRates,
  convertFromLKR,
  getSupportedCurrenciesList
} = require('../services/currencyService');

// @desc    Get all supported currencies (LKR, USD, EUR, GBP, INR, AUD, CAD, QAR)
// @route   GET /api/currency/supported
// @access  Public
exports.getSupportedCurrencies = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      defaultCurrency: 'LKR',
      count: Object.keys(SUPPORTED_CURRENCIES).length,
      data: getSupportedCurrenciesList()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get current exchange rates relative to LKR base currency
// @route   GET /api/currency/rates
// @access  Public
exports.getRates = async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const rateData = await getExchangeRates({ forceRefresh });

    res.status(200).json({
      success: true,
      baseCurrency: rateData.baseCurrency,
      rateDate: rateData.rateDate,
      updatedAt: rateData.updatedAt,
      provider: rateData.provider,
      cacheStatus: rateData.cacheStatus,
      isFallback: rateData.isFallback,
      limitationNote: rateData.limitationNote,
      rates: rateData.rates,
      rateDetails: rateData.rateDetails,
      supportedCurrencies: getSupportedCurrenciesList()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Convert LKR amount(s) into target currency
// @route   GET /api/currency/convert
// @route   POST /api/currency/convert
// @access  Public
exports.convertCurrency = async (req, res) => {
  try {
    const amount = req.body?.amount ?? req.query?.amount;
    const amounts = req.body?.amounts;
    const targetCurrency = (
      req.body?.targetCurrency ||
      req.body?.to ||
      req.query?.targetCurrency ||
      req.query?.to ||
      'LKR'
    ).toUpperCase();
    const fromCurrency = (
      req.body?.fromCurrency ||
      req.body?.from ||
      req.query?.fromCurrency ||
      req.query?.from ||
      'LKR'
    ).toUpperCase();

    if (!SUPPORTED_CURRENCIES[targetCurrency]) {
      return res.status(400).json({
        success: false,
        error: `Unsupported target currency '${targetCurrency}'. Supported currencies: ${Object.keys(
          SUPPORTED_CURRENCIES
        ).join(', ')}`
      });
    }

    if (!SUPPORTED_CURRENCIES[fromCurrency]) {
      return res.status(400).json({
        success: false,
        error: `Unsupported source currency '${fromCurrency}'. Supported currencies: ${Object.keys(
          SUPPORTED_CURRENCIES
        ).join(', ')}`
      });
    }

    const rateData = await getExchangeRates();
    const fromRate = fromCurrency === 'LKR' ? 1 : rateData.rates[fromCurrency] || 1;

    // Support batch conversion if amounts object or array is passed
    if (amounts && typeof amounts === 'object') {
      if (Array.isArray(amounts)) {
        const convertedList = await Promise.all(
          amounts.map((val) => {
            const valInLKR = fromCurrency === 'LKR' ? Number(val || 0) : Number(val || 0) / fromRate;
            return convertFromLKR(valInLKR, targetCurrency, rateData);
          })
        );
        return res.status(200).json({
          success: true,
          baseCurrency: 'LKR',
          targetCurrency,
          rateDate: rateData.rateDate,
          data: convertedList
        });
      }

      const convertedMap = {};
      for (const [key, val] of Object.entries(amounts)) {
        const valInLKR = fromCurrency === 'LKR' ? Number(val || 0) : Number(val || 0) / fromRate;
        convertedMap[key] = await convertFromLKR(valInLKR, targetCurrency, rateData);
      }
      return res.status(200).json({
        success: true,
        baseCurrency: 'LKR',
        targetCurrency,
        rateDate: rateData.rateDate,
        data: convertedMap
      });
    }

    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid numeric amount to convert.'
      });
    }

    const numericAmount = Number(amount);
    if (numericAmount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount cannot be negative.'
      });
    }

    const amountInLKR = fromCurrency === 'LKR' ? numericAmount : numericAmount / fromRate;
    const conversion = await convertFromLKR(amountInLKR, targetCurrency, rateData);

    res.status(200).json({
      success: true,
      data: {
        ...conversion,
        requestedSourceCurrency: fromCurrency,
        requestedSourceAmount: numericAmount
      }
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Save authenticated tourist's preferred display currency
// @route   PUT /api/currency/preference
// @access  Private
exports.updatePreferredCurrency = async (req, res) => {
  try {
    const preferredCurrency = (req.body?.preferredCurrency || req.body?.currency || 'LKR').toUpperCase();
    if (!SUPPORTED_CURRENCIES[preferredCurrency]) {
      return res.status(400).json({
        success: false,
        error: `Unsupported currency '${preferredCurrency}'. Supported currencies: ${Object.keys(
          SUPPORTED_CURRENCIES
        ).join(', ')}`
      });
    }

    const profile = await TouristProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { preferredCurrency } },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: `Preferred currency updated to ${preferredCurrency}`,
      data: {
        preferredCurrency: profile.preferredCurrency,
        currencyInfo: SUPPORTED_CURRENCIES[preferredCurrency]
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

