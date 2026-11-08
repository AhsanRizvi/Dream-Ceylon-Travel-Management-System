const mongoose = require('mongoose');

/**
 * Dream Ceylon Tourism Management System
 * Destination Model
 * 
 * Represents popular Sri Lankan tourist destinations with geographic,
 * categorical, administrative, and travel metadata.
 */
const DestinationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Destination name is required'],
    trim: true,
    unique: true
  },
  description: { 
    type: String,
    required: [true, 'Description is required']
  },
  category: { 
    type: String, 
    required: [true, 'Category is required'],
    index: true
  },
  district: { 
    type: String, 
    required: [true, 'District is required'],
    index: true
  },
  province: { 
    type: String,
    index: true
  },
  location: { 
    type: String 
  },
  latitude: { 
    type: Number, 
    required: [true, 'Latitude coordinate is required'] 
  },
  longitude: { 
    type: Number, 
    required: [true, 'Longitude coordinate is required'] 
  },
  image: { 
    type: String 
  },
  imageUrl: { 
    type: String 
  },
  rating: { 
    type: Number, 
    min: 0, 
    max: 5,
    default: null
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  viewCount: { 
    type: Number, 
    default: 0 
  },
  lastViewedAt: {
    type: Date,
    default: null
  },
  bestVisitTime: { 
    type: String 
  },
  estimatedVisitDuration: { 
    type: String 
  },
  entryFee: { 
    type: String, 
    default: null 
  },
  tags: [{ 
    type: String,
    index: true
  }]
}, {
  timestamps: true
});

// Composite text index for full-text search across textual fields
DestinationSchema.index({
  name: 'text',
  description: 'text',
  district: 'text',
  province: 'text',
  location: 'text',
  tags: 'text'
});

module.exports = mongoose.model('Destination', DestinationSchema);
