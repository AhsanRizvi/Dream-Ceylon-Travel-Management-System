import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Map, Menu, X, LayoutDashboard, LogIn, UserPlus } from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';
import CurrencySelector from './CurrencySelector';

const NAV_LINKS = [
  { to: '/destinations', label: 'Destinations' },
  { to: '/routes', label: 'Routes & Map' },
  { to: '/planner', label: 'Smart Planner' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/packages', label: 'Packages' },
  { to: '/hotels', label: 'Hotels' },
  { to: '/guides', label: 'Guides' },
];

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <nav className="bg-blue-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-3">

          <Link
            to="/"
            className="flex items-center gap-2 text-lg sm:text-xl font-bold text-yellow-400 min-w-0"
          >
            <Map size={24} className="flex-shrink-0" />
            <span className="truncate">Dream Ceylon</span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden lg:flex items-center space-x-5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="hover:text-yellow-400 transition text-sm font-medium whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}

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

          {/* Mobile controls */}
          <div className="flex items-center gap-2 lg:hidden">
            <CurrencySelector />
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              className="flex items-center justify-center w-11 h-11 -mr-1 rounded-lg text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          id="mobile-nav"
          className="lg:hidden border-t border-blue-800 bg-blue-900 max-h-[calc(100vh-4rem)] overflow-y-auto"
        >
          <div className="max-w-7xl mx-auto px-3 py-2 space-y-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block px-3 py-3 rounded-lg text-base font-medium hover:bg-blue-800 hover:text-yellow-400 transition"
              >
                {link.label}
              </Link>
            ))}

            <div className="pt-2 mt-2 border-t border-blue-800 space-y-0.5">
              {user ? (
                <>
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold truncate">{user.name}</p>
                    <p className="text-xs text-blue-300 truncate">{user.email}</p>
                  </div>
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium hover:bg-blue-800 hover:text-yellow-400 transition"
                  >
                    <LayoutDashboard size={18} />
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-red-300 hover:bg-blue-800 hover:text-red-200 transition"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium hover:bg-blue-800 hover:text-yellow-400 transition"
                  >
                    <LogIn size={18} />
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center justify-center gap-2 mx-1 my-1 bg-green-600 hover:bg-green-500 px-3.5 py-3 rounded-md transition text-base font-medium"
                  >
                    <UserPlus size={18} />
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
