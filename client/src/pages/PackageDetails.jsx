import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PackageContext } from '../context/PackageContext';
import { 
  Check, X, ArrowLeft, ArrowRight, DollarSign, Car, Home, 
  Utensils, Compass, Sparkles, ShieldAlert, Award, Globe, Users
} from 'lucide-react';

const PackageDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { selectPackage, customizations, updateCustomizations, calculatePackageCost } = useContext(PackageContext);

  // Local state for interactive customization on details page
  const [addGuide, setAddGuide] = useState(customizations.addGuide || false);
  const [selectedMeal, setSelectedMeal] = useState(customizations.selectedMealOption || 'Authentic Sri Lankan Culinary Experience');
  const [selectedGuide, setSelectedGuide] = useState(customizations.selectedGuideOption || 'Cultural & Heritage Historian Guide');
  const [previewDays, setPreviewDays] = useState(3);
  const [previewTravelers, setPreviewTravelers] = useState(2);

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/packages/${id}`);
        setPkg(res.data.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch package details');
      } finally {
        setLoading(false);
      }
    };
    fetchPackage();
  }, [id]);

  const handleApplyAndContinue = () => {
    if (!pkg) return;
    selectPackage(pkg);
    updateCustomizations({
      addGuide: pkg.packageName === 'Standard' ? addGuide : false,
      selectedMealOption: selectedMeal,
      selectedGuideOption: selectedGuide
    });
    navigate('/planner');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{error || 'Package not found'}</h2>
        <button onClick={() => navigate('/packages')} className="text-blue-600 hover:underline">
          &larr; Back to Packages
        </button>
      </div>
    );
  }

  // Cost calculation preview
  const costBreakdown = calculatePackageCost(pkg, previewDays, previewTravelers, {
    addGuide,
    selectedMealOption: selectedMeal,
    selectedGuideOption: selectedGuide
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <button 
        onClick={() => navigate('/packages')} 
        className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={18} className="mr-2" /> Back to All Packages
      </button>

      {/* Main Container */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Hero Header */}
        <div className="relative p-8 md:p-12 text-white overflow-hidden bg-slate-900">
          {(pkg.image || pkg.imageUrl) ? (
            <img 
              src={pkg.image || pkg.imageUrl} 
              alt={pkg.packageName}
              className="absolute inset-0 w-full h-full object-cover" 
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30" />
          
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <span className="bg-blue-500/50 backdrop-blur-sm text-blue-100 border border-blue-400/40 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full">
                {pkg.badge || `${pkg.packageName} Tier`}
              </span>
              {pkg.packageName === 'Premium' && (
                <span className="flex items-center bg-amber-400/30 backdrop-blur-sm text-amber-200 border border-amber-400/40 text-xs font-bold px-3 py-1 rounded-full">
                  <Sparkles size={14} className="mr-1.5" /> All-Inclusive VIP Experience
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              {pkg.packageName} Tour Package
            </h1>
            <p className="text-blue-100 text-lg max-w-3xl leading-relaxed drop-shadow">
              {pkg.description}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 md:p-12 space-y-12">

          {/* Pricing & 4 Pillars Overview */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100">
              <div className="flex items-center gap-2.5 text-blue-900 font-bold mb-1">
                <Car size={18} className="text-blue-600" /> Transport
              </div>
              <p className="text-sm text-gray-700">
                {pkg.features?.transport || 'Standard private vehicle & driver included'}
              </p>
            </div>

            <div className={`p-5 rounded-2xl border ${pkg.packageName === 'Basic' ? 'bg-amber-50/50 border-amber-100' : 'bg-blue-50/60 border-blue-100'}`}>
              <div className="flex items-center gap-2.5 text-gray-900 font-bold mb-1">
                <Home size={18} className={pkg.packageName === 'Basic' ? 'text-amber-600' : 'text-blue-600'} /> Accommodation
              </div>
              <p className="text-sm text-gray-700">
                {pkg.features?.accommodation || (pkg.packageName === 'Basic' ? 'Not Included (Self-arranged)' : 'Included')}
              </p>
            </div>

            <div className={`p-5 rounded-2xl border ${pkg.packageName === 'Premium' ? 'bg-purple-50/60 border-purple-100' : 'bg-amber-50/50 border-amber-100'}`}>
              <div className="flex items-center gap-2.5 text-gray-900 font-bold mb-1">
                <Utensils size={18} className={pkg.packageName === 'Premium' ? 'text-purple-600' : 'text-amber-600'} /> Meals & Dining
              </div>
              <p className="text-sm text-gray-700">
                {pkg.features?.meals || (pkg.packageName === 'Premium' ? 'All Gourmet Meals Included' : 'Not Included by default')}
              </p>
            </div>

            <div className={`p-5 rounded-2xl border ${pkg.packageName === 'Premium' ? 'bg-purple-50/60 border-purple-100' : pkg.packageName === 'Standard' ? 'bg-blue-50/60 border-blue-100' : 'bg-amber-50/50 border-amber-100'}`}>
              <div className="flex items-center gap-2.5 text-gray-900 font-bold mb-1">
                <Compass size={18} className={pkg.packageName === 'Premium' ? 'text-purple-600' : 'text-blue-600'} /> Tour Guide
              </div>
              <p className="text-sm text-gray-700">
                {pkg.features?.tourGuide || (pkg.packageName === 'Premium' ? 'Dedicated Specialist Guide' : pkg.packageName === 'Standard' ? 'Optional Add-on' : 'Not Included')}
              </p>
            </div>
          </div>

          {/* Included vs Excluded Comparison */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* What's Included */}
            <div className="bg-gray-50/80 p-6 rounded-2xl border border-gray-200/80">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                  <Check size={16} />
                </span>
                Included Facilities
              </h3>
              <ul className="space-y-3">
                {pkg.includedFacilities?.map((item, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-700">
                    <Check size={16} className="text-green-600 mr-2.5 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What's Excluded */}
            <div className="bg-gray-50/80 p-6 rounded-2xl border border-gray-200/80">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center">
                  <X size={16} />
                </span>
                Excluded Facilities (Clear Notice)
              </h3>
              <ul className="space-y-3">
                {pkg.excludedFacilities?.map((item, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-600">
                    <X size={16} className="text-gray-400 mr-2.5 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* SPECIAL SECTION: STANDARD PACKAGE GUIDE ADD-ON */}
          {pkg.packageName === 'Standard' && (
            <div className="bg-blue-50/80 border border-blue-200 p-6 rounded-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="bg-blue-200 text-blue-900 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    Optional Add-on Service
                  </span>
                  <h4 className="text-xl font-bold text-blue-950 mt-1">Professional Tour Guide Service</h4>
                  <p className="text-sm text-blue-800/80 max-w-xl mt-1">
                    By default, the Standard package includes hotel stays and transport without a tour guide. 
                    You can optionally add a licensed guide for insightful commentary throughout your journey.
                  </p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3 rounded-xl border border-blue-300 shadow-sm hover:border-blue-500 transition-colors">
                  <input 
                    type="checkbox"
                    checked={addGuide}
                    onChange={(e) => setAddGuide(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  />
                  <div className="text-left">
                    <span className="block font-bold text-sm text-gray-900">Include Tour Guide</span>
                    <span className="text-xs text-blue-700 font-semibold">+${pkg.guideAddonPrice || 45} / day</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* SPECIAL SECTION: PREMIUM PACKAGE SELECTIONS (FOOD & GUIDE) */}
          {pkg.packageName === 'Premium' && (
            <div className="space-y-8 bg-purple-50/50 p-8 rounded-3xl border border-purple-200/80">
              <div>
                <span className="bg-purple-200 text-purple-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Step 1 • Culinary Customization
                </span>
                <h3 className="text-2xl font-bold text-gray-900 mt-2 mb-1">Select Your Preferred Meal Plan</h3>
                <p className="text-gray-600 text-sm">
                  The Premium Package includes full-board dining. Choose your preferred cuisine style:
                </p>

                <div className="grid md:grid-cols-2 gap-4 mt-5">
                  {pkg.mealOptions?.map((meal, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setSelectedMeal(meal.name)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedMeal === meal.name ? 'border-purple-600 bg-white shadow-md' : 'border-gray-200 bg-white/70 hover:border-purple-300'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="mealOption" 
                            checked={selectedMeal === meal.name} 
                            onChange={() => setSelectedMeal(meal.name)}
                            className="text-purple-600 focus:ring-purple-500" 
                          />
                          {meal.name}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meal.extraCostPerDay > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                          {meal.extraCostPerDay > 0 ? `+$${meal.extraCostPerDay}/day` : 'Included'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 ml-5">{meal.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-purple-200">
                <span className="bg-purple-200 text-purple-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Step 2 • Specialist Guide Selection
                </span>
                <h3 className="text-2xl font-bold text-gray-900 mt-2 mb-1">Choose Your Specialist Tour Guide</h3>
                <p className="text-gray-600 text-sm">
                  A dedicated licensed National Guide is fully included. Select the guide profile that best matches your travel interests:
                </p>

                <div className="grid md:grid-cols-2 gap-4 mt-5">
                  {pkg.guideOptions?.map((guide, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setSelectedGuide(guide.name)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedGuide === guide.name ? 'border-purple-600 bg-white shadow-md' : 'border-gray-200 bg-white/70 hover:border-purple-300'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="guideOption" 
                            checked={selectedGuide === guide.name} 
                            onChange={() => setSelectedGuide(guide.name)}
                            className="text-purple-600 focus:ring-purple-500" 
                          />
                          {guide.name}
                        </span>
                        <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          Included
                        </span>
                      </div>
                      <p className="text-xs text-purple-900/80 font-medium ml-5 mb-1.5">{guide.specialty}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-5">
                        <Globe size={12} className="text-gray-400" />
                        <span>Languages: {guide.languages?.join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Estimated Cost Calculator Box */}
          <div className="bg-gradient-to-br from-gray-900 to-blue-950 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300 bg-blue-900/60 px-3 py-1 rounded-full border border-blue-400/30">
                Live Cost Preview
              </span>
              <h3 className="text-2xl font-bold">Estimated Trip Investment</h3>
              
              <div className="flex flex-wrap gap-4 text-xs text-gray-300 pt-1">
                <div className="flex items-center gap-2">
                  <span>Days:</span>
                  <input 
                    type="number" 
                    min="1" 
                    max="30" 
                    value={previewDays} 
                    onChange={e => setPreviewDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 px-2 py-1 bg-white/10 border border-white/20 rounded text-white font-bold" 
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span>Travelers:</span>
                  <input 
                    type="number" 
                    min="1" 
                    max="20" 
                    value={previewTravelers} 
                    onChange={e => setPreviewTravelers(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 px-2 py-1 bg-white/10 border border-white/20 rounded text-white font-bold" 
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Includes base ${pkg.baseCharge}/day per person
                {costBreakdown.guideCost > 0 && ` + Guide add-on $${costBreakdown.guideCost}`}
                {costBreakdown.mealExtraCost > 0 && ` + Gourmet meal premium $${costBreakdown.mealExtraCost}`}
              </p>
            </div>

            <div className="text-center md:text-right flex flex-col items-center md:items-end">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Total Estimated Cost</span>
              <div className="text-5xl font-extrabold text-green-400 my-1">
                ${costBreakdown.grandTotal}
              </div>
              <button 
                onClick={handleApplyAndContinue}
                className="mt-4 flex items-center bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 text-sm"
              >
                Continue to Trip Planner <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PackageDetails;
