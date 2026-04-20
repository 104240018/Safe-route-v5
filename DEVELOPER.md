# SafeRoute - Developer Documentation 🛠️

This document provides a technical overview of the SafeRoute architecture, routing algorithms, and advanced simulation features.

## 🏗️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide React, Framer Motion.
- **Mapping**: Leaflet with `react-leaflet` and `leaflet.heat`.
- **Backend**: Node.js (Express).
- **Database**: SQLite (`better-sqlite3`) for persistent storage of nodes, edges, and risk zones.
- **Data Source**: Overpass API (OpenStreetMap) for real-world road geometries.

## 📂 File Structure

```text
├── src/
│   ├── backend/                # Node.js (Express) server and logic
│   │   ├── server.ts           # Main entry point, API routes, Vite middleware
│   │   ├── db.ts               # SQLite database initialization
│   │   ├── routing/            # Graph algorithms (Pathfinding)
│   │   │   ├── astar.ts        # A* implementation with risk weighting
│   │   │   ├── cost.ts         # Edge cost calculation logic
│   │   │   ├── graph.ts        # In-memory graph structure
│   │   │   └── heuristic.ts    # Geometric heuristic functions
│   │   └── systems/            # Data orchestration and builders
│   │       ├── osm.ts          # OpenStreetMap (Overpass) client
│   │       ├── risk.ts         # Server-side risk evaluation
│   │       ├── risk_vault.ts   # Persistence layer for risk zones
│   │       └── road_network.ts # Graph construction from OSM data
│   └── frontend/               # React application
│       ├── App.tsx             # Root functional coordinator
│       ├── main.tsx            # Application entry point
│       ├── types.ts            # Shared TypeScript definitions
│       ├── index.css           # Global theme and Tailwind directives
│       ├── components/         # UI Modules
│       │   ├── layout/         # Structural UI elements
│       │   │   ├── Header.tsx       # System status and UI toggles
│       │   │   └── StatusBanner.tsx # Real-time system feedback
│       │   ├── map/            # Spatial visualization
│       │   │   ├── HeatmapLayer.tsx    # High-performance risk overlay
│       │   │   ├── Map.tsx             # Core Leaflet orchestration
│       │   │   ├── MarkerSimulation.tsx # Animated user agent
│       │   │   └── PolygonDrawer.tsx   # Manual zone creation tools
│       │   └── sidebar/        # Control panels
│       │       ├── LeftSidebar.tsx     # Primary navigation sidebar
│       │       ├── RightSidebar.tsx    # Metrics and analytics panel
│       │       ├── EnvironmentControls.tsx # Sim time/weather toggles
│       │       ├── SimulationControls.tsx # Trip telemetry controls
│       │       └── ZoneEditor.tsx      # Risk zone management UI
│       ├── hooks/              # State lifecycle and orchestration
│       │   ├── useEnvironment.ts  # Sim environment monitoring
│       │   ├── useGeofencing.ts   # Geofence threshold monitoring
│       │   ├── useRouting.ts      # Pathfinding and grid lifecycle
│       │   ├── useSimulation.ts   # Navigation playback engine
│       │   └── useUiTheme.ts      # UI theme hook
│       ├── systems/            # Client-side domain logic
│       │   ├── environment.ts     # Env state transition logic
│       │   ├── geofencing.ts      # Spatial intersection checks
│       │   ├── risk.ts            # Client-side risk field math
│       │   └── simulation.ts      # High-precision marker movement
│       └── utils/              # Calculation helpers
│           ├── distance.ts        # Geographic distance formulas
│           └── uiTheme.ts         # UI theme utilities
├── saferoute.db          # SQLite database file
├── package.json          # Dependencies and scripts
└── DEVELOPER.md          # Technical documentation
```

## 🎨 UI/UX Architecture

The application is structured into four primary functional components that communicate via a central state in `App.tsx`:

### 1. Header Component
- **System Status**: Displays real-time connectivity and versioning.
- **Global Toggles**: Controls for **Night Mode** (UI theme) and **Dev Mode** (Editor tools).
- **Quick Actions**: "Center on Me" button for rapid map re-orientation.

### 2. Left Sidebar (Navigator & Controls)
- **Search & Radius**: Controls for fetching road data and setting search bounds.
- **Selection Modes**: Toggle between "Explore", "Set Start", and "Set Destination".
- **Environment Simulation**:
    - **Night Mode (Env)**: Toggles environmental time, affecting risk multipliers.
    - **Rain Mode**: Toggles weather conditions, increasing hazard levels.
- **Simulation Suite**: 
    - **Travel Mode Selection**: Choose between Walking (5km/h), Bike (40km/h), or Car (60km/h).
    - **Speed Multiplier**: A x1 to x20 slider for accelerated simulation testing.
    - **Live Telemetry**: Displays current speed, status, and mode-specific icons.

