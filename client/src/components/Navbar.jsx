
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Map } from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';
import CurrencySelector from './CurrencySelector';

const Navbar = () => {
  const { user } = useContext(AuthContext);

  return (
    <nav className="bg-blue-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">

          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center gap-2 text-xl font-bold text-yellow-400"
            >
              <Map size={24} />
              Dream Ceylon
            </Link>
          </div>

          <div className="flex items-center space-x-5">

            <Link
              to="/destinations"
              className="hover:text-yellow-400 transition text-sm font-medium"
            >
              Destinations
            </Link>

            <Link
              to="/routes"
              className="hover:text-yellow-400 transition text-sm font-medium"
            >
              Routes & Map
            </Link>

            <Link
              to="/planner"
              className="hover:text-yellow-400 transition text-sm font-medium"
            >
              Smart Planner
            </Link>

            <Link
              to="/calendar"
              className="hover:text-yellow-400 transition text-sm font-medium"
            >
              Calendar
            </Link>

            <Link
              to="/packages"
              className="hover:text-yellow-400 transition text-sm font-medium"
            >
              Packages
            </Link>

            <Link
              to="/hotels"
              className="hover:text-yellow-400 transition text-sm font-medium"
            >
              Hotels
            </Link>

            <Link
              to="/guides"
              className="hover:text-yellow-400 transition text-sm font-medium"
            >
              Guides
            </Link>

            {/* Global Currency Selector */}
            <CurrencySelector />

            {user ? (
              <ProfileDropdown />
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="hover:text-yellow-400 transition text-sm font-medium"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="bg-green-600 hover:bg-green-500 px-3.5 py-2 rounded-md transition text-sm font-medium"
                >
                  Sign Up
                </Link>
              </div>
            )}

          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
