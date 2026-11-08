# Module 2 – Maps, Routes and Transportation
**Project:** Dream Ceylon – Smart Lanka Tourism Planner and Travel Management System  
**Student Registration Number:** SEU/IS/22/ICT/037  
**University:** South Eastern University of Sri Lanka  

---

## 1. Module Overview & Responsibilities

Module 2 provides the geographic intelligence, route planning, interactive mapping, vehicle selection, and transit calculations for the Dream Ceylon tourism platform:

- **Interactive Map Integration:** Leaflet.js with OpenStreetMap (OSM) tile layers via `react-leaflet`.
- **Start Location Selection:** Pre-configured Sri Lankan tourist gateways (Bandaranaike International Airport CMB, Colombo Fort, Kandy City Center, Galle Fort, Mattala Airport HRI) plus live Nominatim geocoding search.
- **Multi-Destination Route Calculation:** Turn-by-turn road routing via Project OSRM (Open Source Routing Machine), generating complete route polyline, total distance (km), total duration (hours and minutes), and leg-by-leg metrics.
- **Vehicle Selection:** Professional selection cards for Car (Sedan), Passenger Van, and Touring Motorcycle with honest routing profile capability reporting.
- **Traffic-Aware Information:** Transparent traffic status reporting distinguishing standard estimated travel duration from live traffic, with clear disclaimers when live traffic is unavailable.
- **Route Alternatives:** Multi-corridor route options where supported by OSRM, allowing users to toggle and highlight alternative routes on the interactive map.
- **Offline / Sandbox Resilience:** Built-in high-precision Haversine spherical distance calculation and Sri Lanka terrain-adapted winding simulation fallback so the system remains functional even if external public servers or firewalls are offline.

---

## 2. Technology Stack & API Architecture

| Layer | Technology | Purpose |
|---|---|---|
| Map Canvas | Leaflet.js (`leaflet`, `react-leaflet` v4) | Interactive vector map rendering with responsive viewport |
| Tile Provider | OpenStreetMap (OSM) Standard Tiles | Free, open-source cartography with zero API fees |
| Routing Engine | Project OSRM (`router.project-osrm.org`) | Turn-by-turn motor-vehicle routing and corridor alternatives |
| Geocoding | Nominatim OpenStreetMap API | Address and landmark geocoding biased to Sri Lanka (`countrycodes=lk`) |
| Local Algorithms | Haversine Spherical Trigonometry | Nearby destination search and topological distance fallback |
| Backend Runtime | Node.js + Express.js | REST API controllers, input validation, and service orchestration |

---

## 3. Backend REST API Endpoints

All endpoints are mounted under `/api/maps`:

### 1. `GET /api/maps/presets`
Retrieves curated Sri Lankan entry hubs (Airports, major railway stations, tourist hubs).
- **Response:** `{ success: true, count: 8, data: [...] }`

### 2. `GET /api/maps/geocode?address={query}`
Geocodes an address or landmark within Sri Lanka.
- **Parameters:** `address` (string, required)
- **Response:** `{ success: true, data: { name, displayName, lat, lng, district, city } }`

### 3. `GET /api/maps/route?originLat={lat}&originLng={lng}&destLat={lat}&destLng={lng}&vehicleType={car|van|motorcycle}&alternatives={true|false}`
Calculates point-to-point road route between two coordinates with optional alternatives.
- **Response:** Distance (km), duration (formatted), coordinates, alternative routes array, vehicle metadata, traffic status.

### 4. `POST /api/maps/multi-route`
Calculates chained route across starting point and multiple consecutive destinations:
- **Body:**
  ```json
  {
    "startLocation": { "name": "Bandaranaike International Airport (CMB)", "latitude": 7.1808, "longitude": 79.8841 },
    "destinations": [
      { "name": "Sigiriya Rock Fortress", "latitude": 7.9570, "longitude": 80.7603 },
      { "name": "Kandy Temple of Tooth", "latitude": 7.2906, "longitude": 80.6337 }
    ],
    "vehicleType": "van",
    "alternatives": true
  }
  ```
- **Response:** Total distance (km), total duration (formatted), complete polyline coordinates, leg-by-leg breakdown, vehicle metadata, traffic status notice.

### 5. `GET /api/maps/nearby?lat={lat}&lng={lng}&radius={km}&limit={n}`
Finds destinations within a geographic radius in kilometers using the Haversine formula against MongoDB.

### 6. `GET /api/maps/traffic-status`
Checks if an external live traffic provider is configured and returns transparent traffic status.

---

## 4. Vehicle Selection & Provider Behavior

In accordance with strict academic integrity:
1. **Sedan Car (1-3 passengers):** Standard motor-vehicle profile.
2. **Passenger Van (4-8 passengers):** High-roof tourist van profile.
3. **Touring Motorcycle (1-2 riders):** Agile motorbike profile.

**Provider Capability Note:**
Public OSRM demo engines host a unified motor-vehicle `driving` road network profile. The system transparently reports this in both backend metadata and frontend UI badges without creating fake vehicle routes or deceptive multipliers. If an enterprise provider or custom OSRM endpoint with dedicated profiles is configured, the service routes through that endpoint automatically.

---

## 5. Traffic-Aware Information

- Standard estimated travel duration is computed based on Sri Lanka's road network topology and highway speed limits.
- If no commercial live traffic key (`TOMTOM_API_KEY` or `GOOGLE_MAPS_API_KEY`) is configured in `.env`, the system explicitly displays:
  > *"Live traffic information is currently unavailable on public OpenStreetMap/OSRM routing. Displaying standard algorithmic road transit duration based on standard speed limits."*
- **No fake live traffic data is ever generated.**

---

## 6. How to Run the Project Locally

Ensure dependencies are installed:

```bash
# Terminal 1 - Backend Server
cd server
npm install
npm run dev

# Terminal 2 - Frontend Client
cd client
npm install
npm run dev
```

### Running the Module 2 Automated Test Suite
From the `server` folder, execute:
```bash
node testModule2.js
```
All 18 automated unit and integration tests will verify presets, geocoding, single routes, multi-destination routes, vehicle models, leg breakdowns, traffic status, and validation error handling.
