import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Calendar, Map as MapIcon, Star, MapPin, ArrowRight } from 'lucide-react';
import api from '../services/api';
import StarRating from '../components/StarRating';

const Home = () => {
  const [topGuides, setTopGuides] = useState([]);
  const [topHotels, setTopHotels] = useState([]);

  useEffect(() => {
    const fetchPopularServices = async () => {
      try {
        const [guidesRes, hotelsRes] = await Promise.all([
          api.get('/reviews/popular/guide?limit=3'),
          api.get('/reviews/popular/hotel?limit=3')
        ]);
        setTopGuides(guidesRes.data?.data || []);
        setTopHotels(hotelsRes.data?.data || []);
      } catch (err) {
        console.error('Error loading popular services:', err);
      }
    };
    fetchPopularServices();
  }, []);

  return (
    <div>
      <section className="relative bg-blue-900 text-white overflow-hidden py-32 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-green-900 opacity-90 z-0"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6">Plan Your Smart Sri Lankan Journey</h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Discover the pearl of the Indian Ocean with personalized itineraries, top-rated guides, and seamless bookings.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link to="/planner" className="bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-bold py-3 px-8 rounded-full text-lg shadow-lg transition transform hover:scale-105">
              Start Planning
            </Link>
            <Link to="/destinations" className="bg-transparent border-2 border-white hover:bg-white hover:text-blue-900 font-bold py-3 px-8 rounded-full text-lg shadow-lg transition">
              Explore Destinations
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-10">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Compass size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Itineraries</h3>
              <p className="text-gray-600">AI-driven recommendations tailored to your budget, interests, and weather preferences.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Easy Bookings</h3>
              <p className="text-gray-600">Book hotels, transport, and certified local guides all in one unified platform.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition">
              <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapIcon size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Curated Packages</h3>
              <p className="text-gray-600">Choose from carefully crafted tour packages spanning from budget to luxury experiences.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Top Rated Guides & Hotels Section (Module 5 Popularity Statistics) */}
      {(topGuides.length > 0 || topHotels.length > 0) && (
        <section className="py-16 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Community Trusted
              </span>
              <h2 className="text-3xl font-extrabold text-blue-950 mt-2">
                Highest Rated Guides & Stays
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Ranked dynamically using verified tourist ratings and review volume.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Top Guides */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">Top-Rated Tour Guides</h3>
                  <Link
                    to="/guides"
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    View All Guides <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="space-y-3">
                  {topGuides.map((g) => {
                    const name = g.name || g.userId?.name || 'Certified Guide';
                    return (
                      <Link
                        key={g._id}
                        to="/guides"
                        className="block bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">{name}</h4>
                            <p className="text-xs text-gray-500">
                              {(g.serviceAreas || []).join(', ') || 'Island-wide'} • ${g.dailyRate}/day
                            </p>
                          </div>
                          <div className="text-right">
                            <StarRating rating={g.rating || 0} size={14} />
                            <span className="block text-xs font-bold text-gray-700 mt-0.5">
                              {Number(g.rating || 0).toFixed(1)} ({g.reviewCount || 0} reviews)
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Top Hotels */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">Top-Rated Partner Hotels</h3>
                  <Link
                    to="/hotels"
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    View All Hotels <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="space-y-3">
                  {topHotels.map((h) => (
                    <Link
                      key={h._id}
                      to="/hotels"
                      className="block bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{h.name}</h4>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin size={11} /> {h.location} • ${h.pricePerNight}/night
                          </p>
                        </div>
                        <div className="text-right">
                          <StarRating rating={h.rating || 0} size={14} />
                          <span className="block text-xs font-bold text-gray-700 mt-0.5">
                            {Number(h.rating || 0).toFixed(1)} ({h.reviewCount || 0} reviews)
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
