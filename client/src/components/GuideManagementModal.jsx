import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Save, Compass, Globe, MapPin, DollarSign, Phone, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';

const GuideManagementModal = ({ isOpen, onClose, onProfileUpdated, existingProfile = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    serviceAreas: '',
    languages: '',
    dailyRate: '',
    availability: true,
    image: ''
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileId, setProfileId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSuccess('');

    if (existingProfile) {
      populateForm(existingProfile);
    } else {
      // Fetch guide's own profile from backend
      fetchOwnProfile();
    }
  }, [isOpen, existingProfile]);

  const populateForm = (data) => {
    setProfileId(data._id);
    setFormData({
      name: data.name || data.userId?.name || '',
      phone: data.phone || '',
      bio: data.bio || '',
      serviceAreas: Array.isArray(data.serviceAreas) ? data.serviceAreas.join(', ') : '',
      languages: Array.isArray(data.languages) ? data.languages.join(', ') : '',
      dailyRate: data.dailyRate !== undefined ? String(data.dailyRate) : '50',
      availability: data.availability !== undefined ? data.availability : true,
      image: data.image || data.userId?.profileImage || ''
    });
  };

  const fetchOwnProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/guides/my-profile');
      if (res.data?.data) {
        populateForm(res.data.data);
      }
    } catch (err) {
      // If 404, user doesn't have a profile yet; leave form clean for initial registration
      if (err.response?.status === 404) {
        setProfileId(null);
      } else {
        setError(err.response?.data?.error || 'Failed to load guide profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const rateNum = Number(formData.dailyRate);
    if (isNaN(rateNum) || rateNum < 0) {
      setError('Please provide a valid daily rate ($0 or more).');
      return;
    }

    if (!formData.name.trim()) {
      setError('Guide display name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        bio: formData.bio.trim(),
        serviceAreas: formData.serviceAreas,
        languages: formData.languages,
        dailyRate: rateNum,
        availability: formData.availability,
        image: formData.image.trim()
      };

      let res;
      if (profileId) {
        // Update existing profile
        res = await api.put(`/guides/${profileId}`, payload);
        setSuccess('Guide profile updated successfully!');
      } else {
        // Create initial guide profile
        res = await api.post('/guides', payload);
        setSuccess('Guide profile registered successfully!');
        if (res.data?.data?._id) {
          setProfileId(res.data.data._id);
        }
      }

      if (onProfileUpdated) {
        onProfileUpdated(res.data?.data);
      }

      setTimeout(() => {
        if (isOpen) {
          onClose();
        }
      }, 1200);

    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save guide profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300 bg-blue-800/60 px-3 py-1 rounded-full border border-blue-400/30">
              Module 4 • Guide Management
            </span>
            <h2 className="text-2xl font-extrabold text-white">
              {profileId ? 'Update Tour Guide Profile' : 'Register Tour Guide Profile'}
            </h2>
            <p className="text-xs text-blue-200">
              Configure your service areas, languages, daily pricing, and live availability for tourists.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-2"></div>
              Loading profile details...
            </div>
          ) : (
            <form id="guide-form" onSubmit={handleSubmit} className="space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Guide Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Full Name / Professional Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Nimal Bandara"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 flex items-center gap-1">
                    <Phone size={13} className="text-blue-600" /> Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +94 77 123 4567"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Bio / Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Professional Biography / Guiding Experience
                </label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Describe your tour guiding experience, specialties (cultural triangle, wildlife, birdwatching, trekking), and credentials..."
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 leading-relaxed"
                />
              </div>

              {/* Service Areas & Languages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 flex items-center gap-1">
                    <MapPin size={13} className="text-blue-600" /> Service Areas (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.serviceAreas}
                    onChange={(e) => setFormData({ ...formData, serviceAreas: e.target.value })}
                    placeholder="e.g. Kandy, Sigiriya, Ella, Galle"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">Separate cities or districts with commas</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 flex items-center gap-1">
                    <Globe size={13} className="text-blue-600" /> Spoken Languages (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.languages}
                    onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                    placeholder="e.g. English, Sinhala, German"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">Languages you speak fluently with tourists</span>
                </div>
              </div>

              {/* Pricing & Image URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 flex items-center gap-1">
                    <DollarSign size={13} className="text-green-600" /> Daily Service Rate (USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={formData.dailyRate}
                      onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                      placeholder="55"
                      className="w-full pl-8 pr-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 flex items-center gap-1">
                    <ImageIcon size={13} className="text-blue-600" /> Profile Photo URL
                  </label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Availability Toggle */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-gray-900 block">Accepting Tour Bookings</span>
                  <span className="text-xs text-gray-500">
                    When active, your profile will appear as "Available" to tourists.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="guide-form"
            disabled={saving || loading}
            className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Save size={14} />
            {saving ? 'Saving Profile...' : profileId ? 'Update Guide Profile' : 'Register Profile'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default GuideManagementModal;

