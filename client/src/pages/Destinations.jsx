import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import DestinationCard from '../components/DestinationCard';
import MapView from '../components/MapView';
import { 
  Search, SlidersHorizontal, X, MapPin, Grid, Map as MapIcon, 
  Sparkles, RefreshCw, Compass, AlertCircle 
} from 'lucide-react';

/**
 * Dream Ceylon Tourism Management System
 * Destinations Directory Page
 * 
 * Features:
 * - Dynamic retrieval of 45+ Sri Lankan destinations from MongoDB
 * - Search by name, district, province, keyword, or tag
 * - Category filter pills (Beach, Mountain, Historical, Waterfall, Wildlife, Nature, Lake)
 * - District & Province dropdown filters
 * - Grid View vs. Full Interactive Map View toggle
 * - Responsive layout matching Dream Ceylon branding
 */

const PRESET_CATEGORIES = [
  'All',
  'Beach',
  'Mountain',
  'Historical',
  'Waterfall',
  'Wildlife',
  'Nature',
  'Lake'
];

const Destinations = () => {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedProvince, setSelectedProvince] = useState('All');
  
  // View mode: 'grid' or 'map'
  const [viewMode, setViewMode] = useState('grid');

  // Metadata for filter dropdowns
  const [filterMeta, setFilterMeta] = useState({
    categories: PRESET_CATEGORIES,
    districts: [],
    provinces: []
  });

  // Fetch filter metadata and destinations from backend
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [destRes, metaRes] = await Promise.all([
        api.get('/destinations'),
        api.get('/destinations/meta/filters').catch(() => ({ data: { data: {} } }))
      ]);

      const rawData = destRes.data?.data ?? destRes.data?.destinations ?? destRes.data;
      const destinationList = Array.isArray(rawData) ? rawData : [];
      setDestinations(destinationList);

      const meta = metaRes.data?.data || {};
      setFilterMeta({
        categories: meta.categories && meta.categories.length > 0 
          ? ['All', ...meta.categories] 
          : PRESET_CATEGORIES,
        districts: meta.districts && meta.districts.length > 0 
          ? ['All', ...meta.districts] 
          : ['All', ...Array.from(new Set(destinationList.map(d => d.district).filter(Boolean))).sort()],
        provinces: meta.provinces && meta.provinces.length > 0 
          ? ['All', ...meta.provinces] 
          : ['All', ...Array.from(new Set(destinationList.map(d => d.province).filter(Boolean))).sort()]
      });

    } catch (err) {
      console.error('Error fetching destinations:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load destinations from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Multi-criteria client-side filtering for snappy real-time response
  const filteredDestinations = useMemo(() => {
    return destinations.filter(dest => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        dest.name?.toLowerCase().includes(q) ||
        dest.district?.toLowerCase().includes(q) ||
        dest.province?.toLowerCase().includes(q) ||
        dest.location?.toLowerCase().includes(q) ||
        dest.category?.toLowerCase().includes(q) ||
        dest.description?.toLowerCase().includes(q) ||
        (Array.isArray(dest.tags) && dest.tags.some(t => t.toLowerCase().includes(q)))
      );

      // 2. Category
      let matchesCategory = selectedCategory === 'All';
      if (!matchesCategory && dest.category) {
        if (selectedCategory.toLowerCase() === 'historical' || selectedCategory.toLowerCase() === 'cultural') {
          matchesCategory = dest.category.toLowerCase().includes('historical') || dest.category.toLowerCase().includes('cultural');
        } else if (selectedCategory.toLowerCase() === 'wildlife' || selectedCategory.toLowerCase() === 'nature') {
          matchesCategory = dest.category.toLowerCase().includes('wildlife') || dest.category.toLowerCase().includes('nature') || dest.category.toLowerCase().includes('forest');
        } else {
          matchesCategory = dest.category.toLowerCase() === selectedCategory.toLowerCase();
        }
      }

      // 3. District
      const matchesDistrict = selectedDistrict === 'All' || 
        dest.district?.toLowerCase() === selectedDistrict.toLowerCase();

      // 4. Province
      const matchesProvince = selectedProvince === 'All' || 
        dest.province?.toLowerCase() === selectedProvince.toLowerCase();

      return matchesSearch && matchesCategory && matchesDistrict && matchesProvince;
    });
  }, [destinations, searchQuery, selectedCategory, selectedDistrict, selectedProvince]);

  const hasActiveFilters = searchQuery.trim() !== '' || 
    selectedCategory !== 'All' || 
    selectedDistrict !== 'All' || 
    selectedProvince !== 'All';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedDistrict('All');
    setSelectedProvince('All');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      
      {/* Page Hero Header */}
      <div className="text-center mb-10">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-200 inline-flex items-center gap-1.5 shadow-sm">
          <Sparkles size={13} className="text-blue-600" />
          Sri Lanka Tourism Directory
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-950 mt-3 mb-3 tracking-tight">
          Explore Sri Lanka's Wonders
        </h1>
        <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Discover over 45 hand-picked destinations across tropical golden coastlines, misty cloud highlands, ancient UNESCO kingdoms, and untamed wildlife national parks.
        </p>
      </div>

      {/* Main Search & Filter Control Bar */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-8 space-y-4">
        
        {/* Top Controls Row */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Keyword Search Input */}
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search by name, district, province, keyword (e.g. Mirissa, Ella, UNESCO, Waterfall)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium text-gray-900"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title="Clear Search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* District Filter Dropdown */}
          <div className="relative min-w-[170px]">
            <MapPin size={15} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full pl-9 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white cursor-pointer text-gray-800"
            >
              {filterMeta.districts.map(d => (
                <option key={d} value={d}>
                  {d === 'All' ? 'All Districts' : `${d} District`}
                </option>
              ))}
            </select>
          </div>

          {/* Province Filter Dropdown */}
          <div className="relative min-w-[170px]">
            <Compass size={15} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full pl-9 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white cursor-pointer text-gray-800"
            >
              {filterMeta.provinces.map(p => (
                <option key={p} value={p}>
                  {p === 'All' ? 'All Provinces' : `${p} Province`}
                </option>
              ))}
            </select>
          </div>

          {/* Grid vs Map View Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl flex-shrink-0 self-end lg:self-center">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white text-blue-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid size={15} /> Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'map' 
                  ? 'bg-white text-blue-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MapIcon size={15} /> Map View
            </button>
          </div>

        </div>

        {/* Category Filter Pills Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 mr-1 flex items-center gap-1">
              <SlidersHorizontal size={13} /> Category:
            </span>
            {filterMeta.categories.map(cat => {
              const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all ${
                    isActive 
                      ? 'bg-blue-900 text-white shadow-md ring-2 ring-blue-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-red-600 hover:text-red-700 font-bold px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition whitespace-nowrap flex items-center gap-1"
            >
              <X size={13} /> Reset Filters
            </button>
          )}
        </div>

      </div>

      {/* Results Header Status */}
      <div className="flex justify-between items-center mb-6 text-xs text-gray-500 font-semibold px-1">
        <span>
          Showing <strong className="text-blue-900 font-extrabold">{filteredDestinations.length}</strong> of <strong className="text-gray-900">{destinations.length}</strong> Sri Lankan destinations
        </span>
        {hasActiveFilters && (
          <span className="text-blue-600">
            Filters Active: {[
              selectedCategory !== 'All' ? selectedCategory : null,
              selectedDistrict !== 'All' ? `${selectedDistrict} Dist.` : null,
              selectedProvince !== 'All' ? `${selectedProvince} Prov.` : null,
              searchQuery ? `"${searchQuery}"` : null
            ].filter(Boolean).join(' • ')}
          </span>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-24 space-y-3">
          <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-600 font-semibold">Loading popular Sri Lankan destinations...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 px-6 bg-red-50 rounded-3xl border border-red-200 max-w-lg mx-auto mb-8 shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-900 mb-1">Unable to Load Destinations</h3>
          <p className="text-red-700 text-xs mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition"
          >
            Try Again
          </button>
        </div>
      ) : filteredDestinations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100 max-w-md mx-auto p-8">
          <Compass className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Matching Destinations</h3>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            No destinations matched your criteria. Try adjusting your search query, or clear filters to view all places.
          </p>
          <button
            onClick={resetFilters}
            className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow"
          >
            Clear All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
          {filteredDestinations.map(dest => (
            <DestinationCard key={dest._id || dest.name} destination={dest} />
          ))}
        </div>
      ) : (
        /* INTERACTIVE MAP VIEW */
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900">
            <span>
              Plotted <strong>{filteredDestinations.length}</strong> destination coordinates across Sri Lanka. Click any marker to view details and navigate.
            </span>
            <span className="font-bold text-blue-700">OpenStreetMap + Leaflet</span>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-lg border border-gray-200">
            <MapView 
              destinations={filteredDestinations} 
              height="650px"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default Destinations;
