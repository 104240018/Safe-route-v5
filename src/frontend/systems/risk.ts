/**
 * SYSTEM: Risk
 * RESPONSIBILITY: Pure logic for computing combined risk at a geographic point.
 * INPUT: Latitude, Longitude, RiskZones[], Environment
 * OUTPUT: Risk value (0.0 to 1.0)
 */

import { RiskZone, Environment } from "../types";

/**
 * Calculates decay risk from a point to a circle or polygon.
 * Combined safety logic: safety = product(1 - contribution)
 */
export function computePointRisk(lat: number, lng: number, zones: RiskZone[], env: Environment): number {
  let combinedSafety = 1.0;

  for (const zone of zones) {
    const modifiers = typeof zone.modifiers === 'string' ? JSON.parse(zone.modifiers) : (zone.modifiers || {});
    let finalRisk = zone.base_risk;

    // Apply environment modifiers
    if (env.time === 'night') finalRisk *= (modifiers.night ?? 1);
    if (env.weather === 'rain') finalRisk *= (modifiers.rain ?? 1);
    
    // Clamp risk to 1.0
    finalRisk = Math.min(finalRisk, 1.0);

    let contribution = 0;
    if (zone.type === 'circle') {
      const dist = Math.sqrt(Math.pow(lat - zone.lat, 2) + Math.pow(lng - zone.lng, 2));
      if (dist < zone.radius) {
        // Linear decay inside the radius
        contribution = (1 - dist / zone.radius) * finalRisk;
      }
    } else if (zone.type === 'polygon') {
      const points = typeof zone.points === 'string' ? JSON.parse(zone.points) : (zone.points || []);
      if (points.length > 0 && pointInPolygon(lat, lng, points)) {
        const dist = distToPolygonEdge(lat, lng, points);
        
        // Approximate 100-meter taper from the polygon edge inward
        const maxDecayDist = 0.001; 
        
        let ratio = dist / maxDecayDist; 
        ratio = Math.max(0, Math.min(1, ratio)); // Clamp 0.0 to 1.0 (1.0 = deep inside)
        
        // Match the visual gradient: edge is loosely 0.2 intensity (Green), deep inside is 1.0 (Dark Red)
        const intensity = 0.2 + (0.8 * ratio);
        
        contribution = intensity * finalRisk;
      }
    }
    
    if (contribution > 0) {
      combinedSafety *= (1 - contribution);
    }
  }

  return 1.0 - combinedSafety;
}

/**
 * Maps a risk value (0-1) to a HEX color consistent with the heatmap palette.
 */
export function getRiskColor(risk: number): string {
  if (risk <= 0.05) return '#22c55e'; // Safe Green
  if (risk <= 0.2) return '#84cc16'; // Lime
  if (risk <= 0.4) return '#eab308'; // Yellow
  if (risk <= 0.6) return '#f97316'; // Orange
  if (risk <= 0.8) return '#ef4444'; // Red
  return '#7f1d1d'; // Dark Red
}

/**
 * Ray-casting algorithm for point in polygon.
 */
function pointInPolygon(lat: number, lng: number, points: { lat: number, lng: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].lat, yi = points[i].lng;
    const xj = points[j].lat, yj = points[j].lng;
    const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Distance to polygon boundary logic.
 */
function distToPolygonEdge(lat: number, lng: number, points: { lat: number, lng: number }[]): number {
  let minDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const d = distToSegment(lat, lng, p1.lat, p1.lng, p2.lat, p2.lng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function distToSegment(pLat: number, pLng: number, s1Lat: number, s1Lng: number, s2Lat: number, s2Lng: number): number {
  const l2 = Math.pow(s1Lat - s2Lat, 2) + Math.pow(s1Lng - s2Lng, 2);
  if (l2 === 0) return Math.sqrt(Math.pow(pLat - s1Lat, 2) + Math.pow(pLng - s1Lng, 2));
  let t = ((pLat - s1Lat) * (s2Lat - s1Lat) + (pLng - s1Lng) * (s2Lng - s1Lng)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(Math.pow(pLat - (s1Lat + t * (s2Lat - s1Lat)), 2) + Math.pow(pLng - (s1Lng + t * (s2Lng - s1Lng)), 2));
}
