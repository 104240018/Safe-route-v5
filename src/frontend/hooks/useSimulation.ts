/**
 * HOOK: useSimulation
 * RESPONSIBILITY: Manages navigation state and the animation loop for simulation.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { NavState, Node, TravelMode } from '../types';
import { calculateNextNavState, SPEEDS } from '../systems/simulation';
import { getDistMeters } from '../utils/distance';

export function useSimulation(path: Node[], simMultiplier: number) {
  const [navState, setNavState] = useState<NavState>({
    status: 'idle',
    currentPosition: null,
    currentSegmentIndex: 0,
    progress: 0,
    travelMode: 'walk',
    speed: SPEEDS.walk,
    distanceRemaining: 0,
    timeRemaining: 0,
    distanceTraveled: 0,
    totalDistance: 0
  });

  const [navWarnings, setNavWarnings] = useState<string[]>([]);
  const navFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const startNavigation = useCallback((mode: TravelMode) => {
    if (path.length < 2) return;

    const segDistances: number[] = [];
    let totalMeters = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const d = getDistMeters(path[i].lat, path[i].lng, path[i+1].lat, path[i+1].lng);
      segDistances.push(d);
      totalMeters += d;
    }

    setNavState({
      status: 'navigating',
      travelMode: mode,
      speed: SPEEDS[mode],
      currentPosition: [path[0].lat, path[0].lng],
      currentSegmentIndex: 0,
      progress: 0,
      distanceTraveled: 0,
      totalDistance: totalMeters,
      distanceRemaining: totalMeters,
      timeRemaining: totalMeters / SPEEDS[mode],
      segmentDistances: segDistances
    });
    setNavWarnings([]);
    lastUpdateRef.current = performance.now();
  }, [path]);

  const pauseNavigation = useCallback(() => {
    setNavState(prev => ({ ...prev, status: 'paused' }));
  }, []);

  const stopNavigation = useCallback(() => {
    setNavState(prev => ({ ...prev, status: 'idle', currentPosition: null }));
    setNavWarnings([]);
  }, []);

  // Handle dynamic route recalculation (e.g., when a hazard spawns on the path)
  useEffect(() => {
    if (navState.status === 'navigating' && path.length >= 2) {
      const segDistances: number[] = [];
      let totalMeters = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const d = getDistMeters(path[i].lat, path[i].lng, path[i+1].lat, path[i+1].lng);
        segDistances.push(d);
        totalMeters += d;
      }
      
      setNavState(prev => {
        if (Math.abs(prev.totalDistance - totalMeters) > 5) { 
          return {
            ...prev,
            currentSegmentIndex: 0,
            progress: 0,
            distanceTraveled: 0,
            totalDistance: totalMeters,
            distanceRemaining: totalMeters,
            timeRemaining: totalMeters / prev.speed,
            currentPosition: [path[0].lat, path[0].lng],
            segmentDistances: segDistances
          };
        }
        return prev;
      });
    }
  }, [path]);

  useEffect(() => {
    if (navState.status !== 'navigating') {
      if (navFrameRef.current) cancelAnimationFrame(navFrameRef.current);
      return;
    }

    const update = (time: number) => {
      const deltaTimeMs = time - lastUpdateRef.current;
      lastUpdateRef.current = time;
      
      // Safety cap for deltaTime to prevent huge jumps on tab switch
      const dt = Math.min(deltaTimeMs, 100) / 1000;

      setNavState(prev => {
        const next = calculateNextNavState(prev, path, dt, simMultiplier);

        // 🔥 STOP when finished
        const isFinished =
          next.currentSegmentIndex >= path.length - 1 &&
          next.progress >= 1;

        if (isFinished) {
          return {
            ...next,
            status: 'idle',           // 🔥 EXIT NAV MODE
            currentPosition: next.currentPosition,
          };
        }

        return next;
      });
        if (navFrameRef.current && navState.status === 'idle') {
        cancelAnimationFrame(navFrameRef.current);
      }
      navFrameRef.current = requestAnimationFrame(update);
    };

    lastUpdateRef.current = performance.now();
    navFrameRef.current = requestAnimationFrame(update);
    
    return () => {
      if (navFrameRef.current) cancelAnimationFrame(navFrameRef.current);
    };
  }, [navState.status, path, simMultiplier]);

  return {
    navState,
    navWarnings,
    setNavWarnings,
    startNavigation,
    pauseNavigation,
    stopNavigation
  };
}
