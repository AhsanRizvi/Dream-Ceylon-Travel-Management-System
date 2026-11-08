import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';
import { AuthContext } from './AuthContext';

export const CurrencyContext = createContext();

export const SUPPORTED_CURRENCIES_META = {
  LKR: { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs.', decimals: 2, flag: '🇱🇰' },
  USD: { code: 'USD', name: 'United States Dollar', symbol: '$', decimals: 2, flag: '🇺🇸' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, flag: '🇪🇺' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, flag: '🇬🇧' },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2, flag: '🇮🇳' },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, flag: '🇦🇺' },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2, flag: '🇨🇦' },
  QAR: { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR', decimals: 2, flag: '🇶🇦' }
};

const DEFAULT_FALLBACK_RATES_FROM_LKR = {
  LKR: 1,
  USD: Number((1 / 300).toFixed(8)),
  EUR: Number((0.92 / 300).toFixed(8)),
  GBP: Number((0.79 / 300).toFixed(8)),
  INR: Number((84.0 / 300).toFixed(8)),
  AUD: Number((1.52 / 300).toFixed(8)),
  CAD: Number((1.39 / 300).toFixed(8)),
  QAR: Number((3.64 / 300).toFixed(8))
};

export const CurrencyProvider = ({ children }) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;

  // Default currency MUST be LKR (Sri Lankan Rupee) per Module 8 specification
  const [currency, setCurrencyState] = useState(() => {
    try {
      const saved = localStorage.getItem('preferredCurrency');
      if (saved && SUPPORTED_CURRENCIES_META[saved.toUpperCase()]) {
        return saved.toUpperCase();
      }
      return 'LKR';
    } catch (e) {
      return 'LKR';
    }
  });

  const [rates, setRates] = useState(DEFAULT_FALLBACK_RATES_FROM_LKR);
  const [rateDetails, setRateDetails] = useState({});
  const [rateDate, setRateDate] = useState(null);
  const [provider, setProvider] = useState('Frankfurter Exchange Rate Service');
  const [isFallback, setIsFallback] = useState(false);
  const [limitationNote, setLimitationNote] = useState('');
  const [loadingRates, setLoadingRates] = useState(false);

  const fetchExchangeRates = useCallback(async (forceRefresh = false) => {
    setLoadingRates(true);
    try {
      const res = await api.get('/currency/rates', {
        params: forceRefresh ? { refresh: 'true' } : {}
      });
      if (res.data?.success && res.data?.rates) {
        setRates({ ...DEFAULT_FALLBACK_RATES_FROM_LKR, ...res.data.rates });
        setRateDetails(res.data.rateDetails || {});
        setRateDate(res.data.rateDate || null);
        setProvider(res.data.provider || 'Frankfurter API');
        setIsFallback(Boolean(res.data.isFallback));
        setLimitationNote(res.data.limitationNote || '');
      }
    } catch (err) {
      console.error('Failed to load live exchange rates, using cached/fallback rates:', err);
      setIsFallback(true);
    } finally {
      setLoadingRates(false);
    }
  }, []);

  useEffect(() => {
    fetchExchangeRates(false);
  }, [fetchExchangeRates]);

  const changeCurrency = async (newCurrencyCode) => {
    const normalized = (newCurrencyCode || 'LKR').toUpperCase();
    if (!SUPPORTED_CURRENCIES_META[normalized]) return;

    setCurrencyState(normalized);
    try {
      localStorage.setItem('preferredCurrency', normalized);
    } catch (e) {
      // Ignore storage error
    }

    if (user) {
      try {
        await api.put('/currency/preference', { preferredCurrency: normalized });
      } catch (e) {
        // Non-blocking preference save
      }
    }
  };

  /**
   * Normalize any input value to authoritative LKR before converting.
   * Ensures legacy USD values (< 1000) are normalized if encountered.
   */
  const normalizeAmountToLKR = useCallback((amount, isLegacyCheck = true) => {
    const num = Number(amount) || 0;
    if (num <= 0) return 0;
    if (isLegacyCheck && num > 0 && num < 1000) {
      return Math.round(num * 300);
    }
    return num;
  }, []);

  /**
   * Convert an LKR amount to the active display currency using:
   * Converted Amount = LKR Amount * Exchange Rate
   */
  const convertFromLKR = useCallback(
    (amountLKR, targetCurr = currency, normalizeLegacy = true) => {
      const lkrVal = normalizeAmountToLKR(amountLKR, normalizeLegacy);
      const code = SUPPORTED_CURRENCIES_META[targetCurr] ? targetCurr : 'LKR';
      const rate = code === 'LKR' ? 1 : rates[code] || DEFAULT_FALLBACK_RATES_FROM_LKR[code] || 1;
      const raw = lkrVal * rate;
      const decimals = SUPPORTED_CURRENCIES_META[code]?.decimals ?? 2;
      return Number(raw.toFixed(decimals));
    },
    [currency, rates, normalizeAmountToLKR]
  );

  /**
   * Format an LKR price into the active currency string (e.g., "Rs. 54,000" or "$180.00")
   */
  const formatPrice = useCallback(
    (amountLKR, options = {}) => {
      const {
        targetCurr = currency,
        normalizeLegacy = true,
        showDecimalsForLKR = false
      } = options;

      const lkrVal = normalizeAmountToLKR(amountLKR, normalizeLegacy);
      const code = SUPPORTED_CURRENCIES_META[targetCurr] ? targetCurr : 'LKR';
      const meta = SUPPORTED_CURRENCIES_META[code];
      const converted = convertFromLKR(lkrVal, code, false);

      const minDecimals = code === 'LKR' ? (showDecimalsForLKR ? 2 : 0) : 2;
      const maxDecimals = code === 'LKR' && !showDecimalsForLKR ? 0 : 2;

      return `${meta.symbol}${code === 'LKR' || code === 'QAR' ? ' ' : ''}${converted.toLocaleString(
        'en-US',
        {
          minimumFractionDigits: minDecimals,
          maximumFractionDigits: maxDecimals
        }
      )}`;
    },
    [currency, convertFromLKR, normalizeAmountToLKR]
  );

  /**
   * Return both formatted active currency and formatted authoritative LKR base amount
   */
  const formatDualPrice = useCallback(
    (amountLKR, normalizeLegacy = true) => {
      const lkrVal = normalizeAmountToLKR(amountLKR, normalizeLegacy);
      const primary = formatPrice(lkrVal, { targetCurr: currency, normalizeLegacy: false });
      const lkrFormatted = `Rs. ${Math.round(lkrVal).toLocaleString('en-US')}`;
      return {
        primary,
        lkrFormatted,
        isLKR: currency === 'LKR',
        lkrAmount: lkrVal,
        convertedAmount: convertFromLKR(lkrVal, currency, false),
        currencyCode: currency,
        currencySymbol: SUPPORTED_CURRENCIES_META[currency]?.symbol || 'Rs.'
      };
    },
    [currency, formatPrice, convertFromLKR, normalizeAmountToLKR]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyMeta: SUPPORTED_CURRENCIES_META[currency] || SUPPORTED_CURRENCIES_META.LKR,
        supportedCurrencies: Object.values(SUPPORTED_CURRENCIES_META),
        rates,
        rateDetails,
        rateDate,
        provider,
        isFallback,
        limitationNote,
        loadingRates,
        changeCurrency,
        refreshRates: () => fetchExchangeRates(true),
        normalizeAmountToLKR,
        convertFromLKR,
        formatPrice,
        formatDualPrice
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);

