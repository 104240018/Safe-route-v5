# SafeRoute 🛡️

SafeRoute is a professional public safety navigation system that prioritizes personal security over speed. It analyzes urban risk data in real-time to suggest the safest possible paths through a city.

## 🚀 Key Features

- **Navigation Simulation**: Experience your journey before you leave. Simulate movement along routes with adjustable speeds (Walking, Biking, Driving) and a **x1 to x20 speed multiplier**.
- **High-Fidelity Heatmaps**: Visualize environmental risk with a smooth, gradient-based heatmap that accurately reflects hazard intensity and additive risk overlaps.
- **Predictive Hazard Alerts**: Receive real-time warnings when your simulated or actual position approaches high-risk zones.
- **Intelligent Routing**: Compare the "Shortest Path" with a "Safest Path" that detours around dangerous hotspots using a modified Dijkstra algorithm.
- **Real-World Data**: Powered by OpenStreetMap (OSM) via the Overpass API for accurate road geometries and intersections.

## 🎨 UI/UX Overview

SafeRoute features a high-performance, professional dashboard designed for clarity and rapid decision-making:

- **Navigator (Left Sidebar)**: Your command center for setting routes, selecting travel modes, and controlling the simulation speed.
- **Analytics (Right Sidebar)**: Detailed breakdown of route safety, distance metrics, and a real-time risk gauge.
- **Dynamic Map**: An interactive map with auto-follow behavior, night mode support, and a zoom-consistent risk heatmap.
- **Status Banner**: Immediate feedback on system health, data fetching, and routing status.

## 🚀 Getting Started

1. **Initialize Map**: Click "Download Real Road Data" in the sidebar to fetch the street network for your current area.
2. **Set Route**: Click on the map to set your **Start (A)** and **Destination (B)**.
3. **Analyze**: Review the safety metrics in the right sidebar to choose the best path.
4. **Simulate**: Select a travel mode (Walk/Bike/Car) and hit **Start** to see the simulation in action.

## 🛠️ Technical Details

For developers interested in the routing algorithms, risk models, and component architecture, please refer to the [DEVELOPER.md](./DEVELOPER.md) file.
