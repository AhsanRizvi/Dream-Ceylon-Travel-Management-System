const axios = require('axios');
const CurrencyRate = require('../models/CurrencyRate');

// Supported currencies as required by Module 8
const SUPPORTED_CURRENCIES = {
  LKR: {
    code: 'LKR',
    name: 'Sri Lankan Rupee',
    symbol: 'Rs.',
    decimals: 2,
    isBase: true,
    frankfurterSupported: false,
    supportNote: 'Default system base currency (LKR).'
  },
  USD: {
    code: 'USD',
    name: 'United States Dollar',
    symbol: '$',
    decimals: 2,
    isBase: false,
    frankfurterSupported: true,
    supportNote: 'Live ECB rate via Frankfurter API anchored to LKR base.'
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimals: 2,
    isBase: false,
    frankfurterSupported: true,
    supportNote: 'Live ECB rate via Frankfurter API.'
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimals: 2,
    isBase: false,
    frankfurterSupported: true,
    supportNote: 'Live ECB rate via Frankfurter API.'
  },
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    decimals: 2,
    isBase: false,
    frankfurterSupported: true,
    supportNote: 'Live ECB rate via Frankfurter API.'
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    decimals: 2,
    isBase: false,
    frankfurterSupported: true,
    supportNote: 'Live ECB rate via Frankfurter API.'
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    decimals: 2,
    isBase: false,
    frankfurterSupported: true,
    supportNote: 'Live ECB rate via Frankfurter API.'
  },
  QAR: {
    code: 'QAR',
    name: 'Qatari Riyal',
    symbol: 'QR',
    decimals: 2,
    isBase: false,
    frankfurterSupported: false,
    supportNote: 'Not listed on Frankfurter ECB feed; derived via official Qatar Central Bank fixed USD peg (1 USD = 3.64 QAR).'
  }
};

// Reference anchor & offline fallback rates (1 LKR -> Quote Currency)
// Based on 1 USD = 300 LKR reference rate and official QAR peg (1 USD = 3.64 QAR)
const DEFAULT_LKR_PER_USD = Number(process.env.LKR_PER_USD_REFERENCE) || 300;
const QAR_PER_USD_PEG = 3.64;

const OFFLINE_FALLBACK_RATES_FROM_LKR = {
  LKR: 1,
  USD: Number((1 / DEFAULT_LKR_PER_USD).toFixed(8)),
  EUR: Number((0.92 / DEFAULT_LKR_PER_USD).toFixed(8)),
  GBP: Number((0.79 / DEFAULT_LKR_PER_USD).toFixed(8)),
  INR: Number((84.0 / DEFAULT_LKR_PER_USD).toFixed(8)),
  AUD: Number((1.52 / DEFAULT_LKR_PER_USD).toFixed(8)),
  CAD: Number((1.39 / DEFAULT_LKR_PER_USD).toFixed(8)),
  QAR: Number((QAR_PER_USD_PEG / DEFAULT_LKR_PER_USD).toFixed(8))
};

// In-memory cache to avoid redundant external API calls
let memoryCache = {
  rates: null,
  rateDetails: null,
  rateDate: null,
  fetchedAt: null,
  provider: null,
  isFallback: false,
  limitationNote: ''
};

const getCacheTtlMs = () => {
  const minutes = Number(process.env.CURRENCY_CACHE_TTL_MINUTES) || 60;
  return minutes * 60 * 1000;
};

/**
 * Normalize any stored financial amount into authoritative LKR.
 * If a legacy document was seeded with small USD numbers (< 1000) without explicit LKR scale,
 * this helper converts it cleanly so all backend calculations operate in LKR.
 */
const normalizeToLKR = (amount, explicitCurrency = 'LKR', thresholdForLegacyUsd = 1000) => {
  const numeric = Number(amount) || 0;
  if (numeric <= 0) return 0;
  if (explicitCurrency && explicitCurrency.toUpperCase() === 'USD') {
    return Math.round(numeric * DEFAULT_LKR_PER_USD);
  }
  // If a legacy seed stored e.g. 85, 180, 350 (USD) instead of 25500, 54000, 105000 (LKR)
  if (numeric > 0 && numeric < thresholdForLegacyUsd) {
    return Math.round(numeric * DEFAULT_LKR_PER_USD);
  }
  return Math.round(numeric);
};

/**
 * Fetch exchange rates from Frankfurter API with LKR as base currency.
 * Handles ECB unsupported currencies (LKR, QAR) cleanly via cross-rates and caches in MongoDB.
 */
