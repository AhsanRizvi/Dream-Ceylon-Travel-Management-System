const jwt = require('jsonwebtoken');
const TourPlan = require('../models/TourPlan');
const User = require('../models/User');
const { getHolidays } = require('../services/holidayService');

/**
 * Helper: format Date object to YYYY-MM-DD in local/UTC consistent format
 */
const toDateKey = (dateInput) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// @desc    Get official Sri Lankan public holidays
// @route   GET /api/holidays
// @access  Public
exports.getHolidaysList = async (req, res) => {
  try {
    const { year, month } = req.query;
    const holidays = await getHolidays({ year, month });

    res.status(200).json({
      success: true,
      count: holidays.length,
      data: holidays.map((h) => ({
        ...h,
        dateKey: new Date(h.date).toISOString().split('T')[0]
      }))
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get calendar view data (Sri Lankan holidays + tourist's scheduled itinerary activities for a month)
// @route   GET /api/calendar/:year/:month
// @access  Public / Optional Auth (returns user's private plans when authenticated)
exports.getCalendarMonth = async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);

    if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid year and month (1-12).'
      });
    }

    // 1. Fetch Sri Lankan public holidays for the requested year & month
    const holidays = await getHolidays({ year, month });
    const formattedHolidays = holidays.map((h) => ({
      ...h,
      dateKey: new Date(h.date).toISOString().split('T')[0]
    }));

    // 2. Check if user is authenticated (via req.user or Bearer token)
    let userId = req.user?.id || null;
    if (!userId && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const userDoc = await User.findById(decoded.id);
        if (userDoc) userId = userDoc._id;
      } catch (e) {
        // Proceed with public holidays if token is invalid/expired
      }
    }

    const scheduledDays = [];
    let totalUserPlans = 0;

    if (userId) {
      const userPlans = await TourPlan.find({ touristId: userId })
        .populate('stops')
        .sort({ createdAt: -1 });

      totalUserPlans = userPlans.length;

      for (const plan of userPlans) {
        if (Array.isArray(plan.dailyItinerary) && plan.dailyItinerary.length > 0) {
          for (const dayItem of plan.dailyItinerary) {
            if (!dayItem.date) continue;
            const dObj = new Date(dayItem.date);
            const dYear = dObj.getFullYear();
            const dMonth = dObj.getMonth() + 1;

            if (dYear === year && dMonth === month) {
              scheduledDays.push({
                planId: plan._id,
                planTitle: plan.title || 'Sri Lanka Tour Plan',
                packageLevel: plan.preferences?.packageLevel || 'Standard',
                transportType: plan.transportType || 'Car',
                travelers: plan.travelers || 2,
                dayNumber: dayItem.dayNumber,
                date: dayItem.date,
                dateKey: toDateKey(dayItem.date),
                dayTitle: dayItem.title,
                districtFocus: dayItem.districtFocus,
                totalActivityHours: dayItem.totalActivityHours,
                activities: dayItem.activities || []
              });
            }
          }
        } else if (plan.dates?.start) {
          // Legacy TourPlan fallback if dailyItinerary was not populated
          const start = new Date(plan.dates.start);
          const daysCount = plan.days || 1;
          for (let i = 0; i < daysCount; i++) {
            const cur = new Date(start);
            cur.setDate(start.getDate() + i);
            if (cur.getFullYear() === year && cur.getMonth() + 1 === month) {
              const stopObj = plan.stops?.[i] || plan.stops?.[0];
              scheduledDays.push({
                planId: plan._id,
                planTitle: plan.title || 'Sri Lanka Tour Plan',
                packageLevel: plan.preferences?.packageLevel || 'Standard',
                transportType: plan.transportType || 'Car',
                travelers: plan.travelers || 2,
                dayNumber: i + 1,
                date: cur,
                dateKey: toDateKey(cur),
                dayTitle: `Day ${i + 1}: ${stopObj?.name || 'Tour Activity'}`,
                districtFocus: stopObj?.district || 'Sri Lanka',
                totalActivityHours: 4,
                activities: stopObj
                  ? [
                      {
                        activityId: `legacy-${plan._id}-${i}`,
                        type: 'visit',
                        title: `Visit ${stopObj.name}`,
                        destinationId: stopObj._id,
                        destinationName: stopObj.name,
                        district: stopObj.district,
                        category: stopObj.category,
                        startTime: '08:30 AM',
                        endTime: '12:30 PM',
                        durationMinutes: 240,
                        description: stopObj.description
                      }
                    ]
                  : []
              });
            }
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        year,
        month,
        holidays: formattedHolidays,
        scheduledDays,
        totalUserPlans
      }
    });
  } catch (error) {
    console.error('Error fetching calendar month:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

