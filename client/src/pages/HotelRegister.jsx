import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  Wifi,
  BedDouble,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ImageUploader from '../components/ImageUploader';

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
  'Negombo',
  'Jaffna'
];

const HOTEL_FACILITIES = [
  'Free Wi-Fi',
  'Swimming Pool',
  'Free Parking',
  'Restaurant & Dining',
  'Air Conditioning',
  'Ayurvedic Spa',
  'Airport Shuttle',
  'Fitness Center',
  '24-Hour Front Desk',
  'Mountain / Ocean View',
  'Room Service',
  'Tea / Garden Lounge'
];

const HotelRegister = () => {
  const { user, setToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    ownerName: '',
    email: '',
    password: '',
    contactNumber: '',
    name: '',
    description: '',
    district: 'Kandy',
    address: '',
    latitude: '7.2906',
    longitude: '80.6337',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    facilities: ['Free Wi-Fi', 'Swimming Pool', 'Free Parking', 'Restaurant & Dining', 'Air Conditioning'],
    photos: [],
    rooms: [
      {
        type: 'Deluxe Double Room',
        description: 'Spacious air-conditioned room with private balcony and modern amenities.',
        count: 8,
        capacity: 2,
        bedConfiguration: '1 King Bed',
        roomFacilitiesText: 'Air Conditioning, Free Wi-Fi, Private Balcony, Rain Shower',
        pricePerNight: 28000,
        availability: true
      }
    ]
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        ownerName: prev.ownerName || user.name || '',
        email: prev.email || user.email || ''
      }));
    }
  }, [user]);

  const toggleFacility = (fac) => {
    setFormData((prev) => {
      const exists = prev.facilities.includes(fac);
      return {
        ...prev,
        facilities: exists
          ? prev.facilities.filter((f) => f !== fac)
          : [...prev.facilities, fac]
      };
    });
  };

  const handleRoomChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.rooms];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, rooms: updated };
    });
  };

  const addRoomType = () => {
    setFormData((prev) => ({
      ...prev,
      rooms: [
        ...prev.rooms,
        {
          type: 'Family Suite',
          description: 'Interconnecting family suite ideal for up to 4 guests.',
          count: 4,
          capacity: 4,
          bedConfiguration: '1 King Bed + 2 Twin Beds',
          roomFacilitiesText: 'Air Conditioning, Free Wi-Fi, Living Area, Mini Bar',
          pricePerNight: 42000,
          availability: true
        }
      ]
    }));
  };

  const removeRoomType = (index) => {
    if (formData.rooms.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((_, idx) => idx !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formData.name.trim()) {
      setError('Hotel name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const formattedRooms = formData.rooms.map((r) => ({
        type: r.type.trim() || 'Standard Room',
        name: r.type.trim() || 'Standard Room',
        description: r.description,
        count: Math.max(1, Number(r.count) || 1),
        capacity: Math.max(1, Number(r.capacity) || 2),
        bedConfiguration: r.bedConfiguration || '1 Queen Bed',
        roomFacilities: String(r.roomFacilitiesText || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        pricePerNight: Math.max(1000, Number(r.pricePerNight) || 20000),
        availability: Boolean(r.availability)
      }));

      const minPrice = Math.min(...formattedRooms.map((r) => r.pricePerNight));

      const payload = {
        ownerName: formData.ownerName,
        email: formData.email,
        password: formData.password || undefined,
        contactNumber: formData.contactNumber,
        contactEmail: formData.email,
        name: formData.name,
        description: formData.description,
        district: formData.district,
        location: formData.district,
        address: formData.address,
        latitude: formData.latitude !== '' ? Number(formData.latitude) : null,
        longitude: formData.longitude !== '' ? Number(formData.longitude) : null,
        checkInTime: formData.checkInTime,
        checkOutTime: formData.checkOutTime,
        facilities: formData.facilities,
        photos: formData.photos,
        rooms: formattedRooms,
        pricePerNight: minPrice
      };

      const res = await api.post('/hotels/register', payload);
      if (res.data?.token && setToken) {
        setToken(res.data.token);
      }

      setSuccessMsg(
        'Hotel property registered successfully! Redirecting to your Hotel Owner Dashboard...'
      );
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to register hotel');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link
          to="/hotels"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft size={16} /> Back to Partner Hotels Directory
        </Link>
      </div>

      <div className="bg-white rounded-3xl shadow-md border border-gray-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-teal-900 p-8 text-white">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full text-amber-300 mb-3">
            <Sparkles size={14} /> Partner Property Registration
          </div>
          <h1 className="text-3xl font-extrabold">Register Your Hotel or Resort</h1>
          <p className="text-blue-200 text-sm mt-2 max-w-2xl">
            List your hotel, boutique villa, or eco-lodge on Smart Lanka. Manage room inventory, nightly rates, facilities, and incoming tourist reservations from your Hotel Owner Dashboard.
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

          {/* 1. Hotel Owner & Contact Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              <User size={18} className="text-blue-600" /> 1. Hotel Owner & Account Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Owner / Hospitality Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  placeholder="e.g. Serendib Boutique Hospitality"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Reservation / Contact Number *
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    placeholder="+94 81 223 4567"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Official Email Address *
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    disabled={Boolean(user)}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="reservations@yourhotel.lk"
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
          </div>

          {/* 2. Property Details, Location & Photographs */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Building2 size={18} className="text-blue-600" /> 2. Property Details, Location & Photos
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Hotel / Resort Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Kandy Lake View Heritage Resort"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  District / City *
                </label>
                <select
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                >
                  {SRI_LANKA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                Street Address *
              </label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. 48 Sangaraja Mawatha, Kandy 20000"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="7.2906"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="80.6337"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Check-In Time
                </label>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.checkInTime}
                    onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                    placeholder="14:00"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Check-Out Time
                </label>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.checkOutTime}
                    onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                    placeholder="11:00"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                Property Description *
              </label>
              <textarea
                rows={3}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your hotel ambiance, views, nearby attractions, and hospitality highlights..."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <ImageUploader
              label="Hotel Photographs"
              value={formData.photos}
              onChange={(urls) => setFormData({ ...formData, photos: urls })}
              multiple={true}
              category="hotel"
            />

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                Available Hotel Facilities
              </label>
              <div className="flex flex-wrap gap-2">
                {HOTEL_FACILITIES.map((fac) => {
                  const active = formData.facilities.includes(fac);
                  return (
                    <button
                      key={fac}
                      type="button"
                      onClick={() => toggleFacility(fac)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Wifi size={11} className="inline mr-1" />
                      {fac}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Initial Room Types Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BedDouble size={18} className="text-blue-600" /> 3. Room Types & Nightly Pricing (LKR)
              </h2>
              <button
                type="button"
                onClick={addRoomType}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl transition"
              >
                <Plus size={14} /> Add Another Room Type
              </button>
            </div>

            <div className="space-y-4">
              {formData.rooms.map((room, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                      Room Category #{idx + 1}
                    </span>
                    {formData.rooms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRoomType(idx)}
                        className="text-xs font-bold text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                        Room Type / Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={room.type}
                        onChange={(e) => handleRoomChange(idx, 'type', e.target.value)}
                        placeholder="e.g. Deluxe Ocean View"
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                        Price per Night (LKR) *
                      </label>
                      <input
                        type="number"
                        min="1000"
                        step="500"
                        required
                        value={room.pricePerNight}
                        onChange={(e) => handleRoomChange(idx, 'pricePerNight', e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                        Bed Configuration
                      </label>
                      <input
                        type="text"
                        value={room.bedConfiguration}
                        onChange={(e) => handleRoomChange(idx, 'bedConfiguration', e.target.value)}
                        placeholder="1 King Bed"
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                        Number of Rooms Available *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        required
                        value={room.count}
                        onChange={(e) => handleRoomChange(idx, 'count', e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                        Max Guests per Room *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        required
                        value={room.capacity}
                        onChange={(e) => handleRoomChange(idx, 'capacity', e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                        Room Amenities (Comma separated)
                      </label>
                      <input
                        type="text"
                        value={room.roomFacilitiesText}
                        onChange={(e) =>
                          handleRoomChange(idx, 'roomFacilitiesText', e.target.value)
                        }
                        placeholder="AC, Balcony, Wi-Fi"
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                      Room Description
                    </label>
                    <input
                      type="text"
                      value={room.description}
                      onChange={(e) => handleRoomChange(idx, 'description', e.target.value)}
                      placeholder="Brief description of room view and features..."
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <Link
              to="/hotels"
              className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold shadow-sm transition disabled:opacity-50"
            >
              <Building2 size={16} />
              {submitting ? 'Publishing Property...' : 'Complete Hotel Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HotelRegister;

