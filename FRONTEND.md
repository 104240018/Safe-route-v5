🧠 Overview

The frontend is built using React (Vite) and acts as a real-time control system that:

Manages global application state
Coordinates multiple subsystems (routing, simulation, geofencing)
Communicates with the backend API
Renders a high-performance interactive map using Leaflet

At the center of the system is App.tsx, which orchestrates all logic and UI components.

🏗️ Architecture

The frontend follows a layered structure:

App.tsx (Global Orchestrator)
   ↓
Hooks (System Logic Layer)
   ↓
Components (UI Layer)
   ↓
Map Engine (Leaflet Rendering)
⚙️ Core Systems (Hooks)

The main logic of the application is encapsulated in custom React hooks.

1. 🧭 Routing System (Client Orchestrator)

The routing system is implemented in useRouting and is responsible for managing graph data, pathfinding requests, and route state.

Web Worker Offloading

All heavy pathfinding is executed inside a Web Worker:

Prevents UI blocking
Allows smooth interaction even with large graphs
Enables concurrent computation
Graph Synchronization

Instead of sending graph data on every request:

Nodes and edges are synced once to the worker
Subsequent route calculations reuse this data

This significantly improves performance and scalability.

Route Calculation

Two routes are computed using the same A* algorithm:

Shortest Path
riskWeight = 0
Safest Path
riskWeight = 50

This allows real-time comparison between efficiency and safety.

Data Flow
User selects start/end
   ↓
useRouting sends request to Worker
   ↓
Worker runs A* algorithm
   ↓
Returns path + metrics
   ↓
Frontend updates UI
Escape Route System

The system supports emergency navigation:

Finds the nearest safe node
Computes a path away from danger zones
Automatically updates the UI and simulation

This enables dynamic safety-driven navigation.

Concurrency Handling

To prevent outdated results:

Each request is assigned an ID
Only the latest response is accepted

This avoids race conditions during rapid updates.

2. useSimulation

Controls navigation playback:

Moves the user marker along the path
Uses requestAnimationFrame for smooth animation
Supports speed multiplier (x1 → x20)
Tracks navigation state:
idle
navigating
paused
3. useGeofencing

Implements a state machine for risk zones:

Detects:
ENTER
EXIT
STAY (prolonged exposure)
Triggers alerts and escape prompts
Prevents alert spam via cooldown logic
4. useEnvironment

Manages global environmental conditions:

Time: day / night
Weather: clear / rain

This directly affects risk calculations across the system.

🔄 Data Flow

The frontend follows a predictable data loop:

User Interaction
   ↓
State Update (React)
   ↓
API Request (/api/route, /api/init-grid, etc.)
   ↓
Backend Processing (A* + Risk)
   ↓
Response Data
   ↓
UI Rendering (Map + Panels)
🗺️ Map System (Core Engine)

The map is the central visualization layer:

Responsibilities:
Render:
nodes and edges
shortest & safest paths
risk zones (heatmap)
Handle user interaction:
click to set start/end
draw zones (circle/polygon)
Track hover risk in real time
Key Features:
Auto-follow during simulation
Zoom-consistent rendering
Dynamic updates when risk zones change

🚶 Simulation System (Navigation Engine)

The simulation system is implemented in useSimulation and acts as a real-time navigation engine.

It is responsible for moving the user along a computed route while continuously updating navigation metrics.

Core Responsibilities
Animate movement along path nodes
Track navigation progress and segment transitions
Compute:
distance traveled
distance remaining
estimated time remaining
Handle navigation lifecycle:
idle → navigating → paused → completed
Animation Loop

The system uses:

requestAnimationFrame for smooth rendering (~60 FPS)
Time-based updates (deltaTime) for consistent motion regardless of frame rate

Each frame:

Compute elapsed time (dt)
Advance position along current segment
Update progress and metrics
Move to next segment if needed
Movement Model
Path is divided into segments between nodes
Each segment has a precomputed distance
Movement is interpolated continuously between nodes

This ensures:

Smooth motion (not jumping node-to-node)
Accurate distance tracking
Speed System

Each travel mode has a base speed:

Walk
Drone
Car

Final speed is scaled by:

speed = baseSpeed × simulationMultiplier

This allows real-time acceleration (x1 → x20).

Dynamic Route Recalculation

When the route changes (e.g., new hazard appears):

Segment distances are recomputed
Navigation state is reset
Simulation restarts from updated path

This enables:

real-time adaptive navigation

Completion Handling

The simulation automatically stops when:

Final segment is reached
Progress ≥ 100%

It then transitions back to:

status = 'idle'
Stability & Safety Features
Delta time cap prevents large jumps when tab is inactive
Animation cleanup prevents memory leaks
Frame cancellation ensures no duplicate loops
⚠️ Dynamic Risk Interaction

The frontend continuously reacts to environmental changes:

Adding a new risk zone:
→ checks intersection with active route
→ triggers automatic rerouting
Staying too long in danger:
→ triggers escape prompt
→ calculates safe exit route

🧩 Key Components
Layout
Header → global controls (dev mode, theme)
StatusBanner → system alerts
Sidebars
LeftSidebar → controls, simulation, environment
RightSidebar → analytics, route comparison
Map
MapView → main spatial engine
HeatmapLayer → risk visualization
MarkerSimulation → animated navigation marker

🎯 Design Philosophy

The frontend is designed as a real-time reactive system, not just a UI:

State-driven architecture (React hooks)
Separation of concerns (logic vs UI)
Continuous feedback loop between user, system, and environment

🚀 Summary

The SafeRoute frontend acts as:

A real-time decision engine that integrates routing, risk analysis, and simulation into a single interactive system.

It is responsible for transforming backend data into meaningful, actionable navigation insights for the user.