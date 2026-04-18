/**
 * SYSTEM: Heuristic
 * RESPONSIBILITY: Admissible heuristic function for A* algorithm.
 * INPUT: Current coordinates, Destination coordinates
 * OUTPUT: Straight-line distance (Euclidean or Haversine)
 */

/**
 * Calculates straight-line distance between two points.
 * Using Euclidean distance for simple planar approximation in local areas.
 * h(n) must be admissible (never overestimate).
 */
export function calculateHeuristic(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
}
