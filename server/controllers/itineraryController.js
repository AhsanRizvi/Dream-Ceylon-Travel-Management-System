const TourPlan = require('../models/TourPlan');
const Destination = require('../models/Destination');
const { generateDayByDayItinerary } = require('../services/itineraryGenerator');

// @desc    Generate a day-by-day itinerary from selected or recommended destinations
// @route   POST /api/itineraries/generate
// @access  Private (Tourist, Admin)
exports.generateItinerary = async (req, res) => {
  try {
    const {
      destinations,
      stops,
      days = 3,
      startDate,
      preferences = {},
      preserveOrder = false,
      saveToDb = false,
      title,
      travelers = 2,
      costEstimate,
      routeData
    } = req.body;

    const inputStops = Array.isArray(destinations) && destinations.length > 0
      ? destinations
      : Array.isArray(stops)
        ? stops
        : [];

    if (inputStops.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please select at least one destination to generate an itinerary.'
      });
    }

    const tripDays = Number(days);
    if (!Number.isInteger(tripDays) || tripDays < 1 || tripDays > 30) {
      return res.status(400).json({
        success: false,
        error: 'Trip duration must be between 1 and 30 days.'
      });
    }

    const generated = await generateDayByDayItinerary({
      destinations: inputStops,
      days: tripDays,
      startDate,
      preferences,
      preserveOrder: Boolean(preserveOrder)
    });

    if (saveToDb) {
      const savedPlan = await TourPlan.create({
        touristId: req.user.id,
        title: title || `Sri Lanka ${tripDays}-Day Smart Itinerary`,
        days: generated.days,
        travelers: Number(travelers) || Number(preferences.travelers) || 2,
        stops: generated.stops,
        dates: generated.dates,
        transportType: preferences.transportation || preferences.transportType || 'Car',
        preferences: {
          mealType: preferences.mealType || 'All meat types',
          environments: preferences.environments || preferences.interests || [],
          interests: preferences.interests || preferences.environments || [],
          weatherPreference: preferences.weatherPreference || 'Cool',
          transportation: preferences.transportation || 'Car',
          guideRequirement: preferences.guideRequirement || 'Not required',
          packageLevel: preferences.packageLevel || 'Standard',
          selectedMealOption: preferences.selectedMealOption,
          selectedGuideOption: preferences.selectedGuideOption,
          addGuide: Boolean(preferences.addGuide)
        },
        dailyItinerary: generated.dailyItinerary,
        costEstimate: costEstimate || { baseTotal: 0, guideCost: 0, mealExtraCost: 0, grandTotal: 0 },
        routeData: routeData || generated.routeSummary,
        status: 'Saved'
      });

      const populated = await TourPlan.findById(savedPlan._id).populate('stops');
      return res.status(201).json({
        success: true,
        message: 'Itinerary generated and saved to your profile.',
        data: populated,
        routeSummary: generated.routeSummary
      });
    }

    res.status(200).json({
      success: true,
      data: {
        title: title || `Sri Lanka ${tripDays}-Day Smart Itinerary`,
        days: generated.days,
        travelers: Number(travelers) || Number(preferences.travelers) || 2,
        stops: generated.stops,
        orderedDestinations: generated.orderedDestinations,
        dates: generated.dates,
        transportType: preferences.transportation || preferences.transportType || 'Car',
        preferences,
        dailyItinerary: generated.dailyItinerary,
        routeSummary: generated.routeSummary
      }
    });
  } catch (error) {
    console.error('Error generating itinerary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Save a new itinerary (TourPlan)
// @route   POST /api/itineraries
// @access  Private (Tourist, Admin)
exports.createItinerary = async (req, res) => {
  try {
    const body = { ...req.body };
    body.touristId = req.user.id;

    // Extract stop ObjectIds if full destination objects were provided
    if (Array.isArray(body.stops)) {
      body.stops = body.stops
        .map((s) => (typeof s === 'object' && s !== null ? s._id || s.id : s))
        .filter(Boolean);
    }

    // Deduplicate stops
    if (Array.isArray(body.stops)) {
      body.stops = Array.from(new Set(body.stops.map((id) => id.toString())));
    }

    // If dailyItinerary is missing, auto-generate it
    if ((!body.dailyItinerary || body.dailyItinerary.length === 0) && body.stops?.length > 0) {
      const generated = await generateDayByDayItinerary({
        destinations: body.stops,
        days: body.days || 3,
        startDate: body.dates?.start || body.startDate,
        preferences: body.preferences || { transportation: body.transportType || 'Car' }
      });
      body.dailyItinerary = generated.dailyItinerary;
      body.dates = generated.dates;
    }

    // Ensure dates.start and dates.end are synchronized with dailyItinerary dates
    if (Array.isArray(body.dailyItinerary) && body.dailyItinerary.length > 0) {
      const firstDate = body.dailyItinerary[0].date;
      const lastDate = body.dailyItinerary[body.dailyItinerary.length - 1].date;
      if (firstDate) {
        body.dates = {
          start: new Date(firstDate),
          end: lastDate ? new Date(lastDate) : new Date(firstDate)
        };
      }
    }

    const plan = await TourPlan.create(body);
    const populated = await TourPlan.findById(plan._id).populate('stops');

    res.status(201).json({
      success: true,
      message: 'Itinerary saved successfully.',
      data: populated
    });
  } catch (error) {
    console.error('Error creating itinerary:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get all saved itineraries for the logged-in tourist
// @route   GET /api/itineraries
// @access  Private (Tourist, Admin)
exports.getItineraries = async (req, res) => {
  try {
    const query = { touristId: req.user.id };
    const plans = await TourPlan.find(query)
      .populate('stops')
      .sort({ updatedAt: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single itinerary by ID (private to owner)
// @route   GET /api/itineraries/:id
// @access  Private (Tourist, Admin)
exports.getItineraryById = async (req, res) => {
  try {
    const plan = await TourPlan.findById(req.params.id).populate('stops');
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Itinerary not found.' });
    }

    // Enforce privacy: only owner or admin can view
    if (plan.touristId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this private travel plan.'
      });
    }

    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Update itinerary (reorder, reschedule, add/remove destinations, or regenerate)
// @route   PUT /api/itineraries/:id
// @access  Private (Tourist, Admin)
exports.updateItinerary = async (req, res) => {
  try {
    let plan = await TourPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Itinerary not found.' });
    }

    // Enforce privacy: only owner or admin can update
    if (plan.touristId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this travel plan.'
      });
    }

    const updates = { ...req.body };
    delete updates.touristId; // Prevent changing owner

    if (Array.isArray(updates.stops)) {
      updates.stops = Array.from(
        new Set(
          updates.stops
            .map((s) => (typeof s === 'object' && s !== null ? s._id || s.id : s))
            .filter(Boolean)
            .map((id) => id.toString())
        )
      );
    }

    // If user requested full schedule regeneration
    if (updates.regenerate) {
      const targetStops = updates.stops || plan.stops;
      const targetDays = updates.days || plan.days;
      const targetStart = updates.startDate || updates.dates?.start || plan.dates?.start;
      const targetPrefs = updates.preferences || plan.preferences;

      const generated = await generateDayByDayItinerary({
        destinations: targetStops,
        days: targetDays,
        startDate: targetStart,
        preferences: targetPrefs,
        preserveOrder: Boolean(updates.preserveOrder)
      });

      updates.dailyItinerary = generated.dailyItinerary;
      updates.dates = generated.dates;
      updates.stops = generated.stops;
      updates.days = generated.days;
    } else if (Array.isArray(updates.dailyItinerary) && updates.dailyItinerary.length > 0) {
      // Synchronize dates if dailyItinerary dates were modified
      const sortedDays = [...updates.dailyItinerary].sort((a, b) => a.dayNumber - b.dayNumber);
      if (sortedDays[0]?.date) {
        updates.dates = {
          start: new Date(sortedDays[0].date),
          end: new Date(sortedDays[sortedDays.length - 1].date || sortedDays[0].date)
        };
      }
      // Also synchronize stops array from visit activities if stops wasn't explicitly passed
      if (!updates.stops) {
        const visitDestIds = [];
        for (const d of sortedDays) {
          for (const act of d.activities || []) {
            if (act.type === 'visit' && act.destinationId) {
              const idStr = act.destinationId.toString();
              if (!visitDestIds.includes(idStr)) {
                visitDestIds.push(idStr);
              }
            }
          }
        }
        if (visitDestIds.length > 0) {
          updates.stops = visitDestIds;
        }
      }
    }

    plan = await TourPlan.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('stops');

    res.status(200).json({
      success: true,
      message: 'Itinerary updated successfully.',
      data: plan
    });
  } catch (error) {
    console.error('Error updating itinerary:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete saved itinerary
// @route   DELETE /api/itineraries/:id
// @access  Private (Tourist, Admin)
exports.deleteItinerary = async (req, res) => {
  try {
    const plan = await TourPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Itinerary not found.' });
    }

    if (plan.touristId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this travel plan.'
      });
    }

    await TourPlan.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Itinerary deleted successfully.',
      data: {}
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

