const Destination = require('../models/Destination');

/**
 * Dream Ceylon Tourism Management System
 * Destination Controller
 */

// Get all destinations with multi-faceted filtering and search
exports.getDestinations = async (req, res) => {
  try {
    const { category, district, province, tag, search, sort } = req.query;
    let filter = {};

    // Category filter (handles category aliases and case-insensitivity)
    if (category && category !== 'All') {
      if (category.toLowerCase() === 'historical' || category.toLowerCase() === 'cultural') {
        filter.category = { $in: [/^historical/i, /^cultural/i] };
      } else if (category.toLowerCase() === 'wildlife' || category.toLowerCase() === 'nature') {
        filter.category = { $in: [/^wildlife/i, /^nature/i, /^forest/i] };
      } else {
        filter.category = new RegExp(`^${category}$`, 'i');
      }
    }

    // District filter
    if (district && district !== 'All') {
      filter.district = new RegExp(`^${district}$`, 'i');
    }

    // Province filter
    if (province && province !== 'All') {
      filter.province = new RegExp(`^${province}$`, 'i');
    }

    // Tag / Interest filter
    if (tag && tag !== 'All') {
      filter.tags = new RegExp(`^${tag}$`, 'i');
    }

    // Keyword search across title, district, province, location, description, and tags
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { district: searchRegex },
        { province: searchRegex },
        { location: searchRegex },
        { category: searchRegex },
        { description: searchRegex },
        { tags: searchRegex }
      ];
    }

    // Sorting options
    let sortOption = { rating: -1, viewCount: -1 };
    if (sort === 'name-asc') sortOption = { name: 1 };
    if (sort === 'name-desc') sortOption = { name: -1 };
    if (sort === 'views') sortOption = { viewCount: -1 };
    if (sort === 'rating') sortOption = { rating: -1 };

    const destinations = await Destination.find(filter).sort(sortOption);

    res.status(200).json({ 
      success: true, 
      count: destinations.length, 
      data: destinations 
    });
  } catch (err) {
    console.error('Error in getDestinations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Retrieve distinct categories, districts, and provinces for dynamic filter options
exports.getFilterMetadata = async (req, res) => {
  try {
    const [categories, districts, provinces, totalCount] = await Promise.all([
      Destination.distinct('category'),
      Destination.distinct('district'),
      Destination.distinct('province'),
      Destination.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      data: {
        categories: categories.filter(Boolean).sort(),
        districts: districts.filter(Boolean).sort(),
        provinces: provinces.filter(Boolean).sort(),
        totalCount
      }
    });
  } catch (err) {
    console.error('Error in getFilterMetadata:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get single destination by ID (and track view counts)
exports.getDestinationById = async (req, res) => {
  try {
    const destination = await Destination.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    if (!destination) {
      return res.status(404).json({ success: false, error: 'Destination not found' });
    }

    res.status(200).json({ success: true, data: destination });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Create a new destination (Admin)
exports.createDestination = async (req, res) => {
  try {
    const destination = await Destination.create(req.body);
    res.status(201).json({ success: true, data: destination });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Update existing destination (Admin)
exports.updateDestination = async (req, res) => {
  try {
    const destination = await Destination.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!destination) return res.status(404).json({ success: false, error: 'Destination not found' });
    res.status(200).json({ success: true, data: destination });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Delete destination (Admin)
exports.deleteDestination = async (req, res) => {
  try {
    const destination = await Destination.findByIdAndDelete(req.params.id);
    if (!destination) return res.status(404).json({ success: false, error: 'Destination not found' });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
