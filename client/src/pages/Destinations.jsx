import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import DestinationCard from '../components/DestinationCard';
import { Search, SlidersHorizontal, X, MapPin } from 'lucide-react';

const Destinations = () => {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');

  const fetchDestinations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/destinations');
      const rawData = res.data?.data ?? res.data?.destinations ?? res.data;
      const destinationList = Array.isArray(rawData) ? rawData : [];
      setDestinations(destinationList);
    } catch (err) {
      console.error('Error fetching destinations:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load destinations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  // Extract unique categories and districts from data
  const categories = useMemo(() => {
    const defaultCats = ['All', 'Cultural', 'Mountain', 'Beach', 'Wildlife', 'Forest'];
    const dynamicCats = Array.from(new Set(destinations.map(d => d.category).filter(Boolean)));
    const merged = Array.from(new Set([...defaultCats, ...dynamicCats]));
    return merged;
  }, [destinations]);

  const districts = useMemo(() => {
    const dists = Array.from(new Set(destinations.map(d => d.district).filter(Boolean))).sort();
    return ['All', ...dists];
  }, [destinations]);

  // Client-side filtering for immediate snappy UI response
  const filteredDestinations = useMemo(() => {
    return destinations.filter(dest => {
      const matchesSearch = !searchQuery.trim() || 
        dest.name?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        dest.district?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        dest.category?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        dest.description?.toLowerCase().includes(searchQuery.toLowerCase().trim());

      const matchesCategory = selectedCategory === 'All' || 
        dest.category?.toLowerCase() === selectedCategory.toLowerCase();

      const matchesDistrict = selectedDistrict === 'All' || 
        dest.district?.toLowerCase() === selectedDistrict.toLowerCase();

      return matchesSearch && matchesCategory && matchesDistrict;
    });
  }, [destinations, searchQuery, selectedCategory, selectedDistrict]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedCategory !== 'All' || selectedDistrict !== 'All';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedDistrict('All');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Title & Introduction */}
      <div className="text-center mb-10">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-200">
          Explore Sri Lanka
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-950 mt-3 mb-4 tracking-tight">
          Discover Sri Lanka's Wonders
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Explore ancient UNESCO fortresses, pristine tropical coastlines, mist-covered mountain tea valleys, and vibrant wildlife sanctuaries.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-10 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search by destination name, district, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* District Dropdown Filter */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[180px]">
              <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
              >
                {districts.map(d => (
                  <option key={d} value={d}>
                    {d === 'All' ? 'All Districts' : `${d} District`}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition whitespace-nowrap"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-400 mr-1 flex items-center gap-1">
            <SlidersHorizontal size={12} /> Category:
          </span>
          {categories.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-all ${
                  isActive 
                    ? 'bg-blue-900 text-white shadow-sm ring-2 ring-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Content State Handling */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20 space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
          <p className="text-sm text-gray-500 font-medium">Loading Sri Lankan destinations...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 px-6 bg-red-50 rounded-2xl border border-red-200 max-w-xl mx-auto mb-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 font-bold text-xl">
            !
          </div>
          <h3 className="text-xl font-bold text-red-900 mb-2">Unable to Load Destinations</h3>
          <p className="text-red-700 text-sm mb-6">{error}</p>
          <button
            onClick={fetchDestinations}
            className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-6 py-2.5 rounded-lg shadow transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : destinations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-xl mx-auto">
          <p className="text-gray-700 text-lg font-semibold mb-2">No destinations found in database.</p>
          <p className="text-gray-500 text-sm mb-6">
            The destinations collection in MongoDB is currently empty. Run the recovery seed script to populate Sri Lankan travel spots.
          </p>
          <button
            onClick={fetchDestinations}
            className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            Refresh
          </button>
        </div>
      ) : filteredDestinations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-xl mx-auto">
          <p className="text-gray-800 text-lg font-bold mb-2">No destinations match your filters</p>
          <p className="text-gray-500 text-sm mb-6">
            We couldn't find any destinations matching "{searchQuery || selectedCategory || selectedDistrict}". Try adjusting your search query or filters.
          </p>
          <button
            onClick={resetFilters}
            className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6 text-sm text-gray-500">
            <span>
              Showing <strong>{filteredDestinations.length}</strong> of <strong>{destinations.length}</strong> destinations
            </span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
            {filteredDestinations.map(dest => (
              <DestinationCard key={dest._id || dest.id} destination={dest} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Destinations;
