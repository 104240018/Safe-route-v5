/**
 * UTIL: Distance
 * RESPONSIBILITY: Geographic distance calculations.
 */

/**
 * Returns distance in meters between two [lat, lng] points.
 * Rough approximation for local areas.
 */
export function getDistMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Standard Euclidean distance in degrees.
 */
export function getDistanceDegrees(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
}
