/**
 * SYSTEM: Road Network
 * RESPONSIBILITY: Logic for processing OSM data and updating the local graph database.
 * INPUT: OSM GeoJSON, DB connection
 * OUTPUT: Success/Failure status, synchronization with SQLite
 */

import { fetchOSMData } from "./osm.ts";
import { db } from "../db.ts";

const EXCLUDED_HIGHWAYS = ["footway", "cycleway", "path", "steps", "pedestrian", "service"];

export async function initializeGrid(lat: number, lng: number, radius: number, endLat?: number, endLng?: number) {
  let bbox = "";
  if (endLat && endLng) {
    const minLat = Math.min(lat, endLat);
    const maxLat = Math.max(lat, endLat);
    const minLng = Math.min(lng, endLng);
    const maxLng = Math.max(lng, endLng);
    // Use the radius as a buffer around the bounding box of path points
    bbox = `${minLat - radius},${minLng - radius},${maxLat + radius},${maxLng + radius}`;
  } else {
    bbox = `${lat - radius},${lng - radius},${lat + radius},${lng + radius}`;
  }

  const geojson = await fetchOSMData(bbox);
    console.log("BBOX:", bbox);
console.log("GeoJSON features:", geojson.features.length);
  // Database Transaction for atomicity
  const sync = db.transaction(() => {
    db.prepare("DELETE FROM edges").run();
    db.prepare("DELETE FROM nodes").run();

    const insertNode = db.prepare("INSERT OR IGNORE INTO nodes (id, lat, lng) VALUES (?, ?, ?)");
    const insertEdge = db.prepare("INSERT INTO edges (from_id, to_id, distance) VALUES (?, ?, ?)");

    geojson.features.forEach((feature: any) => {
      if (!feature.geometry) return;

      const highway = feature.properties?.highway;

      // optional: disable filter for debugging
      // if (EXCLUDED_HIGHWAYS.includes(highway)) return;

      let lines: number[][][] = [];

      if (feature.geometry.type === "LineString") {
        lines = [feature.geometry.coordinates];
      } else if (feature.geometry.type === "MultiLineString") {
        lines = feature.geometry.coordinates;
      } else {
        return;
      }

      for (const coords of lines) {
        for (let i = 0; i < coords.length - 1; i++) {
          const p1 = coords[i];
          const p2 = coords[i + 1];

          const id1 = `${p1[1].toFixed(6)}_${p1[0].toFixed(6)}`;
          const id2 = `${p2[1].toFixed(6)}_${p2[0].toFixed(6)}`;

          insertNode.run(id1, p1[1], p1[0]);
          insertNode.run(id2, p2[1], p2[0]);

          const dist = Math.sqrt(
            Math.pow(p1[1] - p2[1], 2) +
            Math.pow(p1[0] - p2[0], 2)
          );

          insertEdge.run(id1, id2, dist);
          insertEdge.run(id2, id1, dist);
        }
      }
    });

    const count = db.prepare("SELECT COUNT(*) as count FROM nodes").get() as { count: number };
    return count.count;
  });

  const nodeCount = sync();

  return { success: true, nodeCount };
}
