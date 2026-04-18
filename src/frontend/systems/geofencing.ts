/**
 * SYSTEM: Geofencing
 * RESPONSIBILITY: logic for spatial intersection between position and risk zones.
 * INPUT: activePosition, riskZones[]
 * OUTPUT: isInsideAnyZone, currentZoneStates
 */

import { RiskZone, Environment } from "../types";
import { getDistMeters } from "../utils/distance";
import { computePointRisk } from "./risk";

export interface ZoneState {
  state: 'inside' | 'outside';
  lastAlertTime: number;
  enterTime: number;
  lastStayAlertTime: number;
}

export function checkGeofences(
  activePosition: [number, number],
  riskZones: RiskZone[],
  environment: Environment,
  prevZoneStates: Record<number, ZoneState>
) {
  const now = Date.now();
  const nextZoneStates = { ...prevZoneStates };
  let isAnyZoneDangerous = false;
  let stayAlertTriggered = false;
  const alerts: {text: string, duration?: number}[] = [];
  const exits: {text: string, duration?: number}[] = [];

  riskZones.forEach(zone => {
    try {
      let isInside = false;

      const points = typeof zone.points === 'string' ? JSON.parse(zone.points) : (zone.points || []);

      if (zone.type === 'circle') {
        const zLat = zone.lat;
        const zLng = zone.lng;
        if (zLat === undefined || zLng === undefined) return;
        const dist = getDistMeters(activePosition[0], activePosition[1], zLat, zLng);
        isInside = dist < (zone.radius * 111000); // Approximation
      } else if (zone.type === 'polygon' && points.length > 2) {
        // Point in polygon Ray-Casting algorithm
        const x = activePosition[1], y = activePosition[0];
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const xi = points[i].lng, yi = points[i].lat;
          const xj = points[j].lng, yj = points[j].lat;
          
          const intersect = ((yi > y) !== (yj > y))
              && (x < (xj - xi) * (y - yi) / ((yj - yi) || 0.00001) + xi);
          if (intersect) inside = !inside;
        }
        isInside = inside;
      }

      const finalRisk = computePointRisk(activePosition[0], activePosition[1], [zone], environment);
      
      // DEBUG: Log risk levels for stay duration requirement
      if (isInside) {
        console.log(`[GEO-DEBUG] Zone ${zone.id} (${zone.category}): Risk=${finalRisk.toFixed(2)}, Inside=${isInside}`);
        isAnyZoneDangerous = true;
      }

      const prevState = prevZoneStates[zone.id] || { state: 'outside', lastAlertTime: 0, enterTime: 0, lastStayAlertTime: 0 };

    if (isInside && prevState.state === 'outside') {
        const canFirstAlert = (now - prevState.lastAlertTime > 5000);
        nextZoneStates[zone.id] = { 
          state: 'inside', 
          lastAlertTime: canFirstAlert ? now : prevState.lastAlertTime, 
          enterTime: now,
          lastStayAlertTime: 0
        };
        // Always alert on entry if the zone itself has a base risk
        if (zone.base_risk > 0.1 && canFirstAlert) {
          alerts.push({ text: `DANGER: Entering ${zone.category} zone`, duration: 10000 });
        }
    } else if (!isInside && prevState.state === 'inside') {
        nextZoneStates[zone.id] = { 
          state: 'outside', 
          lastAlertTime: now, 
          enterTime: 0,
          lastStayAlertTime: 0
        };
        exits.push({ text: 'Safety restored: Zone exited', duration: 4500 });
    } else if (isInside && prevState.state === 'inside') {
        const stayDuration = now - prevState.enterTime;

        // New Duration Response System Requirement (Risk > 0.5 for >= 30s)
        if (finalRisk > 0.5 && stayDuration >= 30000) {
          const lastStayAlert = prevState.lastStayAlertTime || 0;
          if (now - lastStayAlert > 30000) { // 30s cooldown
            stayAlertTriggered = true;
            nextZoneStates[zone.id] = { ...nextZoneStates[zone.id], lastStayAlertTime: now };
          }
        }

        // Periodic trigger: 10s active + 30s cooldown = 40s interval
        if (stayDuration > 40000 && (now - prevState.lastAlertTime > 40000)) {
          if (finalRisk > 0.1) {
            alerts.push({ text: `WARNING: Still inside ${zone.category} hazard area!`, duration: 10000 });
            nextZoneStates[zone.id] = { ...nextZoneStates[zone.id], lastAlertTime: now };
          }
        }
    }
    } catch (e) {
      console.error("Geofence check error:", e);
    }
  });

  return { isAnyZoneDangerous, nextZoneStates, alerts, exits, stayAlertTriggered };
}
