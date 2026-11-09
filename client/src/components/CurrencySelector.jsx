import React, { useState, useRef, useEffect } from 'react';
import { Globe, RefreshCw, ChevronDown, Check, Info } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

const CurrencySelector = () => {
  const {
    currency,
    currencyMeta,
    supportedCurrencies,
    rates,
    rateDetails,
    rateDate,
    isFallback,
    loadingRates,
    changeCurrency,
    refreshRates
  } = useCurrency();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeRate = rates[currency] || 1;
  const activeDetail = rateDetails[currency] || {};

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 bg-blue-800/80 hover:bg-blue-800 text-white border border-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs"
        title="Select Display Currency (Default: LKR)"
      >
        <Globe size={14} className="text-yellow-400" />
        <span>{currency}</span>
        <span className="text-blue-200 font-normal hidden sm:inline">({currencyMeta.symbol})</span>
        <ChevronDown size={13} className="text-blue-200" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-950 to-indigo-900 text-white p-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-400 block">
                  Multi-Currency Engine
                </span>
                <h4 className="font-bold text-sm">Select Display Currency</h4>
              </div>
              <button
                type="button"
                onClick={() => refreshRates()}
                disabled={loadingRates}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Refresh Frankfurter Exchange Rates"
              >
                <RefreshCw size={14} className={loadingRates ? 'animate-spin' : ''} />
              </button>
            </div>
            <p className="text-[11px] text-blue-200 mt-1">
              Base Currency: <strong>LKR (Sri Lankan Rupee)</strong>
            </p>
          </div>

          {/* Currency List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {supportedCurrencies.map((item) => {
              const isSelected = item.code === currency;
              const itemRate = rates[item.code] || 1;
              const inverseLkr = itemRate > 0 ? (1 / itemRate).toFixed(2) : '1.00';

              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    changeCurrency(item.code);
                    setOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition ${
                    isSelected ? 'bg-blue-50/90 font-bold text-blue-950' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-gray-100 text-gray-800 font-extrabold text-xs flex items-center justify-center border border-gray-200">
                      {item.symbol}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <span>{item.code}</span>
                        <span className="text-gray-400 font-normal">– {item.name}</span>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {item.code === 'LKR'
                          ? 'Authoritative Base Currency (1.00)'
                          : `1 LKR = ${itemRate.toFixed(5)} ${item.code} (1 ${item.code} ≈ Rs. ${inverseLkr})`}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check size={15} className="text-blue-600 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Footer Rate Status */}
          <div className="bg-gray-50 p-3 border-t border-gray-200 text-[11px] text-gray-600 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Rate Date:</span>
              <span className="font-bold text-blue-900">{rateDate || 'Latest'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Source:</span>
              <span
                className={`px-1.5 py-0.5 rounded font-semibold ${
                  isFallback || activeDetail.isFallback
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {currency === 'LKR'
                  ? 'LKR Base (1.0)'
                  : activeDetail.source === 'frankfurter-ecb-live'
                  ? 'Frankfurter ECB Live'
                  : 'Reference Peg / Cached'}
              </span>
            </div>
            {currency !== 'LKR' && (
              <div className="flex items-start gap-1 text-[10px] text-gray-500 pt-1 border-t border-gray-200/80">
                <Info size={12} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <span>
                  All prices are stored in LKR and dynamically converted ({currency} = LKR ×{' '}
                  {activeRate.toFixed(5)}).
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;

