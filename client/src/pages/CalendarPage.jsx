import React from 'react';
import { useNavigate } from 'react-router-dom';
import TravelCalendar from '../components/TravelCalendar';
import { Calendar as CalendarIcon, Compass, FolderOpen } from 'lucide-react';

const CalendarPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-yellow-300 bg-blue-800/70 px-3.5 py-1 rounded-full border border-yellow-400/30">
            Sri Lanka Travel & Holiday Calendar
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2 flex items-center gap-3">
            <CalendarIcon size={32} className="text-yellow-400" />
            Smart Travel Calendar
          </h1>
          <p className="text-blue-200 text-sm mt-1 max-w-2xl">
            View your scheduled day-by-day tour activities alongside official Sri Lankan Public, Mercantile, and Full Moon Poya Holidays.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/planner?tab=saved')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold text-xs flex items-center gap-2 transition"
          >
            <FolderOpen size={15} /> Saved Plans
          </button>
          <button
            type="button"
            onClick={() => navigate('/planner')}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-lg transition"
          >
            <Compass size={15} /> Open Smart Planner
          </button>
        </div>
      </div>

      <TravelCalendar
        onSelectPlanToEdit={() => {
          navigate('/planner?tab=saved');
        }}
      />
    </div>
  );
};

export default CalendarPage;

