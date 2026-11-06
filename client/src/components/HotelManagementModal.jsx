import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Save, Building2, MapPin, DollarSign, Phone, Image as ImageIcon, Plus, Trash2, BedDouble, Wifi } from 'lucide-react';
import api from '../services/api';

const COMMON_FACILITIES = [
  'Free Wi-Fi',
  'Swimming Pool',
  'Ayurvedic Spa',
  'Restaurant & Dining',
  'Air Conditioning',
  'Free Parking',
  'Beach Access',
  'Mountain View',
  'Fitness Center',
  'Airport Shuttle'
];

const HotelManagementModal = ({ isOpen, onClose, onHotelSaved, hotelToEdit = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    phone: '',
    pricePerNight: '',
    image: '',
    facilities: [],
    rooms: [
      { type: 'Deluxe Room', capacity: 2, count: 5, price: 100 }
    ],
    availability: true
  });

  const [customFacility, setCustomFacility] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSuccess('');

    if (hotelToEdit) {
      setFormData({
        name: hotelToEdit.name || '',
        location: hotelToEdit.location || '',
        description: hotelToEdit.description || '',
        phone: hotelToEdit.phone || '',
        pricePerNight: hotelToEdit.pricePerNight !== undefined ? String(hotelToEdit.pricePerNight) : '100',
        image: hotelToEdit.image || hotelToEdit.imageUrl || '',
        facilities: Array.isArray(hotelToEdit.facilities) ? [...hotelToEdit.facilities] : [],
        rooms: Array.isArray(hotelToEdit.rooms) && hotelToEdit.rooms.length > 0
          ? hotelToEdit.rooms.map(r => ({
              type: r.type || 'Standard Room',
              capacity: r.capacity || 2,
              count: r.count || 1,
              price: r.price || hotelToEdit.pricePerNight || 100
            }))
          : [{ type: 'Deluxe Room', capacity: 2, count: 5, price: 100 }],
        availability: hotelToEdit.availability !== undefined ? hotelToEdit.availability : true
      });
    } else {
      // Default clean form for new hotel
      setFormData({
        name: '',
        location: '',
        description: '',
        phone: '',
        pricePerNight: '120',
        image: '',
        facilities: ['Free Wi-Fi', 'Swimming Pool', 'Air Conditioning'],
        rooms: [
          { type: 'Superior Deluxe', capacity: 2, count: 8, price: 120 }
        ],
        availability: true
      });
    }
  }, [isOpen, hotelToEdit]);

  const toggleFacility = (facility) => {
    setFormData(prev => {
      const exists = prev.facilities.includes(facility);
      return {
        ...prev,
        facilities: exists
          ? prev.facilities.filter(f => f !== facility)
          : [...prev.facilities, facility]
      };
    });
  };

  const handleAddCustomFacility = () => {
    if (!customFacility.trim()) return;
    if (!formData.facilities.includes(customFacility.trim())) {
      setFormData(prev => ({
        ...prev,
        facilities: [...prev.facilities, customFacility.trim()]
      }));
    }
    setCustomFacility('');
  };

  const handleAddRoom = () => {
    setFormData(prev => ({
      ...prev,
      rooms: [
        ...prev.rooms,
        { type: 'Standard Room', capacity: 2, count: 2, price: Number(prev.pricePerNight) || 100 }
      ]
    }));
  };

  const handleRemoveRoom = (idx) => {
    setFormData(prev => ({
      ...prev,
      rooms: prev.rooms.filter((_, i) => i !== idx)
    }));
  };

  const handleRoomChange = (idx, field, val) => {
    setFormData(prev => {
      const updatedRooms = [...prev.rooms];
      updatedRooms[idx] = {
        ...updatedRooms[idx],
        [field]: val
      };
      return { ...prev, rooms: updatedRooms };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Hotel name is required.');
      return;
    }
    if (!formData.location.trim()) {
      setError('Hotel location / district is required.');
      return;
    }
    const priceNum = Number(formData.pricePerNight);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Please provide a valid price per night ($0 or more).');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        description: formData.description.trim(),
        phone: formData.phone.trim(),
        pricePerNight: priceNum,
        image: formData.image.trim(),
        imageUrl: formData.image.trim(),
        facilities: formData.facilities,
        rooms: formData.rooms.map(r => ({
          type: r.type.trim() || 'Standard Room',
          capacity: Math.max(1, parseInt(r.capacity) || 2),
          count: Math.max(1, parseInt(r.count) || 1),
          price: Number(r.price) || priceNum
        })),
        availability: formData.availability
      };

      let res;
      if (hotelToEdit?._id) {
        res = await api.put(`/hotels/${hotelToEdit._id}`, payload);
        setSuccess('Hotel information updated successfully!');
      } else {
        res = await api.post('/hotels', payload);
        setSuccess('New hotel registered successfully!');
      }

      if (onHotelSaved) {
        onHotelSaved(res.data?.data);
      }

      setTimeout(() => {
        if (isOpen) {
          onClose();
        }
      }, 1200);

    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save hotel.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300 bg-blue-800/60 px-3 py-1 rounded-full border border-blue-400/30">
              Module 4 • Hotel Management
            </span>
            <h2 className="text-2xl font-extrabold text-white">
              {hotelToEdit ? `Edit Hotel: ${hotelToEdit.name}` : 'Register New Partner Hotel'}
            </h2>
            <p className="text-xs text-blue-200">
              Manage your hotel property information, room inventory, guest amenities, and nightly pricing.
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

          <form id="hotel-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Core Details */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 flex items-center gap-1">
                  <Building2 size={13} className="text-blue-600" /> Hotel / Property Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cinnamon Citadel Kandy"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 flex items-center gap-1">
                  <MapPin size={13} className="text-blue-600" /> City / Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Kandy, Central Province"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Pricing, Phone & Image */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 flex items-center gap-1">
                  <DollarSign size={13} className="text-green-600" /> Base Price / Night (USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formData.pricePerNight}
                    onChange={(e) => setFormData({ ...formData, pricePerNight: e.target.value })}
                    placeholder="120"
                    className="w-full pl-8 pr-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 flex items-center gap-1">
                  <Phone size={13} className="text-blue-600" /> Contact Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +94 81 223 4567"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 flex items-center gap-1">
                  <ImageIcon size={13} className="text-blue-600" /> Hotel Photo URL
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

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                Property Overview & Guest Atmosphere
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Highlight your hotel's scenic views, nearby attractions, dining options, and guest service..."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 leading-relaxed"
              />
            </div>

            {/* Room Management Section */}
            <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-800 uppercase flex items-center gap-1.5">
                  <BedDouble size={15} className="text-blue-600" /> Room Categories & Capacity
                </span>
                <button
                  type="button"
                  onClick={handleAddRoom}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                >
                  <Plus size={13} /> Add Room Type
                </button>
              </div>

              {formData.rooms.map((room, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-xl border border-gray-200">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Room Type (e.g. Deluxe Suite)"
                      value={room.type}
                      onChange={(e) => handleRoomChange(idx, 'type', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Guests"
                      title="Guest Capacity"
                      value={room.capacity}
                      onChange={(e) => handleRoomChange(idx, 'capacity', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Rooms"
                      title="Available Count"
                      value={room.count}
                      onChange={(e) => handleRoomChange(idx, 'count', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Rate"
                        title="Room Rate / Night"
                        value={room.price || ''}
                        onChange={(e) => handleRoomChange(idx, 'price', e.target.value)}
                        className="w-full pl-5 pr-2 py-1.5 text-xs border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 text-center">
                    {formData.rooms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRoom(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Facilities Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700 uppercase flex items-center gap-1">
                <Wifi size={13} className="text-blue-600" /> Amenities & Facilities
              </label>

              <div className="flex flex-wrap gap-2">
                {COMMON_FACILITIES.map((fac) => {
                  const isChecked = formData.facilities.includes(fac);
                  return (
                    <button
                      type="button"
                      key={fac}
                      onClick={() => toggleFacility(fac)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {isChecked && <CheckCircle size={12} />}
                      {fac}
                    </button>
                  );
                })}
              </div>

              {/* Custom Facility input */}
              <div className="flex gap-2 max-w-sm pt-1">
                <input
                  type="text"
                  placeholder="Add custom facility (e.g. Helipad)..."
                  value={customFacility}
                  onChange={(e) => setCustomFacility(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomFacility(); } }}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleAddCustomFacility}
                  className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-gray-900 block">Property Availability Status</span>
                <span className="text-xs text-gray-500">
                  When enabled, tourists can view and book rooms at this property.
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
            form="hotel-form"
            disabled={saving}
            className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Save size={14} />
            {saving ? 'Saving Property...' : hotelToEdit ? 'Save Changes' : 'Register Hotel'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default HotelManagementModal;

