
import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar';
import Footer from './components/Footer';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Planner from './pages/Planner';
import RoutePlanner from './pages/RoutePlanner';
import Destinations from './pages/Destinations';
import DestinationDetails from './pages/DestinationDetails';
import Hotels from './pages/Hotels';
import HotelRegister from './pages/HotelRegister';
import HotelDetails from './pages/HotelDetails';
import Guides from './pages/Guides';
import GuideRegister from './pages/GuideRegister';
import GuideDetails from './pages/GuideDetails';
import Packages from './pages/Packages';
import PackageDetails from './pages/PackageDetails';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';

function App() {
  return (
    <div className="flex flex-col min-h-screen font-sans">
      <Navbar />

      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/planner" element={<Planner />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/routes" element={<RoutePlanner />} />

          <Route path="/destinations" element={<Destinations />} />
          <Route path="/destinations/:id" element={<DestinationDetails />} />

          <Route path="/hotels" element={<Hotels />} />
          <Route path="/hotels/register" element={<HotelRegister />} />
          <Route path="/hotels/:id" element={<HotelDetails />} />

          <Route path="/guides" element={<Guides />} />
          <Route path="/guides/register" element={<GuideRegister />} />
          <Route path="/guides/:id" element={<GuideDetails />} />

          <Route path="/packages" element={<Packages />} />
          <Route path="/packages/:id" element={<PackageDetails />} />

          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
