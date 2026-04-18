/**
 * SYSTEM: OSM Service
 * RESPONSIBILITY: Fetches road network data from Overpass API.
 * INPUT: Bounding box string
 * OUTPUT: GeoJSON data
 */

import osmtogeojson from "osmtogeojson";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.ch/api/interpreter"
];

export async function fetchOSMData(bbox: string) {
  if (bbox.includes("NaN")) {
    throw new Error("Invalid BBOX coordinates (NaN detected)");
  }
  
  const parts = bbox.split(",").map(Number);
  if (parts.length === 4) {
    const latDiff = Math.abs(parts[2] - parts[0]);
    const lngDiff = Math.abs(parts[3] - parts[1]);
    if (latDiff > 0.05 || lngDiff > 0.05) {
      throw new Error("Search area too large (max ~5km footprint). Please zoom in or select points closer together to prevent server overload.");
    }
  }
  
  const overpassQuery = `[out:json][timeout:90];(way["highway"](${bbox});>;);out body qt;`;
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const url = `${endpoint}?data=${encodeURIComponent(overpassQuery)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100000);

      const osmRes = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!osmRes.ok) {
        if (osmRes.status === 429 || osmRes.status === 504 || osmRes.status === 502) {
          lastError = new Error(`Overpass API (${endpoint}) returned ${osmRes.status}`);
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue; 
        }
        throw new Error(`Overpass API returned ${osmRes.status}`);
      }

      const osmData = await osmRes.json();
      return osmtogeojson(osmData) as any;
    } catch (error) {
      lastError = error as Error;
      continue;
    }
  }

  throw lastError || new Error("All Overpass API endpoints failed");
}
