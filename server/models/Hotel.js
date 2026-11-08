const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  type: { type: String, required: [true, 'Room type or name is required'], trim: true },
  name: { type: String, trim: true },
  description: { type: String, trim: true, default: '' },
  capacity: { type: Number, required: [true, 'Room maximum occupancy is required'], min: 1, default: 2 },
  count: { type: Number, required: [true, 'Number of rooms is required'], min: 1, default: 1 },
  bedConfiguration: { type: String, trim: true, default: '1 Queen Bed' },
  roomFacilities: [{ type: String, trim: true }],
  pricePerNight: { type: Number, min: 0 },
  photos: [{ type: String }],
  availability: { type: Boolean, default: true }
});

const HotelSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Hotel details
  ownerName: { type: String, trim: true },
  contactEmail: { type: String, trim: true },
  contactNumber: { type: String, trim: true, default: '' },

  name: {
    type: String,
    required: [true, 'Hotel name is required'],
    trim: true
  },

  district: { type: String, trim: true },

  location: {
    type: String,
    required: [true, 'Hotel location/district is required'],
    trim: true
  },

  address: { type: String, trim: true, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },

  description: { type: String, trim: true, default: '' },
  photos: [{ type: String }],

  // Room details
  rooms: [RoomSchema],

  // Facilities
  facilities: [{ type: String, trim: true }],

  // Check-in and check-out
  checkInTime: { type: String, default: '14:00' },
  checkOutTime: { type: String, default: '11:00' },

  // Currency and pricing
  currency: { type: String, default: 'LKR' },

  pricePerNight: {
    type: Number,
    required: [true, 'Starting price per night is required'],
    min: 0
  },

  availability: { type: Boolean, default: true },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, default: 0 }
}, { timestamps: true });

HotelSchema.pre('save', function(next) {
  if (!this.district && this.location) {
    this.district = this.location;
  }
  if (!this.location && this.district) {
    this.location = this.district;
  }
  // Automatically sync starting pricePerNight from lowest priced available room if rooms have prices
  if (Array.isArray(this.rooms) && this.rooms.length > 0) {
    const validPrices = this.rooms
      .map((r) => Number(r.pricePerNight))
      .filter((p) => !isNaN(p) && p > 0);
    if (validPrices.length > 0) {
      this.pricePerNight = Math.min(...validPrices);
    }
  }
  next();
});

HotelSchema.index({ ownerId: 1 });
HotelSchema.index({ location: 1, district: 1 });

module.exports = mongoose.model('Hotel', HotelSchema);