### 3. Right Sidebar (Analysis & Metrics)
- **Route Comparison**: Side-by-side metrics for Shortest vs. Safest paths.
- **Risk Explanation**: AI-generated (logic-based) explanations of why a specific route was chosen.
- **Hover Risk**: A real-time gauge showing the risk level at the cursor's current position.

### 4. Map Component (The Engine)
- **Heatmap Layer**: High-fidelity gradient visualization of risk zones using custom Canvas rendering.
- **Route Rendering**: Multi-colored polylines indicating safety levels along the path.
- **Navigation Marker**: A dynamic, animated marker that represents the user during simulation.
- **Auto-Follow**: Camera logic that keeps the moving user centered during navigation.

## 🚀 Advanced Features

### 1. Environment System (Global State)
The application maintains a global environmental state (`time`, `weather`) that dynamically scales risk levels.
- **Dynamic Risk Scaling**: Risk zones store base risk and multipliers (e.g., Night x1.5, Rain x1.3).
- **Runtime Calculation**: Final risk is computed on-the-fly: `finalRisk = baseRisk * timeMultiplier * weatherMultiplier`.

### 2. Geofencing Alert Engine
A state-machine based monitoring system that tracks the user's interaction with risk zones.
- **State Tracking**: Manages `outside`, `inside`, and `staying` states per zone.
- **Event Triggers**: 
    - **ENTER**: Triggered when crossing into a zone with `finalRisk > 0.5`.
    - **EXIT**: Triggered when leaving a danger zone.
    - **STAY**: Triggered after remaining in a high-risk zone for >30 seconds.
- **Anti-Spam Logic**: Implements a 10-second cooldown for transition alerts and 30-second cooldown for duration alerts.

### 3. Navigation Simulation System
The simulation uses a high-precision animation loop (`requestAnimationFrame`) to move a marker along the path nodes.
- **Interpolation**: Position is linearly interpolated every 3-5 meters to ensure smooth movement.
- **Active Position System**: All safety logic (geofencing, alerts) automatically switches to the simulated position during navigation.
- **Metrics Engine**: Real-time calculation of **Distance Remaining** (meters) and **ETA** (minutes) by summing remaining path segments.
- **Total Progress**: A progress bar that tracks the entire journey completion percentage.

### 4. High-Fidelity Heatmap
Replaces static circles with a sophisticated gradient visualization.
- **Zoom-Consistent Scaling**: Uses geographic-to-pixel conversion logic to ensure risk zones maintain their physical size (e.g., 300m) at all zoom levels.
- **Linear Decay**: Risk intensity fades linearly from the center to the edge using a multi-ring point generation strategy.
- **Additive Risk**: Overlapping heatmap points sum their intensities, allowing two "Moderate" zones to visually combine into a "High" risk area.
- **Color Ramp**: 
    - `0.1 - 0.2`: Light Green (Safe)
    - `0.4`: Yellow (Low)
    - `0.6`: Orange (Moderate)
    - `0.8`: Red (High)
    - `1.0`: Dark Red (Extreme)

## 🧠 Core Logic & Algorithms

### 1. Routing Engine (Dijkstra's Algorithm)
`Cost = Distance + (Risk_Weight × Risk_Score²)`
- **Safest Route**: Uses a high `Risk_Weight` (50.0) and squares the risk score to exponentially penalize dangerous areas.
- **Environment Awareness**: The routing engine receives the current environmental state to calculate costs based on dynamic risk.

### 2. Risk Calculation (Probabilistic Model)
`Total_Risk = 1 - Product(1 - Risk_i)`
Ensures that multiple overlapping zones increase risk realistically without exceeding 1.0.

## 📡 API Endpoints

- `GET /api/nodes`: Retrieve the current routable graph nodes.
- `GET /api/risk-zones`: Retrieve all active risk hotspots.
- `POST /api/route`: Calculate paths between two node IDs.
- `POST /api/init-grid`: Fetch OSM data and rebuild the local graph.
- `POST/PUT/DELETE /api/risk-zones`: CRUD operations for safety hotspots.

## 🔒 Security & Performance
- **Routing (Web Worker)**: Heavy pathfinding is offloaded to a background `Web Worker` in the browser, leaving the main UI thread perfectly responsive.
- **Canvas Overlay**: To support thousands of graph nodes and edges, the `InfrastructureLayer` strictly bypasses the React DOM tree and renders using a batched HTML5 Canvas element synced precisely with Leaflet events.
- **Throttled Render Engine**: The `requestAnimationFrame` loop in the `useSimulation` hook runs physically at 60 FPS, but throttles React state dispatches to 30 FPS to minimize Virtual DOM layout thrashing.
- **Dynamic Route Auto-Update**: If a new risk zone intersects the currently active navigation path, the active simulation position acts as a real-time hot-start origin for a background path recalculation without disrupting the user's progress.
- **BBOX Limits**: Overpass queries are restricted to ~25km² to ensure rapid response times.
