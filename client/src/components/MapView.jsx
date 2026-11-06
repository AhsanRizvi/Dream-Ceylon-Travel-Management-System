import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Star, MapPin, Navigation, Compass, AlertCircle, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

/**
 * Module 2: Maps, Routes and Transportation
 * Student Reg: SEU/IS/22/ICT/037
 * University: South Eastern University of Sri Lanka
 * 
 * Interactive Map Component for Sri Lanka Tourism Route Visualization.
 * Uses Leaflet & OpenStreetMap to display:
 * - Start Location Pin (distinct green badge)
 * - Numbered Destination Markers (1..N) with rich popups (name, district, category, rating)
 * - Primary Route Polyline (Royal Blue)
 * - Alternative Route Polylines (Muted Dashed Slate) with click-to-select
 * - Auto-fit Bounds (dynamically framing all stops and route lines)
 * - Zoom & Reset view controls
 * - Responsive layout with loading overlay & error states
 */

const SRI_LANKA_CENTER = [7.8731, 80.7718]; // Geographical Center of Sri Lanka
const DEFAULT_ZOOM = 7;

// Custom Marker Icons for Clear Tour Sequencing
const createStartIcon = (label = 'Start') => {
  return L.divIcon({
    className: 'custom-start-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
      ">
        <div style="
          background: #059669;
          color: white;
          font-weight: 800;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 9999px;
          box-shadow: 0 4px 8px rgba(5, 150, 105, 0.4);
          border: 2px solid white;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
          letter-spacing: 0.5px;
        ">
          <span style="display:inline-block; width:6px; height:6px; background:#a7f3d0; border-radius:50%;"></span>
          ${label}
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid #059669;
          margin-top: -1px;
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -32]
  });
};

const createDestinationIcon = (number = 1, isFinal = false) => {
  const bg = isFinal ? '#4338ca' : '#2563eb';
  return L.divIcon({
    className: 'custom-dest-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
      ">
        <div style="
          background: ${bg};
          color: white;
          font-weight: 800;
          font-size: 11px;
          min-width: 26px;
          height: 26px;
          padding: 0 6px;
          border-radius: 9999px;
          box-shadow: 0 4px 8px rgba(37, 99, 235, 0.35);
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: 0.5px;
        ">
          ${number}
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 7px solid ${bg};
          margin-top: -1px;
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -28]
  });
};

// Sub-component to auto-fit bounds smoothly whenever destinations or routes update
const MapBoundsHandler = ({ boundsPoints }) => {
  const map = useMap();

  useEffect(() => {
    if (!boundsPoints || boundsPoints.length === 0) return;

    if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 12, { animate: true });
    } else {
      const bounds = L.latLngBounds(boundsPoints);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 14,
          animate: true
        });
      }
    }
  }, [map, boundsPoints]);

  return null;
};

// Custom Zoom Controls overlay for better UX
const MapControls = ({ onRecenter }) => {
  const map = useMap();

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          title="Zoom In"
          className="p-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition border-b border-gray-100"
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          title="Zoom Out"
          className="p-2.5 text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition"
        >
          <ZoomOut size={16} />
        </button>
      </div>

      <button
        type="button"
        onClick={onRecenter}
        title="Recenter Sri Lanka"
        className="bg-white p-2.5 rounded-xl shadow-md border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition flex items-center justify-center"
      >
        <RefreshCw size={16} />
      </button>
    </div>
  );
};

