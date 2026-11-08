import React, { createContext, useState, useContext, useCallback } from 'react';
import api from '../services/api';
import { CurrencyContext } from './CurrencyContext';

export const PackageContext = createContext();

const TRANSPORT_RATES_LKR = {
  Motorcycle: { capacity: 2, ratePerDayLKR: 6500, includedKmPerDay: 120, extraKmLKR: 45 },
  Car: { capacity: 3, ratePerDayLKR: 15000, includedKmPerDay: 150, extraKmLKR: 85 },
  Van: { capacity: 8, ratePerDayLKR: 24000, includedKmPerDay: 180, extraKmLKR: 115 },
  Bus: { capacity: 20, ratePerDayLKR: 36000, includedKmPerDay: 200, extraKmLKR: 160 }
};

const MEAL_TYPE_RATES_LKR = {
  Vegetarian: 4500,
  Vegan: 4800,
  Seafood: 7500,
  'All meat types': 6500
};

const TIER_COORDINATION_LKR = {
  Basic: 4500,
  Standard: 7500,
  Premium: 16500
};

export const PackageProvider = ({ children }) => {
  const currencyCtx = useContext(CurrencyContext);
  const currency = currencyCtx?.currency || 'LKR';
  const convertFromLKR = currencyCtx?.convertFromLKR || ((val) => val);
  const normalizeAmountToLKR = currencyCtx?.normalizeAmountToLKR || ((val) => val);
  const formatPrice = currencyCtx?.formatPrice || ((val) => `Rs. ${val}`);

  const [selectedPackage, setSelectedPackage] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedPackage');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [customizations, setCustomizationsState] = useState(() => {
    try {
      const saved = localStorage.getItem('packageCustomizations');
      return saved
        ? {
            addGuide: false,
            selectedMealType: 'Vegetarian',
            selectedMealOption: 'Authentic Sri Lankan Culinary Experience',
            selectedGuideOption: 'Cultural & Heritage Historian Guide',
            selectedGuideId: '',
            selectedHotelId: '',
            selectedRoomType: '',
            numberOfRooms: 1,
            vehicleType: 'Car',
            routeDistanceKm: 0,
            ...JSON.parse(saved)
          }
        : {
            addGuide: false,
            selectedMealType: 'Vegetarian',
            selectedMealOption: 'Authentic Sri Lankan Culinary Experience',
            selectedGuideOption: 'Cultural & Heritage Historian Guide',
            selectedGuideId: '',
            selectedHotelId: '',
            selectedRoomType: '',
            numberOfRooms: 1,
            vehicleType: 'Car',
            routeDistanceKm: 0
          };
    } catch (e) {
      return {
        addGuide: false,
        selectedMealType: 'Vegetarian',
        selectedMealOption: 'Authentic Sri Lankan Culinary Experience',
        selectedGuideOption: 'Cultural & Heritage Historian Guide',
        selectedGuideId: '',
        selectedHotelId: '',
        selectedRoomType: '',
        numberOfRooms: 1,
        vehicleType: 'Car',
        routeDistanceKm: 0
      };
    }
  });

  const selectPackage = async (pkg, extraParams = {}) => {
    if (!pkg) return;
    setSelectedPackage(pkg);
    try {
      localStorage.setItem('selectedPackage', JSON.stringify(pkg));
    } catch (e) {
      // Ignore storage error
    }

    // Sync package selection with backend trip-planning state
    try {
      await api.post('/packages/select', {
        packageId: pkg._id,
        packageName: pkg.packageName,
        targetCurrency: currency,
        ...customizations,
        ...extraParams
      });
    } catch (e) {
      // Non-blocking sync
    }
  };

  const clearPackage = () => {
    setSelectedPackage(null);
    localStorage.removeItem('selectedPackage');
  };

  const updateCustomizations = (updates) => {
    setCustomizationsState((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('packageCustomizations', JSON.stringify(next));
      } catch (e) {
        // Ignore storage error
      }
      return next;
    });
  };

  /**
   * Synchronous client-side dynamic cost calculation in LKR + active currency.
   * Mirrors the authoritative backend pricing engine rules for instant UI feedback.
   */
  const calculatePackageCost = useCallback(
    (pkg, days = 1, travelers = 1, custom = customizations) => {
      const safeDays = Math.max(1, Number(days) || 1);
      const safeTravelers = Math.max(1, Number(travelers) || 1);
      const pkgName = pkg?.packageName || 'Standard';

      // 1. Tier coordination & non-food facilities
      const tierCoordRateLKR = TIER_COORDINATION_LKR[pkgName] || 7500;
      const coordinationLKR = tierCoordRateLKR * safeDays * safeTravelers;

      // 2. Transportation calculation
      const vehicleKey = TRANSPORT_RATES_LKR[custom?.vehicleType] ? custom.vehicleType : 'Car';
      const vRule = TRANSPORT_RATES_LKR[vehicleKey];
      const vehiclesCount = Math.max(1, Math.ceil(safeTravelers / vRule.capacity));
      const distanceKm = Math.max(0, Number(custom?.routeDistanceKm) || 0);
      const includedKm = vRule.includedKmPerDay * safeDays;
      const excessKm = distanceKm > includedKm ? distanceKm - includedKm : 0;
      const transportLKR =
        vRule.ratePerDayLKR * safeDays * vehiclesCount +
        Math.round(excessKm * vRule.extraKmLKR * vehiclesCount);

      // 3. Accommodation calculation
      let accommodationLKR = 0;
      let roomsCount = 0;
      if (pkgName !== 'Basic' || custom?.selectedHotelRateLKR) {
        const roomCap = Math.max(1, Number(custom?.selectedRoomCapacity) || 2);
        const minRooms = Math.ceil(safeTravelers / roomCap);
        roomsCount = Math.max(minRooms, Number(custom?.numberOfRooms) || minRooms);
        const nightlyLKR = custom?.selectedHotelRateLKR
          ? normalizeAmountToLKR(custom.selectedHotelRateLKR, true)
          : pkgName === 'Premium'
          ? 63000
          : 36000;
        accommodationLKR = nightlyLKR * roomsCount * safeDays;
      }

      // 4. Meal calculation (Basic & Standard do NOT charge for unincluded meals)
      let mealCostLKR = 0;
      let mealExtraCostLKR = 0;
      if (pkgName === 'Premium') {
        const mealType = custom?.selectedMealType || 'Vegetarian';
        const baseMealRateLKR = MEAL_TYPE_RATES_LKR[mealType] || 4500;
        if (Array.isArray(pkg?.mealOptions)) {
          const matchedMeal = pkg.mealOptions.find((m) => m.name === custom?.selectedMealOption);
          if (matchedMeal && matchedMeal.extraCostPerDay) {
            mealExtraCostLKR =
              normalizeAmountToLKR(matchedMeal.extraCostPerDay, true) * safeDays * safeTravelers;
          }
        }
        mealCostLKR = baseMealRateLKR * safeDays * safeTravelers + mealExtraCostLKR;
      }

      // 5. Guide calculation
      let guideCostLKR = 0;
      if (pkgName === 'Premium') {
        const dailyGuideLKR = custom?.selectedGuideRateLKR
          ? normalizeAmountToLKR(custom.selectedGuideRateLKR, true)
          : 18000;
        guideCostLKR = dailyGuideLKR * safeDays;
      } else if (pkgName === 'Standard' && (custom?.addGuide || custom?.selectedGuideId)) {
        const dailyGuideLKR = custom?.selectedGuideRateLKR
          ? normalizeAmountToLKR(custom.selectedGuideRateLKR, true)
          : normalizeAmountToLKR(pkg?.guideAddonPrice || 13500, true);
        guideCostLKR = dailyGuideLKR * safeDays;
      }

      const baseTotalLKR =
        coordinationLKR +
        transportLKR +
        accommodationLKR +
        (pkgName === 'Premium' ? mealCostLKR - mealExtraCostLKR : 0) +
        (pkgName === 'Premium' ? guideCostLKR : 0);

      const grandTotalLKR =
        coordinationLKR + transportLKR + accommodationLKR + mealCostLKR + guideCostLKR;
      const perPersonLKR = Math.round(grandTotalLKR / safeTravelers);

      return {
        currency,
        coordinationLKR,
        transportLKR,
        accommodationLKR,
        mealCostLKR,
        mealExtraCostLKR,
        guideCostLKR,
        baseTotalLKR,
        grandTotalLKR,
        perPersonLKR,
        vehiclesCount,
        roomsCount,
        // Converted values in active display currency
        coordinationConverted: convertFromLKR(coordinationLKR, currency, false),
        transportConverted: convertFromLKR(transportLKR, currency, false),
        accommodationConverted: convertFromLKR(accommodationLKR, currency, false),
        mealCostConverted: convertFromLKR(mealCostLKR, currency, false),
        baseTotal: convertFromLKR(baseTotalLKR, currency, false),
        guideCost: convertFromLKR(guideCostLKR, currency, false),
        mealExtraCost: convertFromLKR(mealExtraCostLKR, currency, false),
        grandTotal: convertFromLKR(grandTotalLKR, currency, false),
        perPersonConverted: convertFromLKR(perPersonLKR, currency, false),
        formattedGrandTotal: formatPrice(grandTotalLKR, { normalizeLegacy: false }),
        formattedGrandTotalLKR: `Rs. ${grandTotalLKR.toLocaleString('en-US')}`,
        formattedPerPerson: formatPrice(perPersonLKR, { normalizeLegacy: false })
      };
    },
    [customizations, currency, convertFromLKR, normalizeAmountToLKR, formatPrice]
  );

  /**
   * Call authoritative backend pricing engine (POST /api/pricing/calculate)
   */
  const fetchBackendPricing = useCallback(
    async (params = {}) => {
      const res = await api.post('/pricing/calculate', {
        packageId: selectedPackage?._id,
        packageName: selectedPackage?.packageName || 'Standard',
        targetCurrency: currency,
        ...customizations,
        ...params
      });
      return res.data?.data;
    },
    [selectedPackage, currency, customizations]
  );

  return (
    <PackageContext.Provider
      value={{
        selectedPackage,
        selectPackage,
        clearPackage,
        customizations,
        updateCustomizations,
        calculatePackageCost,
        fetchBackendPricing
      }}
    >
      {children}
    </PackageContext.Provider>
  );
};
