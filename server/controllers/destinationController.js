const Destination = require('../models/Destination');
const { enrichDestinationMetadata } = require('../services/recommendationEngine');

exports.getDestinations = async (req, res) => {
  try {
    const { category, district, search } = req.query;
    let filter = {};

    if (category && category !== 'All') {
      const catLower = category.trim().toLowerCase();
      if (catLower === 'cultural' || catLower === 'historical') {
        filter.category = { $in: [/^cultural$/i, /^historical$/i] };
      } else if (catLower === 'mountain' || catLower === 'mountains') {
        filter.category = { $in: [/^mountain$/i, /^mountains$/i] };
      } else if (catLower === 'forest' || catLower === 'nature') {
        filter.category = { $in: [/^forest$/i, /^nature$/i] };
      } else {
        filter.category = new RegExp(`^${category}$`, 'i');
      }
    }
    if (district && district !== 'All') {
      filter.district = new RegExp(`^${district}$`, 'i');
    }
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { district: searchRegex },
        { category: searchRegex },
        { description: searchRegex }
      ];
    }

    const destinations = await Destination.find(filter);
    const enriched = destinations.map(d => enrichDestinationMetadata(d));
    res.status(200).json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('Error in getDestinations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getDestinationById = async (req, res) => {
  try {
    const destination = await Destination.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );
    if (!destination) return res.status(404).json({ success: false, error: 'Not found' });
    res.status(200).json({ success: true, data: enrichDestinationMetadata(destination) });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.createDestination = async (req, res) => {
  try {
    const destination = await Destination.create(req.body);
    res.status(201).json({ success: true, data: destination });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateDestination = async (req, res) => {
  try {
    const destination = await Destination.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!destination) return res.status(404).json({ success: false, error: 'Not found' });
    res.status(200).json({ success: true, data: destination });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteDestination = async (req, res) => {
  try {
    const destination = await Destination.findByIdAndDelete(req.params.id);
    if (!destination) return res.status(404).json({ success: false, error: 'Not found' });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