const getExchangeRates = async ({ forceRefresh = false } = {}) => {
  const now = Date.now();
  const ttlMs = getCacheTtlMs();

  // 1. Check in-memory cache
  if (
    !forceRefresh &&
    memoryCache.rates &&
    memoryCache.fetchedAt &&
    now - memoryCache.fetchedAt < ttlMs
  ) {
    return {
      baseCurrency: 'LKR',
      rates: memoryCache.rates,
      rateDetails: memoryCache.rateDetails,
      rateDate: memoryCache.rateDate,
      updatedAt: new Date(memoryCache.fetchedAt).toISOString(),
      provider: memoryCache.provider,
      cacheStatus: 'memory-hit',
      isFallback: memoryCache.isFallback,
      limitationNote: memoryCache.limitationNote
    };
  }

  // 2. Check MongoDB CurrencyRate cache if not forcing refresh
  if (!forceRefresh) {
    try {
      const dbDocs = await CurrencyRate.find({ baseCurrency: 'LKR' }).lean();
      if (dbDocs && dbDocs.length >= Object.keys(SUPPORTED_CURRENCIES).length) {
        const newestUpdate = Math.max(...dbDocs.map((d) => new Date(d.updatedAt).getTime()));
        if (now - newestUpdate < ttlMs) {
          const rates = { LKR: 1 };
          const rateDetails = {};
          let rateDate = new Date(newestUpdate).toISOString().split('T')[0];
          let isFallback = false;

          for (const doc of dbDocs) {
            rates[doc.quoteCurrency] = doc.rate;
            rateDetails[doc.quoteCurrency] = {
              code: doc.quoteCurrency,
              rate: doc.rate,
              rateDate: doc.rateDate,
              source: doc.source,
              isFallback: doc.isFallback,
              limitationNote: doc.limitationNote || SUPPORTED_CURRENCIES[doc.quoteCurrency]?.supportNote || ''
            };
            if (doc.rateDate) rateDate = doc.rateDate;
            if (doc.isFallback) isFallback = true;
          }

          memoryCache = {
            rates,
            rateDetails,
            rateDate,
            fetchedAt: newestUpdate,
            provider: 'Frankfurter API (MongoDB Cached)',
            isFallback,
            limitationNote:
              'LKR and QAR are not published directly in the European Central Bank (ECB) basket on Frankfurter; live Frankfurter ECB rates (USD, EUR, GBP, INR, AUD, CAD) are cross-calculated relative to LKR base, and QAR uses the official Qatar Central Bank USD peg (1 USD = 3.64 QAR).'
          };

          return {
            baseCurrency: 'LKR',
            rates,
            rateDetails,
            rateDate,
            updatedAt: new Date(newestUpdate).toISOString(),
            provider: memoryCache.provider,
            cacheStatus: 'mongodb-hit',
            isFallback,
            limitationNote: memoryCache.limitationNote
          };
        }
      }
    } catch (dbErr) {
      // Proceed to external API fetch
    }
  }

  // 3. Query Frankfurter API
  const frankfurterBaseUrl =
    process.env.FRANKFURTER_API_URL || 'https://api.frankfurter.dev/v1';
  const fallbackFrankfurterUrl = 'https://api.frankfurter.app';

  let liveUsdRates = null;
  let directLkrRates = null;
  let frankfurterDate = null;
  let apiProviderUsed = null;

  // 3a. Try direct base=LKR first (in case Frankfurter adds LKR support in future)
  try {
    const directRes = await axios.get(`${frankfurterBaseUrl}/latest`, {
      params: {
        base: 'LKR',
        symbols: 'USD,EUR,GBP,INR,AUD,CAD,QAR'
      },
      timeout: 4500
    });
    if (directRes.data && directRes.data.rates) {
      directLkrRates = directRes.data.rates;
      frankfurterDate = directRes.data.date;
      apiProviderUsed = `${frankfurterBaseUrl}/latest?base=LKR`;
    }
  } catch (directErr) {
    // Expected for Frankfurter ECB dataset since LKR is not in the ECB 31-currency table.
  }

  // 3b. Fetch live ECB rates from Frankfurter using USD as bridge to cross-compute LKR base rates
  if (!directLkrRates) {
    const urlsToTry = [
      `${frankfurterBaseUrl}/latest`,
      `${fallbackFrankfurterUrl}/latest`
    ];

    for (const url of urlsToTry) {
      try {
        const res = await axios.get(url, {
          params: {
            from: 'USD',
            to: 'EUR,GBP,INR,AUD,CAD'
          },
          timeout: 5000
        });
        if (res.data && res.data.rates) {
          liveUsdRates = res.data.rates;
          frankfurterDate = res.data.date;
          apiProviderUsed = url;
          break;
        }
      } catch (err) {
        // Try next URL
      }
    }
  }

  // 4. Construct complete LKR-based rate table from live Frankfurter response
  if (directLkrRates || liveUsdRates) {
    const lkrPerUsd = directLkrRates?.USD
      ? 1 / directLkrRates.USD
      : DEFAULT_LKR_PER_USD;

    const rates = {
      LKR: 1,
      USD: directLkrRates?.USD || Number((1 / lkrPerUsd).toFixed(8)),
      EUR:
        directLkrRates?.EUR ||
        Number(((liveUsdRates?.EUR || 0.92) / lkrPerUsd).toFixed(8)),
      GBP:
        directLkrRates?.GBP ||
        Number(((liveUsdRates?.GBP || 0.79) / lkrPerUsd).toFixed(8)),
      INR:
        directLkrRates?.INR ||
        Number(((liveUsdRates?.INR || 84.0) / lkrPerUsd).toFixed(8)),
      AUD:
        directLkrRates?.AUD ||
        Number(((liveUsdRates?.AUD || 1.52) / lkrPerUsd).toFixed(8)),
      CAD:
        directLkrRates?.CAD ||
        Number(((liveUsdRates?.CAD || 1.39) / lkrPerUsd).toFixed(8)),
      QAR:
        directLkrRates?.QAR ||
        Number((QAR_PER_USD_PEG / lkrPerUsd).toFixed(8))
    };

    const rateDetails = {};
    const limitationNote =
      'Frankfurter (ECB reference feed) directly provides live rates for USD, EUR, GBP, INR, AUD, and CAD. Because LKR and QAR are not published by the ECB, LKR is anchored at the CBSL reference rate and QAR uses the official Qatar Central Bank USD peg (1 USD = 3.64 QAR).';

    for (const code of Object.keys(SUPPORTED_CURRENCIES)) {
      const meta = SUPPORTED_CURRENCIES[code];
      const isDirectEcb = meta.frankfurterSupported;
      rateDetails[code] = {
        code,
        name: meta.name,
        symbol: meta.symbol,
        rate: rates[code],
        inverseRateToLKR: rates[code] > 0 ? Number((1 / rates[code]).toFixed(4)) : 1,
        rateDate: frankfurterDate,
        source:
          code === 'LKR'
            ? 'base-currency-lkr'
            : isDirectEcb
            ? 'frankfurter-ecb-live'
            : 'qcb-usd-peg-fallback',
        isFallback: !isDirectEcb && code !== 'LKR',
        limitationNote: meta.supportNote
      };
    }

    // Persist to MongoDB CurrencyRate cache
    try {
      const bulkOps = Object.keys(rates).map((quoteCurrency) => ({
        updateOne: {
          filter: { baseCurrency: 'LKR', quoteCurrency },
          update: {
            $set: {
              baseCurrency: 'LKR',
              quoteCurrency,
              rate: rates[quoteCurrency],
              rateDate: frankfurterDate,
              source: rateDetails[quoteCurrency].source,
              isFallback: rateDetails[quoteCurrency].isFallback,
              limitationNote: rateDetails[quoteCurrency].limitationNote,
              updatedAt: new Date()
            }
          },
          upsert: true
        }
      }));
      await CurrencyRate.bulkWrite(bulkOps);
    } catch (persistErr) {
      // Non-fatal if DB write fails
    }

    memoryCache = {
      rates,
      rateDetails,
      rateDate: frankfurterDate,
      fetchedAt: now,
      provider: `Frankfurter API (${apiProviderUsed})`,
      isFallback: false,
      limitationNote
    };

    return {
      baseCurrency: 'LKR',
      rates,
      rateDetails,
      rateDate: frankfurterDate,
      updatedAt: new Date(now).toISOString(),
      provider: memoryCache.provider,
      cacheStatus: 'live-refresh',
      isFallback: false,
      limitationNote
    };
  }

  // 5. Graceful fallback if Frankfurter API is unreachable (check stale MongoDB cache first, then offline constants)
  try {
    const staleDocs = await CurrencyRate.find({ baseCurrency: 'LKR' }).lean();
    if (staleDocs && staleDocs.length > 0) {
      const rates = { ...OFFLINE_FALLBACK_RATES_FROM_LKR };
      const rateDetails = {};
      let rateDate = null;

      for (const doc of staleDocs) {
        rates[doc.quoteCurrency] = doc.rate;
        if (doc.rateDate) rateDate = doc.rateDate;
        rateDetails[doc.quoteCurrency] = {
          code: doc.quoteCurrency,
          name: SUPPORTED_CURRENCIES[doc.quoteCurrency]?.name || doc.quoteCurrency,
          symbol: SUPPORTED_CURRENCIES[doc.quoteCurrency]?.symbol || doc.quoteCurrency,
          rate: doc.rate,
          inverseRateToLKR: doc.rate > 0 ? Number((1 / doc.rate).toFixed(4)) : 1,
          rateDate: doc.rateDate,
          source: 'mongodb-stale-cache-fallback',
          isFallback: true,
          limitationNote: 'External exchange rate API temporarily unreachable; using last cached database rate.'
        };
      }

      return {
        baseCurrency: 'LKR',
        rates,
        rateDetails,
        rateDate: rateDate || 'Cached',
        updatedAt: new Date().toISOString(),
        provider: 'MongoDB Cached Fallback (External API Unreachable)',
        cacheStatus: 'stale-db-fallback',
        isFallback: true,
        limitationNote:
          'Live Frankfurter API could not be reached. Displaying most recent cached rates from MongoDB.'
      };
    }
  } catch (e) {
    // Ignore DB fallback error
  }

  // Final offline reference fallback (never pretend offline rates are live)
  const offlineDetails = {};
  for (const code of Object.keys(SUPPORTED_CURRENCIES)) {
    const meta = SUPPORTED_CURRENCIES[code];
    const r = OFFLINE_FALLBACK_RATES_FROM_LKR[code];
    offlineDetails[code] = {
      code,
      name: meta.name,
      symbol: meta.symbol,
      rate: r,
      inverseRateToLKR: r > 0 ? Number((1 / r).toFixed(4)) : 1,
      rateDate: 'Reference Fallback (Offline)',
      source: 'offline-reference-fallback',
      isFallback: true,
      limitationNote: 'Offline reference rate used because live Frankfurter API is unreachable.'
    };
  }

  return {
    baseCurrency: 'LKR',
    rates: { ...OFFLINE_FALLBACK_RATES_FROM_LKR },
    rateDetails: offlineDetails,
    rateDate: 'Reference Fallback (Offline)',
    updatedAt: new Date().toISOString(),
    provider: 'Offline Reference Fallback (Frankfurter Unreachable)',
    cacheStatus: 'offline-fallback',
    isFallback: true,
    limitationNote:
      'Live Frankfurter API is currently unreachable. Displaying clearly labeled offline reference rates (not live exchange rates).'
  };
};

