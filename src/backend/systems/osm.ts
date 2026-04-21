/**
 * SYSTEM: OSM Service
 * RESPONSIBILITY: Fetches road network data from Overpass API.
 * INPUT: Bounding box string
 * OUTPUT: GeoJSON data
 */

import osmtogeojson from "osmtogeojson";

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter"

];

export async function fetchOSMData(bbox: string) {
  if (bbox.includes("NaN")) {
    throw new Error("Invalid BBOX coordinates (NaN detected)");
  }

  const overpassQuery = `
[out:json][timeout:25];
(
  way["highway"](${bbox});
);
out body;
>;
out skel qt;
`;

  const endpoint = "https://overpass.kumi.systems/api/interpreter";

  const body = new URLSearchParams();
  body.append("data", overpassQuery);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 100000);

  const osmRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "*/*",
      "User-Agent": "Mozilla/5.0 (SafeRoute/1.0)"
    },
    body,
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  console.log("STATUS:", osmRes.status);
  console.log("CONTENT-TYPE:", osmRes.headers.get("content-type"));

  const osmData = await osmRes.json();

  console.log("OSM elements:", osmData.elements?.length);

  return osmtogeojson(osmData) as any;
}