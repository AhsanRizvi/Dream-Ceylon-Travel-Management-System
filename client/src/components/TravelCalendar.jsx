import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Sparkles,
  Sun,
  Compass,
  Car,
  Utensils,
  X,
  Info,
  ExternalLink
} from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toLocalDateKey = (dateInput) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const TravelCalendar = ({ activeItinerary = null, onSelectPlanToEdit = null }) => {
  const initialDate = useMemo(() => {
    if (activeItinerary?.dates?.start) {
      const d = new Date(activeItinerary.dates.start);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [activeItinerary]);

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth() + 1); // 1-12
  const [selectedDateKey, setSelectedDateKey] = useState(toLocalDateKey(initialDate));
  const [holidays, setHolidays] = useState([]);
  const [serverScheduledDays, setServerScheduledDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedActivityModal, setSelectedActivityModal] = useState(null);

  // Sync month/year when activeItinerary start date changes
  useEffect(() => {
    if (activeItinerary?.dates?.start) {
      const d = new Date(activeItinerary.dates.start);
      if (!Number.isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth() + 1);
        setSelectedDateKey(toLocalDateKey(d));
      }
    }
  }, [activeItinerary?.dates?.start]);

  const fetchCalendarData = async (year, month) => {
    setLoading(true);
    try {
      const res = await api.get(`/calendar/${year}/${month}`);
      const payload = res.data?.data || {};
      setHolidays(payload.holidays || []);
      setServerScheduledDays(payload.scheduledDays || []);
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Combine server-saved itinerary days with active in-memory itinerary (deduplicated by planId + dateKey)
  const combinedScheduleByDate = useMemo(() => {
    const map = {};

    const addDayEntry = (entry) => {
      const key = entry.dateKey || toLocalDateKey(entry.date);
      if (!key) return;
      if (!map[key]) map[key] = [];
      // Avoid duplicating the same plan on the same date
      const exists = map[key].some(
        (e) =>
          (e.planId && entry.planId && e.planId.toString() === entry.planId.toString()) ||
          (e.dayNumber === entry.dayNumber && e.planTitle === entry.planTitle)
      );
      if (!exists) {
        map[key].push(entry);
      }
    };

    // 1. Add active in-memory itinerary first so unsaved edits reflect live on the calendar
    if (activeItinerary && Array.isArray(activeItinerary.dailyItinerary)) {
      activeItinerary.dailyItinerary.forEach((dayItem) => {
        if (!dayItem.date) return;
        const dObj = new Date(dayItem.date);
        if (dObj.getFullYear() === currentYear && dObj.getMonth() + 1 === currentMonth) {
          addDayEntry({
            planId: activeItinerary._id || 'draft',
            planTitle: activeItinerary.title || 'Active Smart Itinerary',
            packageLevel: activeItinerary.preferences?.packageLevel || 'Standard',
            transportType: activeItinerary.transportType || 'Car',
            dayNumber: dayItem.dayNumber,
            date: dayItem.date,
            dateKey: toLocalDateKey(dayItem.date),
            dayTitle: dayItem.title,
            districtFocus: dayItem.districtFocus,
            activities: dayItem.activities || [],
            isActiveDraft: !activeItinerary._id
          });
        }
      });
    }

    // 2. Add saved plans from MongoDB
    serverScheduledDays.forEach((sDay) => {
      addDayEntry(sDay);
    });

    return map;
  }, [activeItinerary, serverScheduledDays, currentYear, currentMonth]);

  // Map holidays by YYYY-MM-DD
  const holidaysByDate = useMemo(() => {
    const map = {};
    holidays.forEach((h) => {
      const key = h.dateKey || new Date(h.date).toISOString().split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(h);
    });
    return map;
  }, [holidays]);

  // Build calendar grid cells for currentYear & currentMonth
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const startWeekday = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)

    const cells = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ isPadding: true, key: `pad-start-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        isPadding: false,
        day,
        dateKey,
        holidays: holidaysByDate[dateKey] || [],
        scheduledEntries: combinedScheduleByDate[dateKey] || []
      });
    }

    return cells;
  }, [currentYear, currentMonth, holidaysByDate, combinedScheduleByDate]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setSelectedDateKey(toLocalDateKey(now));
  };

  const selectedDayHolidays = holidaysByDate[selectedDateKey] || [];
  const selectedDaySchedules = combinedScheduleByDate[selectedDateKey] || [];
  const totalScheduledDaysInMonth = Object.keys(combinedScheduleByDate).length;

  return (
    <div className="space-y-6">
      {/* Calendar Header & Month Navigation */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Smart Travel Calendar
          </span>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-1.5 flex items-center gap-2">
            <CalendarIcon size={24} className="text-blue-600" />
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Displays your planned travel dates alongside official Sri Lankan Public & Full Moon Poya Holidays.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition"
            title="Previous Month"
          >
            <ChevronLeft size={18} />
          </button>

          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 bg-gray-50 cursor-pointer"
          >
            {MONTH_NAMES.map((mName, idx) => (
              <option key={mName} value={idx + 1}>
                {mName}
              </option>
            ))}
          </select>

          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 bg-gray-50 cursor-pointer"
          >
            {[2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition"
            title="Next Month"
          >
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition"
          >
            Today
          </button>
        </div>
      </div>

      {/* Visual Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 px-5 py-3 rounded-xl border border-gray-200 text-xs">
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex items-center gap-1.5 font-semibold text-gray-700">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
            Planned Travel Activity
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-gray-700">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            Full Moon Poya Holiday (Sri Lanka)
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-gray-700">
            <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" />
            National / Public Holiday
          </span>
        </div>
        <div className="text-gray-500 font-medium">
          <strong>{totalScheduledDaysInMonth}</strong> travel day(s) &{' '}
          <strong>{holidays.length}</strong> Sri Lankan holiday(s) this month
        </div>
      </div>

      {/* Main Layout: 7-Column Calendar Grid + Selected Date Detail Drawer */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Monthly Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-slate-900 text-white text-center py-3 text-xs font-bold uppercase tracking-wider">
            {WEEKDAYS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {loading ? (
            <div className="py-24 text-center text-gray-500 text-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-2" />
              Loading calendar & Sri Lankan holidays...
            </div>
          ) : (
            <div className="grid grid-cols-7 border-t border-gray-100">
              {calendarCells.map((cell) => {
                if (cell.isPadding) {
                  return (
                    <div
                      key={cell.key}
                      className="min-h-[110px] bg-gray-50/60 border-b border-r border-gray-100"
                    />
                  );
                }

                const isSelected = selectedDateKey === cell.dateKey;
                const isToday = toLocalDateKey(new Date()) === cell.dateKey;
                const hasTravel = cell.scheduledEntries.length > 0;
                const hasHoliday = cell.holidays.length > 0;

                // Flatten activities for quick cell preview
                const cellActivities = cell.scheduledEntries.flatMap((e) =>
                  (e.activities || []).map((a) => ({
                    ...a,
                    dayNumber: e.dayNumber,
                    planTitle: e.planTitle
                  }))
                );

                return (
                  <div
                    key={cell.dateKey}
                    onClick={() => setSelectedDateKey(cell.dateKey)}
                    className={`min-h-[115px] p-2 border-b border-r border-gray-100 cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/70 ring-2 ring-inset ring-blue-600'
                        : hasTravel
                          ? 'bg-emerald-50/25 hover:bg-blue-50/40'
                          : hasHoliday
                            ? 'bg-amber-50/20 hover:bg-amber-50/40'
                            : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    {/* Date Number & Badges */}
                    <div className="flex justify-between items-start">
                      <span
                        className={`w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow'
                            : isToday
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : 'text-gray-700'
                        }`}
                      >
                        {cell.day}
                      </span>

                      {hasTravel && (
                        <span className="text-[10px] font-extrabold bg-blue-600 text-white px-1.5 py-0.5 rounded-md">
                          Day {cell.scheduledEntries[0].dayNumber}
                        </span>
                      )}
                    </div>

                    {/* Holiday Pills & Scheduled Activity Pills */}
                    <div className="space-y-1 mt-1.5 overflow-hidden">
                      {cell.holidays.map((hol, hIdx) => (
                        <div
                          key={hIdx}
                          title={`${hol.name} (${hol.type})`}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded truncate border ${
                            hol.isPoya
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-purple-100 text-purple-900 border-purple-300'
                          }`}
                        >
                          {hol.isPoya ? '🌕 ' : '🇱🇰 '}
                          {hol.name}
                        </div>
                      ))}

                      {cellActivities.slice(0, 2).map((act, aIdx) => (
                        <div
                          key={aIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDateKey(cell.dateKey);
                            setSelectedActivityModal(act);
                          }}
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate border transition ${
                            act.type === 'visit'
                              ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                              : act.type === 'meal'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {act.startTime?.replace(' AM', 'a').replace(' PM', 'p')}{' '}
                          {act.destinationName || act.title}
                        </div>
                      ))}

                      {cellActivities.length > 2 && (
                        <div className="text-[10px] font-bold text-blue-700 pl-1">
                          +{cellActivities.length - 2} more activities
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Date Details Panel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="border-b border-gray-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Selected Date Details
              </span>
              <h3 className="text-xl font-extrabold text-gray-900 mt-1">
                {selectedDateKey
                  ? new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Select a date'}
              </h3>
            </div>

            {/* Public Holidays on Selected Date */}
            {selectedDayHolidays.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <Sun size={14} className="text-amber-500" /> Sri Lankan Public Holiday
                </h4>
                {selectedDayHolidays.map((hol, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border ${
                      hol.isPoya
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : 'bg-purple-50 border-purple-200 text-purple-950'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-sm">
                        {hol.isPoya ? '🌕 ' : '🇱🇰 '}
                        {hol.name}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/80 border">
                        {hol.type}
                      </span>
                    </div>
                    {hol.description && (
                      <p className="text-xs opacity-90 mt-1.5 leading-relaxed">
                        {hol.description}
                      </p>
                    )}
                    {hol.isPoya && (
                      <p className="text-[11px] font-semibold text-amber-800 mt-2 pt-1.5 border-t border-amber-200/60">
                        Travel Tip: Sacred temples & stupas (like Kandy & Mihintale) host special white-attire observances on Full Moon Poya days.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Planned Travel Activities on Selected Date */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Compass size={14} className="text-blue-600" /> Scheduled Travel Activities
              </h4>

              {selectedDaySchedules.length === 0 ? (
                <div className="text-center py-10 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <CalendarIcon size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-700">
                    No Travel Activities on This Date
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Select a highlighted date on the calendar or generate a new itinerary to schedule stops.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDaySchedules.map((sched, sIdx) => (
                    <div
                      key={sIdx}
                      className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase bg-blue-600 text-white px-2 py-0.5 rounded-full">
                            Day {sched.dayNumber} • {sched.packageLevel}
                          </span>
                          <h5 className="font-bold text-gray-900 text-sm mt-1">
                            {sched.dayTitle || sched.planTitle}
                          </h5>
                        </div>
                        {onSelectPlanToEdit && sched.planId && sched.planId !== 'draft' && (
                          <button
                            type="button"
                            onClick={() => onSelectPlanToEdit(sched.planId)}
                            className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            Edit Plan <ExternalLink size={11} />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {(sched.activities || []).map((act, aIdx) => (
                          <div
                            key={aIdx}
                            onClick={() =>
                              setSelectedActivityModal({
                                ...act,
                                dayNumber: sched.dayNumber,
                                dateKey: selectedDateKey,
                                planTitle: sched.planTitle
                              })
                            }
                            className="bg-white p-3 rounded-xl border border-gray-200 hover:border-blue-400 cursor-pointer transition shadow-sm"
                          >
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-extrabold text-blue-900 flex items-center gap-1">
                                <Clock size={12} className="text-blue-600" />
                                {act.startTime} – {act.endTime}
                              </span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                {act.type}
                              </span>
                            </div>
                            <p className="font-bold text-gray-900 text-xs mt-1">{act.title}</p>
                            {act.district && (
                              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                <MapPin size={10} /> {act.district}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Month Holidays Quick List */}
          {holidays.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <span className="text-[11px] font-bold uppercase text-gray-400 block mb-2">
                {MONTH_NAMES[currentMonth - 1]} {currentYear} Sri Lankan Holidays ({holidays.length})
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {holidays.map((h, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDateKey(h.dateKey)}
                    className="w-full text-left flex justify-between items-center text-xs p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition"
                  >
                    <span className="font-medium text-gray-800 truncate">
                      {h.isPoya ? '🌕 ' : '🇱🇰 '}
                      {h.name}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500 ml-2 flex-shrink-0">
                      {new Date(h.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Activity Details when selected from Calendar */}
      {selectedActivityModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden">
            {selectedActivityModal.image && (
              <div className="h-44 bg-slate-900 relative">
                <img
                  src={selectedActivityModal.image}
                  alt={selectedActivityModal.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <span className="text-[10px] font-bold uppercase bg-blue-600 px-2.5 py-0.5 rounded-full">
                    Day {selectedActivityModal.dayNumber} • {selectedActivityModal.type}
                  </span>
                  <h3 className="text-xl font-bold mt-1">{selectedActivityModal.title}</h3>
                </div>
              </div>
            )}

            <div className="p-6 space-y-4 text-sm">
              {!selectedActivityModal.image && (
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold uppercase text-blue-600">
                      Day {selectedActivityModal.dayNumber} Calendar Entry
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mt-0.5">
                      {selectedActivityModal.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedActivityModal(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 block">Time Slot</span>
                  <strong className="text-gray-900">
                    {selectedActivityModal.startTime} – {selectedActivityModal.endTime}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-400 block">District</span>
                  <strong className="text-gray-900">
                    {selectedActivityModal.district || 'Sri Lanka'}
                  </strong>
                </div>
                {selectedActivityModal.bestVisitTime && (
                  <div>
                    <span className="text-gray-400 block">Best Visit Time</span>
                    <strong className="text-gray-900">{selectedActivityModal.bestVisitTime}</strong>
                  </div>
                )}
                {selectedActivityModal.openingHours && (
                  <div>
                    <span className="text-gray-400 block">Opening Hours</span>
                    <strong className="text-gray-900">{selectedActivityModal.openingHours}</strong>
                  </div>
                )}
              </div>

              {selectedActivityModal.description && (
                <p className="text-xs text-gray-600 leading-relaxed">
                  {selectedActivityModal.description}
                </p>
              )}

              {selectedActivityModal.notes && (
                <div className="bg-blue-50 text-blue-900 p-3 rounded-xl text-xs">
                  <strong>Notes:</strong> {selectedActivityModal.notes}
                </div>
              )}

              <div className="flex justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedActivityModal(null)}
                  className="px-5 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelCalendar;

