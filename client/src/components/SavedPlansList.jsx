import React from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Car,
  Utensils,
  Compass,
  Trash2,
  Edit3,
  FolderOpen,
  DollarSign,
  Plus
} from 'lucide-react';

const SavedPlansList = ({
  savedPlans = [],
  loading = false,
  onLoadPlan,
  onViewInCalendar,
  onDeletePlan,
  onCreateNew
}) => {
  if (loading) {
    return (
      <div className="py-16 text-center text-gray-500 text-sm">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900 mx-auto mb-3" />
        Loading your saved Sri Lankan travel plans...
      </div>
    );
  }

  if (!savedPlans || savedPlans.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300 max-w-xl mx-auto">
        <FolderOpen size={44} className="mx-auto text-gray-300 mb-3" />
        <h3 className="text-xl font-bold text-gray-800">No Saved Travel Plans Yet</h3>
        <p className="text-xs text-gray-500 mt-1 mb-5">
          Generate a personalized destination recommendation and save your day-by-day itinerary to access it anytime.
        </p>
        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition"
          >
            <Plus size={15} /> Create New Travel Plan
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {savedPlans.map((plan) => {
        const startDateStr = plan.dates?.start
          ? new Date(plan.dates.start).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : 'Flexible Dates';
        const endDateStr = plan.dates?.end
          ? new Date(plan.dates.end).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : '';

        const stopNames = Array.isArray(plan.stops)
          ? plan.stops.map((s) => (typeof s === 'object' ? s.name : 'Destination')).filter(Boolean)
          : [];

        return (
          <div
            key={plan._id}
            className="bg-white rounded-2xl border border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md transition p-6 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider bg-blue-50 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
                    {plan.preferences?.packageLevel || 'Standard'} Package
                  </span>
                  <span className="text-xs font-semibold text-gray-500">
                    {plan.days} {plan.days === 1 ? 'Day' : 'Days'}
                  </span>
                </div>

                {plan.costEstimate?.grandTotal > 0 && (
                  <span className="text-base font-extrabold text-emerald-600 flex items-center">
                    <DollarSign size={15} />
                    {plan.costEstimate.grandTotal}
                  </span>
                )}
              </div>

              <h3 className="text-xl font-extrabold text-gray-900">
                {plan.title || `Sri Lanka ${plan.days}-Day Tour Plan`}
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-blue-600 flex-shrink-0" />
                  <span className="truncate">
                    {startDateStr}
                    {endDateStr && endDateStr !== startDateStr ? ` – ${endDateStr}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={13} className="text-blue-600 flex-shrink-0" />
                  <span>{plan.travelers || 2} Travellers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Car size={13} className="text-blue-600 flex-shrink-0" />
                  <span>{plan.transportType || plan.preferences?.transportation || 'Car'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Utensils size={13} className="text-blue-600 flex-shrink-0" />
                  <span>{plan.preferences?.mealType || 'All meat types'}</span>
                </div>
              </div>

              {/* Stops Pill List */}
              {stopNames.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase text-gray-400 block mb-1.5">
                    Destinations ({stopNames.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {stopNames.map((name, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-semibold bg-blue-50/70 text-blue-900 px-2.5 py-0.5 rounded-lg border border-blue-100 flex items-center gap-1"
                      >
                        <MapPin size={10} className="text-blue-600" />
                        {idx + 1}. {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {onLoadPlan && (
                  <button
                    type="button"
                    onClick={() => onLoadPlan(plan)}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition"
                  >
                    <Edit3 size={13} /> Open & Edit Schedule
                  </button>
                )}

                {onViewInCalendar && (
                  <button
                    type="button"
                    onClick={() => onViewInCalendar(plan)}
                    className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs px-3.5 py-2 rounded-xl transition"
                  >
                    <Calendar size={13} /> View Calendar
                  </button>
                )}
              </div>

              {onDeletePlan && (
                <button
                  type="button"
                  onClick={() => onDeletePlan(plan._id)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SavedPlansList;

