SafeRoute – Architecture Guide 🧠

This document explains how SafeRoute works from a big-picture perspective, designed for developers who are new to the project.

🌍 1. What is SafeRoute?

SafeRoute is a navigation system that finds routes based on:

Distance (Shortest Path)
Safety (Risk-Aware Path)

Instead of only finding the fastest route, SafeRoute can avoid dangerous areas using a dynamic risk model.

🔁 2. End-to-End System Flow (MOST IMPORTANT)

This is the full pipeline of how the system works:

User interacts with map
   ↓
Frontend sends request to backend
   ↓
/api/init-grid → Fetch road data from OpenStreetMap
   ↓
Road network is built (nodes + edges)
   ↓
User selects start and destination
   ↓
/api/route is called
   ↓
A* algorithm runs twice:
   → Shortest Path (ignores risk)
   → Safest Path (penalizes risk)
   ↓
Routes returned to frontend
   ↓
Displayed on map with metrics
🧩 3. Core Concepts
3.1 Graph (Road Network)

The system converts real-world roads into a graph:

Nodes → Points on roads (latitude, longitude)
Edges → Connections between nodes
Distance → Calculated between points

This graph is stored in a local SQLite database.

3.2 Risk Model

SafeRoute introduces a risk field on top of the map.

Risk Zones
Defined as circles or polygons
Each zone has:
Base risk (0 → 1)
Optional modifiers (night, rain)
Environment Effects

Risk changes dynamically based on:

Time → day / night
Weather → clear / rain
Final Risk Formula
finalRisk = baseRisk × timeModifier × weatherModifier
3.3 Risk Combination

If multiple zones overlap, risk is combined using:

Total Risk = 1 - (1 - r₁)(1 - r₂)(1 - r₃)

This ensures:

Risk increases with overlap
Never exceeds 1.0
3.4 Cost Function (Key Idea)

The routing algorithm does NOT just use distance.

Instead:

Cost = Distance + (RiskWeight × Risk²)
Shortest Route → RiskWeight = 0
Safest Route → RiskWeight = 50
Why Risk²?
Low risk → small penalty
High risk → heavily penalized

This makes the system strongly avoid dangerous areas.

3.5 A* Pathfinding Algorithm

SafeRoute uses the A* algorithm to find optimal paths.

How it works:
Explores the graph efficiently
Uses a heuristic (straight-line distance)
Chooses the lowest total cost path
Key Idea:
Same algorithm
Different cost → different behavior
🔀 4. Why Two Routes?

SafeRoute always computes:

1. Shortest Path
Ignores risk
Minimizes distance only
2. Safest Path
Avoids high-risk zones
May be longer but safer
Example

If a dangerous zone lies between two points:

Shortest Path → goes straight through
Safest Path → goes around it
🗺️ 5. Data Source (OpenStreetMap)

SafeRoute uses the Overpass API to fetch real-world road data.

Process:
Request roads inside a bounding box
Convert data to GeoJSON
Extract:
Coordinates → nodes
Road segments → edges
⚙️ 6. Graph Construction
Every coordinate point becomes a node
Edges connect consecutive points
Graph is bidirectional (can travel both ways)

This allows smooth and flexible routing.

📊 7. Metrics and Output

For each route, the system calculates:

Distance
Average Risk
Zones Intersected
Confidence Score
Confidence Score
Confidence = 100 - (Risk × 80) - (Zones × 5)

Higher confidence = safer route.

⚠️ 8. Limitations (Important)

This system is designed for demonstration purposes and has some simplifications:

Uses Euclidean distance (not exact geographic distance)
Does not handle one-way roads
Does not consider traffic or speed limits
Risk is calculated per node, not continuously along edges
Road types are not weighted differently
🚀 9. Summary

SafeRoute combines:

Real-world map data
        +
Dynamic risk modeling
        +
Custom cost function
        +
A* pathfinding
        =
Safe + efficient navigation