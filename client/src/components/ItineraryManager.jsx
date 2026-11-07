import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Car,
  Utensils,
  Compass,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit3,
  Plus,
  RefreshCw,
  Save,
  CheckCircle2,
  Info,
  Eye,
  X,
  Navigation,
  Sparkles
} from 'lucide-react';
import MapView from './MapView';

const ItineraryManager = ({
  itineraryData,
  setItineraryData,
  allDestinations = [],
  preferences = {},
  routeCoordinates = [],
  totalDistance = '',
  totalDuration = '',
  loadingRoute = false,
  saving = false,
  regenerating = false,
  onSaveItinerary,
  onRegenerateItinerary,
  onOpenCalendar
}) => {
  const [activeDayFilter, setActiveDayFilter] = useState('all');
  const [editingActivity, setEditingActivity] = useState(null); // { dayNumber, actIndex, activity }
  const [viewingActivity, setViewingActivity] = useState(null);
  const [addingToDay, setAddingToDay] = useState(null); // dayNumber
  const [newActForm, setNewActForm] = useState({
    mode: 'destination', // 'destination' | 'custom'
    destinationId: '',
    type: 'visit',
    title: '',
    startTime: '03:00 PM',
    endTime: '05:00 PM',
    durationMinutes: 120,
    description: '',
    notes: ''
  });

  if (!itineraryData || !Array.isArray(itineraryData.dailyItinerary)) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
        <CalendarIcon size={44} className="mx-auto text-gray-400 mb-3" />
        <h3 className="text-xl font-bold text-gray-800">No Active Itinerary Generated Yet</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
          Select your preferred destinations in the Recommendations tab and click "Generate Day-by-Day Itinerary" to build your smart schedule.
        </p>
      </div>
    );
  }

  const dailyList = itineraryData.dailyItinerary;

  // Collect all destination IDs already visited in the itinerary to prevent duplicate destination assignment
  const visitedDestinationIds = new Set();
  dailyList.forEach((d) => {
    (d.activities || []).forEach((act) => {
      if (act.destinationId) visitedDestinationIds.add(act.destinationId.toString());
    });
  });

  const availableToAddDestinations = allDestinations.filter(
    (d) => !visitedDestinationIds.has(d._id.toString())
  );

  // Move activity up or down within a day
  const handleMoveActivity = (dayNumber, index, direction) => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updatedDays = dailyList.map((day) => {
      if (day.dayNumber !== dayNumber) return day;
      const acts = [...(day.activities || [])];
      if (targetIdx < 0 || targetIdx >= acts.length) return day;

      // Swap time slots so times stay chronological when reordering activities!
      const tempStart = acts[index].startTime;
      const tempEnd = acts[index].endTime;
      acts[index] = {
        ...acts[index],
        startTime: acts[targetIdx].startTime,
        endTime: acts[targetIdx].endTime
      };
      acts[targetIdx] = {
        ...acts[targetIdx],
        startTime: tempStart,
        endTime: tempEnd
      };

      const swapped = acts[index];
      acts[index] = acts[targetIdx];
      acts[targetIdx] = swapped;

      return { ...day, activities: acts };
    });

    setItineraryData({ ...itineraryData, dailyItinerary: updatedDays });
  };

  // Move activity to another day
  const handleMoveActivityToDay = (fromDayNum, actIndex, toDayNum) => {
    const targetDayNumber = Number(toDayNum);
    if (fromDayNum === targetDayNumber) return;

    let movedActivity = null;
    const afterRemove = dailyList.map((day) => {
      if (day.dayNumber !== fromDayNum) return day;
      const acts = [...(day.activities || [])];
      movedActivity = acts.splice(actIndex, 1)[0];
      return { ...day, activities: acts };
    });

    if (!movedActivity) return;

    const afterAdd = afterRemove.map((day) => {
      if (day.dayNumber !== targetDayNumber) return day;
      return {
        ...day,
        activities: [...(day.activities || []), movedActivity]
      };
    });

    setItineraryData({ ...itineraryData, dailyItinerary: afterAdd });
  };

  // Remove activity from a day
  const handleRemoveActivity = (dayNumber, actIndex) => {
    const updatedDays = dailyList.map((day) => {
      if (day.dayNumber !== dayNumber) return day;
      const acts = (day.activities || []).filter((_, i) => i !== actIndex);
      return { ...day, activities: acts };
    });

    setItineraryData({ ...itineraryData, dailyItinerary: updatedDays });
  };

  // Change date of a specific day (and cascade subsequent days)
  const handleDayDateChange = (dayNumber, newDateStr) => {
    if (!newDateStr) return;
    const selectedDate = new Date(`${newDateStr}T00:00:00`);
    if (Number.isNaN(selectedDate.getTime())) return;

    const updatedDays = dailyList.map((day) => {
      const diffDays = day.dayNumber - dayNumber;
      const d = new Date(selectedDate);
      d.setDate(selectedDate.getDate() + diffDays);
      return { ...day, date: d.toISOString() };
    });

    const newStart = updatedDays[0]?.date;
    const newEnd = updatedDays[updatedDays.length - 1]?.date;

    setItineraryData({
      ...itineraryData,
      dates: { start: newStart, end: newEnd },
      dailyItinerary: updatedDays
    });
  };

  // Save edited activity (reschedule time, notes, title)
  const handleSaveEditedActivity = (e) => {
    e.preventDefault();
    if (!editingActivity) return;
    const { dayNumber, actIndex, activity } = editingActivity;

    const updatedDays = dailyList.map((day) => {
      if (day.dayNumber !== dayNumber) return day;
      const acts = [...(day.activities || [])];
      acts[actIndex] = { ...activity };
      return { ...day, activities: acts };
    });

    setItineraryData({ ...itineraryData, dailyItinerary: updatedDays });
    setEditingActivity(null);
  };

  // Add a destination or custom activity to a day
  const handleAddActivitySubmit = (e) => {
    e.preventDefault();
    if (!addingToDay) return;

    let newActivity = null;
    if (newActForm.mode === 'destination') {
      const dest = allDestinations.find((d) => d._id === newActForm.destinationId);
      if (!dest) return;
      newActivity = {
        activityId: `custom-visit-${dest._id}-${Date.now()}`,
        type: 'visit',
        title: `Visit ${dest.name}`,
        destinationId: dest._id,
        destinationName: dest.name,
        district: dest.district,
        category: dest.category,
        image: dest.image || dest.imageUrl,
        latitude: dest.latitude,
        longitude: dest.longitude,
        startTime: newActForm.startTime || '03:00 PM',
        endTime: newActForm.endTime || '05:30 PM',
        durationMinutes: Number(newActForm.durationMinutes) || 150,
        bestVisitTime: dest.bestVisitTime || 'Morning',
        openingHours: dest.openingHours || '06:00 AM - 06:00 PM',
        isEstimatedTravel: false,
        description: dest.description,
        notes: newActForm.notes || `Added destination stop in ${dest.district}`
      };
    } else {
      if (!newActForm.title.trim()) return;
      newActivity = {
        activityId: `custom-act-${Date.now()}`,
        type: newActForm.type || 'visit',
        title: newActForm.title.trim(),
        destinationId: null,
        destinationName: newActForm.title.trim(),
        district: 'Sri Lanka',
        category: 'Custom Activity',
        startTime: newActForm.startTime || '03:00 PM',
        endTime: newActForm.endTime || '04:30 PM',
        durationMinutes: Number(newActForm.durationMinutes) || 90,
        isEstimatedTravel: false,
        description: newActForm.description || 'Custom scheduled activity.',
        notes: newActForm.notes || ''
      };
    }

    const updatedDays = dailyList.map((day) => {
      if (day.dayNumber !== addingToDay) return day;
      return {
        ...day,
        activities: [...(day.activities || []), newActivity]
      };
    });

    setItineraryData({ ...itineraryData, dailyItinerary: updatedDays });
    setAddingToDay(null);
    setNewActForm({
      mode: 'destination',
      destinationId: '',
      type: 'visit',
      title: '',
      startTime: '03:00 PM',
      endTime: '05:00 PM',
      durationMinutes: 120,
      description: '',
      notes: ''
    });
  };

  const getActivityBadge = (type) => {
    switch (type) {
      case 'visit':
        return {
          label: 'Destination Visit',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-600',
          icon: <Compass size={15} className="text-blue-600" />
        };
      case 'travel':
        return {
          label: 'Overland Transfer',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          icon: <Car size={15} className="text-amber-600" />
        };
      case 'meal':
        return {
          label: 'Dining Break',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: <Utensils size={15} className="text-emerald-600" />
        };
      default:
        return {
          label: 'Leisure & Regional',
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          dot: 'bg-purple-500',
          icon: <Sparkles size={15} className="text-purple-600" />
        };
    }
  };

  const visibleDays =
    activeDayFilter === 'all'
      ? dailyList
      : dailyList.filter((d) => d.dayNumber === Number(activeDayFilter));

  // Extract ordered unique destinations from current dailyItinerary for MapView
  const activeStopDestinations = [];
  const seenMapIds = new Set();
  dailyList.forEach((d) => {
    (d.activities || []).forEach((act) => {
      if (act.type === 'visit' && act.latitude && act.longitude) {
        const key = (act.destinationId || act.title).toString();
        if (!seenMapIds.has(key)) {
          seenMapIds.add(key);
          activeStopDestinations.push({
            _id: act.destinationId,
            name: act.destinationName || act.title,
            district: act.district,
            category: act.category,
            latitude: act.latitude,
            longitude: act.longitude,
            rating: 4.8
          });
        }
      }
    });
  });

  return (
    <div className="space-y-8">
      {/* Top Action & Title Bar */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white p-6 md:p-8 rounded-3xl shadow-lg flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1.5 flex-grow">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full border border-blue-400/30">
              Smart Day-by-Day Schedule
            </span>
            <span className="text-xs text-blue-200">
              {itineraryData.days || dailyList.length} Days •{' '}
              {itineraryData.travelers || preferences.travelers || 2} Travellers •{' '}
              {preferences.transportation || itineraryData.transportType || 'Car'}
            </span>
          </div>
          <input
            type="text"
            value={itineraryData.title || 'Personalized Sri Lanka Tour Plan'}
            onChange={(e) => setItineraryData({ ...itineraryData, title: e.target.value })}
            className="bg-transparent border-b border-blue-400/40 focus:border-yellow-400 text-2xl md:text-3xl font-extrabold text-white focus:outline-none w-full max-w-xl py-0.5"
            placeholder="Enter your trip title..."
          />
          <p className="text-xs text-blue-200">
            Click any activity to reschedule times, reorder stops, add destinations, or save to your profile.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRegenerateItinerary}
            disabled={regenerating}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-semibold text-xs flex items-center gap-2 transition"
          >
            <RefreshCw size={15} className={regenerating ? 'animate-spin' : ''} />
            {regenerating ? 'Regenerating...' : 'Regenerate Schedule'}
          </button>

          {onOpenCalendar && (
            <button
              type="button"
              onClick={onOpenCalendar}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow"
            >
              <CalendarIcon size={15} /> View on Calendar
            </button>
          )}

          <button
            type="button"
            onClick={onSaveItinerary}
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg transition"
          >
            <Save size={15} />
            {saving
              ? 'Saving...'
              : itineraryData._id
                ? 'Update Saved Itinerary'
                : 'Save Itinerary'}
          </button>
        </div>
      </div>

      {/* Travel Estimate Notice Banner */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-blue-900">
        <div className="flex items-start gap-2.5">
          <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Smart Scheduling & Travel Estimates:</strong> Inter-city transfer times are calculated using GPS Haversine distances adjusted for Sri Lankan road terrain and{' '}
            <strong>{preferences.transportation || 'Car'}</strong> average speeds, avoiding overlapping activities and respecting opening hours.
          </div>
        </div>
        {(totalDistance || itineraryData.routeSummary?.totalDistanceKm > 0) && (
          <div className="flex items-center gap-4 bg-white px-3.5 py-2 rounded-xl border border-blue-200 flex-shrink-0 font-semibold">
            <span>
              Distance:{' '}
              <strong className="text-blue-700">
                {totalDistance || `${itineraryData.routeSummary?.totalDistanceKm} km (Est.)`}
              </strong>
            </span>
            {totalDuration && (
              <span>
                Drive Time: <strong className="text-blue-700">{totalDuration}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Day Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setActiveDayFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeDayFilter === 'all'
              ? 'bg-blue-900 text-white shadow'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Days ({dailyList.length})
        </button>
        {dailyList.map((day) => {
          const dateStr = day.date
            ? new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '';
          return (
            <button
              key={day.dayNumber}
              type="button"
              onClick={() => setActiveDayFilter(day.dayNumber)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeDayFilter === day.dayNumber
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
              }`}
            >
              <span>Day {day.dayNumber}</span>
              {dateStr && <span className="opacity-75 font-normal">({dateStr})</span>}
            </button>
          );
        })}
      </div>

      {/* Day-by-Day Timeline Cards */}
      <div className="space-y-6">
        {visibleDays.map((day) => {
          const formattedDateInput = day.date
            ? new Date(day.date).toISOString().split('T')[0]
            : '';

          return (
            <div
              key={day.dayNumber}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Day Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-900 text-white font-extrabold flex flex-col items-center justify-center leading-none shadow-sm">
                    <span className="text-[10px] uppercase text-blue-200">Day</span>
                    <span className="text-base">{day.dayNumber}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-extrabold text-gray-900">{day.title}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <MapPin size={12} className="text-blue-600" />
                      <span>Focus: {day.districtFocus || 'Sri Lanka'}</span>
                      <span>•</span>
                      <span>{(day.activities || []).length} scheduled items</span>
                    </p>
                  </div>
                </div>

                {/* Date Picker & Add Stop Action */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
                    <CalendarIcon size={13} className="text-blue-600" />
                    <input
                      type="date"
                      value={formattedDateInput}
                      onChange={(e) => handleDayDateChange(day.dayNumber, e.target.value)}
                      className="text-xs font-semibold text-gray-800 focus:outline-none bg-transparent cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAddingToDay(day.dayNumber);
                      if (availableToAddDestinations.length > 0) {
                        setNewActForm((prev) => ({
                          ...prev,
                          mode: 'destination',
                          destinationId: availableToAddDestinations[0]._id
                        }));
                      } else {
                        setNewActForm((prev) => ({ ...prev, mode: 'custom' }));
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl transition"
                  >
                    <Plus size={14} /> Add Activity / Stop
                  </button>
                </div>
              </div>

              {/* Day Activities Timeline */}
              <div className="p-6">
                {!day.activities || day.activities.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-500 mb-2">
                      No activities scheduled for Day {day.dayNumber}.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAddingToDay(day.dayNumber)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      + Add a destination or activity
                    </button>
                  </div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-blue-100 space-y-4">
                    {day.activities.map((act, idx) => {
                      const badge = getActivityBadge(act.type);
                      return (
                        <div
                          key={act._id || act.activityId || idx}
                          className="relative bg-white rounded-xl border border-gray-200 hover:border-blue-300 p-4 transition shadow-sm"
                        >
                          {/* Timeline Dot */}
                          <span
                            className={`absolute -left-[31px] top-6 w-3.5 h-3.5 rounded-full border-2 border-white shadow ${badge.dot}`}
                          />

                          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div className="space-y-1.5 flex-grow">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-950 bg-slate-100 px-2.5 py-1 rounded-lg">
                                  <Clock size={12} className="text-blue-600" />
                                  {act.startTime} – {act.endTime}
                                </span>

                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}
                                >
                                  {badge.icon}
                                  {badge.label}
                                </span>

                                {act.type === 'travel' && act.isEstimatedTravel && (
                                  <span className="text-[11px] font-semibold bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-full">
                                    Estimated Travel ({act.distanceKm || '~30'} km)
                                  </span>
                                )}

                                {act.bestVisitTime && act.type === 'visit' && (
                                  <span className="text-[11px] text-gray-500 font-medium">
                                    • Best Time: {act.bestVisitTime}
                                  </span>
                                )}
                              </div>

                              <h5 className="text-base font-bold text-gray-900">{act.title}</h5>

                              {act.description && (
                                <p className="text-xs text-gray-600 leading-relaxed">
                                  {act.description}
                                </p>
                              )}

                              {act.notes && (
                                <p className="text-xs text-blue-700 font-medium bg-blue-50/60 inline-block px-2.5 py-1 rounded-lg">
                                  Note: {act.notes}
                                </p>
                              )}
                            </div>

                            {/* Interactive Controls for each activity */}
                            <div className="flex flex-wrap md:flex-nowrap items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                title="Move Up"
                                disabled={idx === 0}
                                onClick={() => handleMoveActivity(day.dayNumber, idx, 'up')}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                title="Move Down"
                                disabled={idx === day.activities.length - 1}
                                onClick={() => handleMoveActivity(day.dayNumber, idx, 'down')}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                              >
                                <ArrowDown size={14} />
                              </button>

                              {/* Move to Day Selector */}
                              {dailyList.length > 1 && (
                                <select
                                  value={day.dayNumber}
                                  onChange={(e) =>
                                    handleMoveActivityToDay(day.dayNumber, idx, e.target.value)
                                  }
                                  title="Move activity to another day"
                                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-700 font-semibold cursor-pointer"
                                >
                                  {dailyList.map((dOption) => (
                                    <option key={dOption.dayNumber} value={dOption.dayNumber}>
                                      Day {dOption.dayNumber}
                                    </option>
                                  ))}
                                </select>
                              )}

                              <button
                                type="button"
                                onClick={() => setViewingActivity({ ...act, dayNumber: day.dayNumber, date: day.date })}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1"
                              >
                                <Eye size={13} /> Details
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setEditingActivity({
                                    dayNumber: day.dayNumber,
                                    actIndex: idx,
                                    activity: { ...act }
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1"
                              >
                                <Edit3 size={13} /> Reschedule
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveActivity(day.dayNumber, idx)}
                                className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                title="Remove Activity"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Route Map Section */}
      {activeStopDestinations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <Navigation size={18} className="text-blue-600" />
                Scheduled Itinerary Route Map
              </h3>
              <p className="text-xs text-gray-500">
                Visualizing {activeStopDestinations.length} scheduled destination stop(s) across Sri Lanka.
              </p>
            </div>
            {loadingRoute && (
              <span className="text-xs text-blue-600 font-semibold animate-pulse">
                Calculating road polyline...
              </span>
            )}
          </div>
          <div className="rounded-2xl overflow-hidden border border-gray-200 h-[420px]">
            <MapView
              destinations={activeStopDestinations}
              routeCoordinates={routeCoordinates}
            />
          </div>
        </div>
      )}

      {/* MODAL 1: Reschedule / Edit Activity Modal */}
      {editingActivity && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                Reschedule / Edit Activity (Day {editingActivity.dayNumber})
              </h3>
              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedActivity} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Activity Title
                </label>
                <input
                  type="text"
                  required
                  value={editingActivity.activity.title || ''}
                  onChange={(e) =>
                    setEditingActivity({
                      ...editingActivity,
                      activity: { ...editingActivity.activity, title: e.target.value }
                    })
                  }
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Start Time (e.g. 08:30 AM)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingActivity.activity.startTime || ''}
                    onChange={(e) =>
                      setEditingActivity({
                        ...editingActivity,
                        activity: { ...editingActivity.activity, startTime: e.target.value }
                      })
                    }
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    End Time (e.g. 11:30 AM)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingActivity.activity.endTime || ''}
                    onChange={(e) =>
                      setEditingActivity({
                        ...editingActivity,
                        activity: { ...editingActivity.activity, endTime: e.target.value }
                      })
                    }
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description / Details
                </label>
                <textarea
                  rows={2}
                  value={editingActivity.activity.description || ''}
                  onChange={(e) =>
                    setEditingActivity({
                      ...editingActivity,
                      activity: { ...editingActivity.activity, description: e.target.value }
                    })
                  }
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Personal Notes
                </label>
                <input
                  type="text"
                  value={editingActivity.activity.notes || ''}
                  onChange={(e) =>
                    setEditingActivity({
                      ...editingActivity,
                      activity: { ...editingActivity.activity, notes: e.target.value }
                    })
                  }
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Apply Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Destination or Custom Activity to Day */}
      {addingToDay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                Add Stop or Activity to Day {addingToDay}
              </h3>
              <button
                type="button"
                onClick={() => setAddingToDay(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setNewActForm({ ...newActForm, mode: 'destination' })}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                  newActForm.mode === 'destination'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Add Sri Lankan Destination
              </button>
              <button
                type="button"
                onClick={() => setNewActForm({ ...newActForm, mode: 'custom' })}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                  newActForm.mode === 'custom'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Add Custom Activity / Break
              </button>
            </div>

            <form onSubmit={handleAddActivitySubmit} className="space-y-4 text-sm">
              {newActForm.mode === 'destination' ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Select Destination (Unassigned Stops)
                  </label>
                  {availableToAddDestinations.length === 0 ? (
                    <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                      All available destinations in the catalog are already scheduled in your itinerary! Switch to "Add Custom Activity" to add a custom stop.
                    </p>
                  ) : (
                    <select
                      value={newActForm.destinationId}
                      onChange={(e) =>
                        setNewActForm({ ...newActForm, destinationId: e.target.value })
                      }
                      className="w-full p-2.5 border border-gray-300 rounded-xl font-medium"
                      required
                    >
                      <option value="">-- Choose a destination --</option>
                      {availableToAddDestinations.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.district} • {d.category})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Activity Type
                    </label>
                    <select
                      value={newActForm.type}
                      onChange={(e) => setNewActForm({ ...newActForm, type: e.target.value })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl font-medium"
                    >
                      <option value="visit">Sightseeing / Visit</option>
                      <option value="meal">Dining / Meal Stop</option>
                      <option value="rest">Leisure / Rest Break</option>
                      <option value="travel">Transfer / Travel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Activity Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Sunset Tea Tasting at Highland Lounge"
                      value={newActForm.title}
                      onChange={(e) => setNewActForm({ ...newActForm, title: e.target.value })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="text"
                    required
                    value={newActForm.startTime}
                    onChange={(e) =>
                      setNewActForm({ ...newActForm, startTime: e.target.value })
                    }
                    className="w-full p-2.5 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="text"
                    required
                    value={newActForm.endTime}
                    onChange={(e) => setNewActForm({ ...newActForm, endTime: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional timing or booking notes..."
                  value={newActForm.notes}
                  onChange={(e) => setNewActForm({ ...newActForm, notes: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setAddingToDay(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    newActForm.mode === 'destination' &&
                    (!newActForm.destinationId || availableToAddDestinations.length === 0)
                  }
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-bold"
                >
                  Add to Day {addingToDay}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: View Activity Details Modal */}
      {viewingActivity && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden">
            {viewingActivity.image && (
              <div className="h-44 bg-slate-900 relative">
                <img
                  src={viewingActivity.image}
                  alt={viewingActivity.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <span className="text-[10px] font-bold uppercase bg-blue-600 px-2.5 py-0.5 rounded-full">
                    Day {viewingActivity.dayNumber} • {viewingActivity.category || viewingActivity.type}
                  </span>
                  <h3 className="text-xl font-bold mt-1">{viewingActivity.title}</h3>
                </div>
              </div>
            )}
            <div className="p-6 space-y-4 text-sm">
              {!viewingActivity.image && (
                <div>
                  <span className="text-xs font-bold uppercase text-blue-600">
                    Day {viewingActivity.dayNumber} Activity
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 mt-0.5">
                    {viewingActivity.title}
                  </h3>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 block">Scheduled Time</span>
                  <strong className="text-gray-900">
                    {viewingActivity.startTime} – {viewingActivity.endTime}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-400 block">District / Area</span>
                  <strong className="text-gray-900">
                    {viewingActivity.district || 'Sri Lanka'}
                  </strong>
                </div>
                {viewingActivity.bestVisitTime && (
                  <div>
                    <span className="text-gray-400 block">Best Visit Time</span>
                    <strong className="text-gray-900">{viewingActivity.bestVisitTime}</strong>
                  </div>
                )}
                {viewingActivity.openingHours && (
                  <div>
                    <span className="text-gray-400 block">Opening Hours</span>
                    <strong className="text-gray-900">{viewingActivity.openingHours}</strong>
                  </div>
                )}
              </div>

              {viewingActivity.description && (
                <p className="text-gray-600 text-xs leading-relaxed">
                  {viewingActivity.description}
                </p>
              )}

              {viewingActivity.notes && (
                <div className="bg-blue-50 text-blue-900 p-3 rounded-xl text-xs">
                  <strong>Schedule Note:</strong> {viewingActivity.notes}
                </div>
              )}

              <div className="flex justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setViewingActivity(null)}
                  className="px-5 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItineraryManager;

