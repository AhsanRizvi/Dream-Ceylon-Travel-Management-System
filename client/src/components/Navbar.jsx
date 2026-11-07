import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Map, LogOut, User } from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-blue-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-yellow-400">
              <Map size={24} />
              Dream Ceylon
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/destinations" className="hover:text-yellow-400 transition">Destinations</Link>
            <Link to="/planner" className="hover:text-yellow-400 transition">Smart Planner</Link>
            <Link to="/calendar" className="hover:text-yellow-400 transition">Calendar</Link>
            <Link to="/packages" className="hover:text-yellow-400 transition">Packages</Link>
            <Link to="/hotels" className="hover:text-yellow-400 transition">Hotels</Link>
            <Link to="/guides" className="hover:text-yellow-400 transition">Guides</Link>
            
            {user ? (
              <ProfileDropdown />
            ) : (
              <div className="flex space-x-4">
                <Link to="/login" className="hover:text-yellow-400 transition">Login</Link>
                <Link to="/register" className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-md transition font-medium">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
