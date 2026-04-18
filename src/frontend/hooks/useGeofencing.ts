/**
 * HOOK: useGeofencing
 * RESPONSIBILITY: Periodically triggers the geofencing system logic.
 */

import { useState, useRef, useEffect } from 'react';
import { RiskZone, Environment } from '../types';
import { checkGeofences, ZoneState } from '../systems/geofencing';

export function useGeofencing(
  activePosition: [number, number],
  riskZones: RiskZone[],
  environment: Environment,
  onAlert: (msg: string, type: 'error' | 'success', duration?: number) => void
) {
  const [isRiskAlert, setIsRiskAlert] = useState(false);
  const [stayAlertTriggered, setStayAlertTriggered] = useState(false);
  const [tick, setTick] = useState(0);
  const zoneStatesRef = useRef<Record<number, ZoneState>>({});
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const now = Date.now();
    // Throttle checks to 200ms
    if (now - lastCheckRef.current < 200) return;
    lastCheckRef.current = now;

    const { isAnyZoneDangerous, nextZoneStates, alerts, exits, stayAlertTriggered: triggered } = checkGeofences(
      activePosition,
      riskZones,
      environment,
      zoneStatesRef.current
    );

    // Update tracking ref without triggering re-render
    zoneStatesRef.current = nextZoneStates;
    
    // Only update state if visibility changed
    setIsRiskAlert(isAnyZoneDangerous);
    if (triggered) setStayAlertTriggered(true);
    
    // Side effects for alerts
    alerts.forEach(msg => onAlert(msg.text, 'error', msg.duration));
    exits.forEach(msg => onAlert(msg.text, 'success', msg.duration));

  }, [activePosition, riskZones, environment, onAlert, tick]);

  return {
    isRiskAlert,
    stayAlertTriggered,
    setStayAlertTriggered
  };
}
