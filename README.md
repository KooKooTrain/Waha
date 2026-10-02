# WAHA Backend API (Hackathon Prototype)

**WAHA** is a UAE-focused water resource intelligence platform. Its core mission is identifying overlooked water resources (such as AC condensate and storm runoff), quantifying the opportunity, and connecting those opportunities to people who can investigate or act on them.

---

## 🚀 Quick Start

### 1. Installation
```bash
cd waha-backend
npm install
```

### 2. Run in Development Mode
```bash
npm run dev
```
The server will start on `http://localhost:3000`.

### 3. Build & Production Start
```bash
npm run build
npm start
```

---

## 📡 Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status check |
| `POST` | `/api/buildings/analyze` | Calculate AC condensate recovery potential for a building |
| `GET` | `/api/buildings/opportunities` | List all analyzed building condensate opportunities |
| `POST` | `/api/rainfall/analyze` | Calculate rainfall runoff volume for a catchment area |
| `GET` | `/api/rainfall/opportunities` | List all identified rainfall runoff opportunities |
| `POST` | `/api/community/reports` | Submit a community observation report |
| `GET` | `/api/community/reports` | List all community observation reports |
| `GET` | `/api/map/opportunities` | Standardized dataset for Leaflet map (`?type=all\|building\|rainfall\|community`) |
| `GET` | `/api/dashboard` | Aggregated executive statistics and priority opportunity list |

---

## 💡 Example Payloads

### 1. Buildings - Analyze Condensate Potential
`POST /api/buildings/analyze`
```json
{
  "name": "Building 042",
  "latitude": 24.4539,
  "longitude": 54.3773,
  "buildingType": "Commercial",
  "acUnits": 120,
  "averageOperatingHours": 10,
  "existingCondensateDrainage": true,
  "landscaping": true
}
```

**Response:**
```json
{
  "id": "B-006",
  "building": {
    "name": "Building 042",
    "latitude": 24.4539,
    "longitude": 54.3773
  },
  "estimatedCondensateLitresPerDay": 1840,
  "estimatedAnnualLitres": 671600,
  "potentialUses": [
    "On-site landscape irrigation & greenery",
    "Landscape irrigation",
    "District cooling makeup water",
    "Non-potable facility applications (flushing, cleaning)"
  ],
  "recoveryPotential": "High",
  "confidence": "Medium",
  "assumptions": [
    "Assumed 1.53 litres condensate generation per AC unit per operating hour (UAE climate model)",
    "Estimated using AC unit count (120) and operating hours (10 hours/day)",
    "Actual condensate generation varies dynamically with seasonal humidity, ambient temperature, and HVAC load"
  ]
}
```

---

### 2. Rainfall - Analyze Runoff Potential
`POST /api/rainfall/analyze`
```json
{
  "latitude": 24.4539,
  "longitude": 54.3773,
  "rainfallMm": 18.4,
  "catchmentAreaM2": 2500,
  "runoffCoefficient": 0.8
}
```

**Response:**
```json
{
  "id": "R-006",
  "estimatedRunoffLitres": 36800,
  "opportunityLevel": "High",
  "confidence": "Medium",
  "notes": [
    "Estimate based on rainfall depth (18.4 mm), catchment area (2500 m²), and runoff coefficient (0.8)",
    "Converted rainfall millimetres into metres (1 mm = 0.001 m; 1 m³ = 1,000 litres)",
    "Actual capture potential requires site-specific engineering assessment, slope analysis, and storage infrastructure"
  ]
}
```

---

### 3. Community - Submit Report
`POST /api/community/reports`
```json
{
  "latitude": 24.4539,
  "longitude": 54.3773,
  "type": "Water accumulation",
  "description": "Significant water accumulation after rainfall",
  "photoUrl": null
}
```

**Response:**
```json
{
  "id": "CR-006",
  "status": "New",
  "message": "Community observation submitted successfully."
}
```

---

### 4. Map - Unified Opportunities
`GET /api/map/opportunities?type=all`

Returns a unified schema across Buildings, Rainfall, and Community reports ready to feed Leaflet markers/popups.

---

### 5. Dashboard - Executive Metrics
`GET /api/dashboard`

Returns aggregated totals, type breakdowns (`buildings`, `rainfall`, `community`), and priority lists.

---

## 🎨 Frontend Integration Notes

- **CORS**: Pre-configured to accept requests from `http://localhost:5173` (Vite) and `http://localhost:3000`.
- **Data Persistence**: In-memory array storage for hackathon prototype simplicity. Resets on server restart.
- **Leaflet Compatibility**: Coordinates are returned as `latitude` and `longitude` numbers (`[latitude, longitude]` for Leaflet markers).
