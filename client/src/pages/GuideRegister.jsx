import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Compass,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Award,
  DollarSign,
  Briefcase,
  CheckCircle2,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ImageUploader from '../components/ImageUploader';

const COMMON_LANGUAGES = [
  'English',
  'Sinhala',
  'Tamil',
  'German',
  'French',
  'Spanish',
  'Japanese',
  'Chinese',
  'Russian',
  'Italian'
];

const SRI_LANKA_DISTRICTS = [
  'Colombo',
  'Kandy',
  'Galle',
  'Ella',
  'Sigiriya',
  'Nuwara Eliya',
  'Yala',
  'Anuradhapura',
  'Polonnaruwa',
  'Mirissa',
  'Bentota',
  'Trincomalee',
  'Dambulla',
  'Udawalawe',
  'Jaffna'
];

const EXPERTISE_OPTIONS = [
  'Cultural',
  'Historical',
  'Wildlife',
  'Adventure',
  'Trekking',
  'Photography',
  'Culinary',
  'Tea Heritage',
  'Beach & Coastal',
  'Wellness & Ayurveda'
];

const GuideRegister = () => {
  const { user, setToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    contactNumber: '',
    profilePhoto: '',
    bio: '',
    languages: ['English', 'Sinhala'],
    serviceAreas: ['Kandy', 'Sigiriya'],
    expertise: ['Cultural', 'Historical'],
    experienceYears: 5,
    dailyRate: 15000,
    availability: true,
    availabilityNotes: 'Available for island-wide private and group tours.',
    qualificationsText: 'SLTDA National Tourist Guide License'
  });

  const [customLanguage, setCustomLanguage] = useState('');
  const [customArea, setCustomArea] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        profilePhoto: prev.profilePhoto || user.profileImage || ''
      }));
    }
  }, [user]);

  const toggleArrayItem = (field, item) => {
    setFormData((prev) => {
      const current = prev[field] || [];
      const exists = current.includes(item);
      return {
        ...prev,
        [field]: exists ? current.filter((x) => x !== item) : [...current, item]
      };
    });
  };

  const handleAddCustomLanguage = () => {
    const val = customLanguage.trim();
    if (!val) return;
    if (!formData.languages.includes(val)) {
      setFormData((prev) => ({ ...prev, languages: [...prev.languages, val] }));
    }
    setCustomLanguage('');
  };

  const handleAddCustomArea = () => {
    const val = customArea.trim();
    if (!val) return;
    if (!formData.serviceAreas.includes(val)) {
      setFormData((prev) => ({ ...prev, serviceAreas: [...prev.serviceAreas, val] }));
    }
    setCustomArea('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (formData.languages.length === 0) {
      setError('Please select at least one spoken language.');
      return;
    }
    if (formData.serviceAreas.length === 0) {
      setError('Please select at least one service district/area.');
      return;
    }
    if (Number(formData.dailyRate) <= 0) {
      setError('Daily service rate must be a positive amount in LKR.');
      return;
    }

    setSubmitting(true);
    try {
      const qualifications = formData.qualificationsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password || undefined,
        contactNumber: formData.contactNumber,
        profilePhoto: formData.profilePhoto,
        bio: formData.bio,
        languages: formData.languages,
        serviceAreas: formData.serviceAreas,
        expertise: formData.expertise,
        experienceYears: Number(formData.experienceYears) || 0,
        dailyRate: Number(formData.dailyRate),
        availability: formData.availability,
        availabilityNotes: formData.availabilityNotes,
        qualifications
      };

      const res = await api.post('/guides/register', payload);
      if (res.data?.token && setToken) {
        setToken(res.data.token);
      }
      setSuccessMsg('Tour Guide profile registered successfully! Redirecting to your Guide Dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to register tour guide');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link
          to="/guides"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft size={16} /> Back to Tour Guides Directory
        </Link>
      </div>

      <div className="bg-white rounded-3xl shadow-md border border-gray-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-8 text-white">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full text-amber-300 mb-3">
            <Sparkles size={14} /> Partner Guide Registration
          </div>
          <h1 className="text-3xl font-extrabold">Register as a Certified Tour Guide</h1>
          <p className="text-blue-200 text-sm mt-2 max-w-2xl">
            Publish your professional guide profile, showcase your spoken languages, service districts, and qualifications, and receive direct booking requests from local and international tourists.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-bold flex items-center gap-2">
              <CheckCircle2 size={18} /> {successMsg}
            </div>
          )}

          {/* 1. Personal & Account Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              <User size={18} className="text-blue-600" /> 1. Personal & Contact Details
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Nimal Bandara"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Contact Number (Phone / WhatsApp) *
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    placeholder="+94 77 123 4567"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    disabled={Boolean(user)}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="guide@dreamceylon.lk"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              {!user && (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Account Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <ImageUploader
              label="Profile Photograph"
              value={formData.profilePhoto}
              onChange={(url) => setFormData({ ...formData, profilePhoto: url })}
              multiple={false}
              category="guide"
            />

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                Short Biography & Guiding Style *
              </label>
              <textarea
                rows={3}
                required
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Describe your guiding background, local stories, and what makes your tours memorable..."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 2. Languages & Service Areas */}
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Globe size={18} className="text-blue-600" /> 2. Spoken Languages & Service Districts
            </h2>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                Languages Spoken *
              </label>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {COMMON_LANGUAGES.map((lang) => {
                  const active = formData.languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleArrayItem('languages', lang)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  placeholder="Add another language..."
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleAddCustomLanguage}
                  className="px-3 py-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700"
                >
                  + Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                Service Districts / Regions Covered *
              </label>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {SRI_LANKA_DISTRICTS.map((area) => {
                  const active = formData.serviceAreas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleArrayItem('serviceAreas', area)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <MapPin size={11} className="inline mr-1" />
                      {area}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                  placeholder="Add another district or region..."
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleAddCustomArea}
                  className="px-3 py-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700"
                >
                  + Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                Areas of Expertise
              </label>
              <div className="flex flex-wrap gap-2">
                {EXPERTISE_OPTIONS.map((exp) => {
                  const active = formData.expertise.includes(exp);
                  return (
                    <button
                      key={exp}
                      type="button"
                      onClick={() => toggleArrayItem('expertise', exp)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        active
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {exp}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Experience, Pricing & Qualifications */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Award size={18} className="text-blue-600" /> 3. Experience, Daily Rate & Qualifications
            </h2>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Years of Experience *
                </label>
                <div className="relative">
                  <Briefcase size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    max="60"
                    required
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Daily Service Rate (LKR) *
                </label>
                <div className="relative">
                  <DollarSign size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    min="500"
                    step="500"
                    required
                    value={formData.dailyRate}
                    onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Current Availability
                </label>
                <select
                  value={formData.availability ? 'true' : 'false'}
                  onChange={(e) =>
                    setFormData({ ...formData, availability: e.target.value === 'true' })
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">Available for New Bookings</option>
                  <option value="false">Temporarily Paused</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                Qualifications & Certifications (One per line)
              </label>
              <textarea
                rows={3}
                value={formData.qualificationsText}
                onChange={(e) => setFormData({ ...formData, qualificationsText: e.target.value })}
                placeholder="SLTDA National Tourist Guide License #NTG-1042&#10;First Aid & Wilderness Safety Certified"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                Availability Notes
              </label>
              <input
                type="text"
                value={formData.availabilityNotes}
                onChange={(e) => setFormData({ ...formData, availabilityNotes: e.target.value })}
                placeholder="e.g. Available daily across Cultural Triangle & Hill Country"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <Link
              to="/guides"
              className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold shadow-sm transition disabled:opacity-50"
            >
              <Compass size={16} />
              {submitting ? 'Publishing Guide Profile...' : 'Complete Guide Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuideRegister;

