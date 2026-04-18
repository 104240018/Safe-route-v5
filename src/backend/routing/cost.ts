/**
 * SYSTEM: Cost
 * RESPONSIBILITY: Calculates the traversal cost of an edge considering distance and risk.
 * INPUT: distance, risk intensity, risk weight
 * OUTPUT: Weighted cost
 */

/**
 * g(n) cost function.
 * cost = distance + (riskWeight * risk^2)
 */
export function calculateEdgeCost(distance: number, risk: number, riskWeight: number): number {
  // Heavily penalize high risk if riskWeight > 0
  const riskPenalty = Math.pow(risk, 2) * riskWeight * 100; 
  return distance + riskPenalty;
}