const MapView = ({ 
  destinations = [], 
  startLocation = null, 
  routeCoordinates = [], 
  alternativeRoutes = [],
  selectedRouteIndex = 0,
  onSelectRoute = null,
  loading = false,
  error = null,
  height = '520px'
}) => {
  const mapRef = useRef(null);

  // Compute all points to frame in the viewport
  const boundsPoints = useMemo(() => {
    const points = [];

    if (startLocation && startLocation.latitude && startLocation.longitude) {
      points.push([parseFloat(startLocation.latitude), parseFloat(startLocation.longitude)]);
    }

    if (destinations && Array.isArray(destinations)) {
      destinations.forEach(d => {
        if (d && d.latitude && d.longitude) {
          points.push([parseFloat(d.latitude), parseFloat(d.longitude)]);
        }
      });
    }

    if (routeCoordinates && routeCoordinates.length > 0) {
      // Sample polyline coordinates to prevent over-computation
      const step = Math.max(1, Math.floor(routeCoordinates.length / 40));
      for (let i = 0; i < routeCoordinates.length; i += step) {
        points.push(routeCoordinates[i]);
      }
    }

    return points;
  }, [startLocation, destinations, routeCoordinates]);

  // Initial center determination
  const initialCenter = boundsPoints.length === 1 
    ? boundsPoints[0] 
    : SRI_LANKA_CENTER;

  const initialZoom = boundsPoints.length === 1 ? 12 : DEFAULT_ZOOM;

  const handleRecenter = () => {
    if (mapRef.current) {
      if (boundsPoints.length > 1) {
        const bounds = L.latLngBounds(boundsPoints);
        mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
      } else {
        mapRef.current.setView(SRI_LANKA_CENTER, DEFAULT_ZOOM, { animate: true });
      }
    }
  };

  return (
    <div 
      className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-md bg-gray-50"
      style={{ minHeight: '380px', height }}
    >
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[1001] flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-gray-800">Calculating Road Navigation...</span>
          <span className="text-xs text-gray-500">Querying OpenStreetMap road networks</span>
        </div>
      )}

      {/* Error Message Notice */}
      {error && !loading && (
        <div className="absolute top-4 left-4 right-4 sm:right-auto max-w-md z-[1001] bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-xl shadow-lg flex items-start gap-2.5 text-xs">
          <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold block">Routing Notice</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <MapContainer
        ref={mapRef}
        center={initialCenter}
        zoom={initialZoom}
        zoomControl={false}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        {/* OpenStreetMap Standard Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Viewport Bounds Auto-fit */}
        <MapBoundsHandler boundsPoints={boundsPoints} />

        {/* Zoom Controls */}
        <MapControls onRecenter={handleRecenter} />

        {/* START LOCATION MARKER */}
        {startLocation && startLocation.latitude && startLocation.longitude && (
          <Marker 
            position={[parseFloat(startLocation.latitude), parseFloat(startLocation.longitude)]}
            icon={createStartIcon('START')}
          >
            <Popup className="custom-leaflet-popup">
              <div className="p-1 max-w-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold uppercase tracking-wide">
                  <MapPin size={13} /> Starting Gateway
                </div>
                <h3 className="font-extrabold text-gray-900 text-sm mt-0.5">{startLocation.name || 'Start Point'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {startLocation.district ? `${startLocation.district} District` : (startLocation.city || 'Sri Lanka')}
                </p>
                <div className="text-[11px] text-gray-400 mt-1.5 pt-1.5 border-t border-gray-100 font-mono">
                  GPS: {parseFloat(startLocation.latitude).toFixed(4)}, {parseFloat(startLocation.longitude).toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* DESTINATION MARKERS */}
        {destinations && destinations.map((dest, idx) => {
          if (!dest || !dest.latitude || !dest.longitude) return null;
          const isFinal = idx === destinations.length - 1;
          const dayNumber = dest.day || idx + 1;

          return (
            <Marker 
              key={dest._id || `dest-${idx}`} 
              position={[parseFloat(dest.latitude), parseFloat(dest.longitude)]}
              icon={createDestinationIcon(dayNumber, isFinal)}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-1 max-w-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Day {dayNumber} Stop
                    </span>
                    {dest.rating && (
                      <span className="flex items-center text-amber-500 text-xs font-bold">
                        <Star size={11} className="fill-current mr-0.5" /> {dest.rating}
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-sm">{dest.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {dest.district ? `${dest.district} District` : ''} 
                    {dest.category ? ` • ${dest.category}` : ''}
                  </p>
                  {dest.description && (
                    <p className="text-[11px] text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                      {dest.description}
                    </p>
                  )}
                  <div className="text-[10px] text-gray-400 mt-2 pt-1 border-t border-gray-100 font-mono">
                    {parseFloat(dest.latitude).toFixed(4)}, {parseFloat(dest.longitude).toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* UNSELECTED ALTERNATIVE ROUTE POLYLINES (DASHED MUTED) */}
        {alternativeRoutes && alternativeRoutes.map((alt, aIdx) => {
          if (aIdx === selectedRouteIndex || !alt.leafletCoordinates || alt.leafletCoordinates.length === 0) return null;

          return (
            <Polyline
              key={`alt-route-${aIdx}`}
              positions={alt.leafletCoordinates}
              pathOptions={{
                color: '#94a3b8',
                weight: 4,
                opacity: 0.7,
                dashArray: '8, 8',
                lineJoin: 'round'
              }}
              eventHandlers={{
                click: () => onSelectRoute && onSelectRoute(aIdx)
              }}
            >
              <Popup>
                <div className="text-xs">
                  <span className="font-bold text-gray-800">{alt.label || `Alternative Route ${aIdx}`}</span>
                  <div className="text-gray-600 mt-1">
                    Distance: <strong>{alt.distanceKm}</strong> • Est: <strong>{alt.durationFormatted}</strong>
                  </div>
                  {onSelectRoute && (
                    <button
                      type="button"
                      onClick={() => onSelectRoute(aIdx)}
                      className="mt-2 text-xs font-bold text-blue-600 hover:underline block"
                    >
                      Select This Route Corridor &rarr;
                    </button>
                  )}
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* SELECTED PRIMARY ROUTE POLYLINE (BOLD BLUE) */}
        {routeCoordinates && routeCoordinates.length > 0 && (
          <Polyline 
            positions={routeCoordinates} 
            pathOptions={{
              color: '#2563eb', 
              weight: 5,
              opacity: 0.9,
              lineJoin: 'round',
              lineCap: 'round'
            }}
          />
        )}
      </MapContainer>

      {/* Map Legend (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-gray-200 text-[11px] text-gray-700 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
          <span className="font-medium">Start</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <span className="font-medium">Destinations</span>
        </div>
        {routeCoordinates && routeCoordinates.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-blue-600 rounded-full"></span>
            <span className="font-semibold text-blue-900">Active Route</span>
          </div>
        )}
        {alternativeRoutes && alternativeRoutes.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 border-t-2 border-dashed border-gray-400"></span>
            <span className="font-medium text-gray-500">Alternatives</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(MapView);
