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
import Guides from './pages/Guides';
import Packages from './pages/Packages';
import PackageDetails from './pages/PackageDetails';
import Dashboard from './pages/Dashboard';

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
          <Route path="/routes" element={<RoutePlanner />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/destinations/:id" element={<DestinationDetails />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="/guides" element={<Guides />} />
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
