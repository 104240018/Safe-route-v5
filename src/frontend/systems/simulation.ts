/**
 * SYSTEM: Simulation
 * RESPONSIBILITY: Pure logic for interpolating movement along a geographic path.
 * INPUT: NavState, PathNode[], deltaTime, simMultiplier
 * OUTPUT: Updated NavState
 */

import { NavState, Node } from "../types";
import { getDistMeters } from "../utils/distance";

export const SPEEDS = {
  walk: 1.39, // m/s
  bike: 11.11,
  car: 16.67
};

export function calculateNextNavState(
  prevState: NavState,
  path: Node[],
  deltaTime: number,
  simMultiplier: number
): NavState {
  if (prevState.status !== 'navigating' || path.length < 2) return prevState;

  const distanceStep = prevState.speed * simMultiplier * deltaTime;
  const newDistanceTraveled = prevState.distanceTraveled + distanceStep;

  if (newDistanceTraveled >= prevState.totalDistance) {
    const last = path[path.length - 1];
    return {
      ...prevState,
      status: 'idle',
      progress: 1,
      distanceTraveled: prevState.totalDistance,
      distanceRemaining: 0,
      timeRemaining: 0,
      currentPosition: [last.lat, last.lng]
    };
  }

  // Find position along path
  let accumulatedDist = 0;
  let currentPos: [number, number] = [path[0].lat, path[0].lng];
  let segmentIndex = 0;

  const segDists = prevState.segmentDistances || [];

  for (let i = 0; i < path.length - 1; i++) {
    const d = segDists[i] ?? getDistMeters(path[i].lat, path[i].lng, path[i + 1].lat, path[i + 1].lng);

    if (accumulatedDist + d >= newDistanceTraveled) {
      const remaining = newDistanceTraveled - accumulatedDist;
      const ratio = remaining / d;
      const p1 = path[i];
      const p2 = path[i + 1];
      currentPos = [
        p1.lat + (p2.lat - p1.lat) * ratio,
        p1.lng + (p2.lng - p1.lng) * ratio
      ];
      segmentIndex = i;
      break;
    }
    accumulatedDist += d;
  }

  const remainingMeters = prevState.totalDistance - newDistanceTraveled;

  return {
    ...prevState,
    currentPosition: currentPos,
    currentSegmentIndex: segmentIndex,
    progress: newDistanceTraveled / prevState.totalDistance,
    distanceTraveled: newDistanceTraveled,
    distanceRemaining: remainingMeters,
    timeRemaining: remainingMeters / prevState.speed
  };
}