/**
 * Convert an amount from LKR (or specified source currency) to target currency.
 * Preserves full floating-point precision during intermediate calculations and rounds only for display.
 */
const convertFromLKR = async (amountLKR, targetCurrency = 'LKR', existingRateData = null) => {
  const numericAmount = Number(amountLKR) || 0;
  const normalizedTarget = (targetCurrency || 'LKR').toUpperCase().trim();

  if (!SUPPORTED_CURRENCIES[normalizedTarget]) {
    const error = new Error(
      `Unsupported currency '${targetCurrency}'. Supported currencies are: ${Object.keys(
        SUPPORTED_CURRENCIES
      ).join(', ')}`
    );
    error.statusCode = 400;
    throw error;
  }

  const rateData = existingRateData || (await getExchangeRates());
  const rate = normalizedTarget === 'LKR' ? 1 : rateData.rates[normalizedTarget];
  const meta = SUPPORTED_CURRENCIES[normalizedTarget];

  // Exact formula: Converted Amount = LKR Amount * Exchange Rate (no intermediate rounding)
  const rawConverted = numericAmount * rate;
  const roundedConverted = Number(rawConverted.toFixed(meta.decimals));

  return {
    originalAmountLKR: Number(numericAmount.toFixed(2)),
    baseCurrency: 'LKR',
    targetCurrency: normalizedTarget,
    currencySymbol: meta.symbol,
    currencyName: meta.name,
    exchangeRate: rate,
    inverseRateToLKR: rate > 0 ? Number((1 / rate).toFixed(4)) : 1,
    rawConvertedAmount: rawConverted,
    convertedAmount: roundedConverted,
    formattedConverted: `${meta.symbol} ${roundedConverted.toLocaleString('en-US', {
      minimumFractionDigits: normalizedTarget === 'LKR' ? 0 : meta.decimals,
      maximumFractionDigits: meta.decimals
    })}`,
    formattedLKR: `Rs. ${numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`,
    rateDate: rateData.rateDate,
    rateSource: rateData.rateDetails?.[normalizedTarget]?.source || rateData.provider,
    isFallback: Boolean(rateData.rateDetails?.[normalizedTarget]?.isFallback || rateData.isFallback),
    limitationNote: rateData.rateDetails?.[normalizedTarget]?.limitationNote || ''
  };
};

const getSupportedCurrenciesList = () => {
  return Object.values(SUPPORTED_CURRENCIES);
};

module.exports = {
  SUPPORTED_CURRENCIES,
  DEFAULT_LKR_PER_USD,
  OFFLINE_FALLBACK_RATES_FROM_LKR,
  normalizeToLKR,
  getExchangeRates,
  convertFromLKR,
  getSupportedCurrenciesList
};

