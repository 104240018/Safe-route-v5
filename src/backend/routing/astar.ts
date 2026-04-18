/**
 * SYSTEM: A* Routing
 * RESPONSIBILITY: Implements the A* search algorithm for finding paths on the graph.
 * INPUT: startId, endId, riskWeight, environment, nodes, edges, riskZones
 * OUTPUT: Route path and metrics
 */

import { calculateHeuristic } from "./heuristic.js";
import { calculateEdgeCost } from "./cost.js";
import { buildAdjacencyMap } from "./graph.js";
import { computePointRisk } from "../systems/risk.js";

export interface Node {
  id: string;
  lat: number;
  lng: number;
  risk?: number;
}

export interface Edge {
  from_id: string;
  to_id: string;
  distance: number;
}

class PriorityQueue<T> {
  private items: { priority: number; value: T }[] = [];
  push(value: T, priority: number) {
    this.items.push({ value, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }
  pop(): T | undefined {
    return this.items.shift()?.value;
  }
  get size() { return this.items.length; }
}

export function aStar(
  startId: string, 
  endId: string, 
  riskWeight: number, 
  env: any, 
  nodes: Node[], 
  edges: Edge[], 
  riskZones: any[]
) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adj = buildAdjacencyMap(edges);

  const startNode = nodeMap.get(startId);
  const endNode = nodeMap.get(endId);
  if (!startNode || !endNode) return { path: [], metrics: null };

  const gScore: Record<string, number> = {};
  const fScore: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const openSet = new PriorityQueue<string>();

  for (const node of nodes) {
    gScore[node.id] = Infinity;
    fScore[node.id] = Infinity;
  }

  gScore[startId] = 0;
  fScore[startId] = calculateHeuristic(startNode.lat, startNode.lng, endNode.lat, endNode.lng);
  openSet.push(startId, fScore[startId]);

  let evaluations = 0;
  while (openSet.size > 0) {
    const uId = openSet.pop()!;
    evaluations++;

    if (uId === endId) break;

    const neighbors = adj.get(uId) || [];
    for (const edge of neighbors) {
      const vId = edge.to_id;
      const vNode = nodeMap.get(vId);
      if (!vNode) continue;

      const risk = computePointRisk(vNode.lat, vNode.lng, riskZones, env);
      const weight = calculateEdgeCost(edge.distance, risk, riskWeight);

      const tentativeGScore = gScore[uId] + weight;
      if (tentativeGScore < gScore[vId]) {
        previous[vId] = uId;
        gScore[vId] = tentativeGScore;
        fScore[vId] = gScore[vId] + calculateHeuristic(vNode.lat, vNode.lng, endNode.lat, endNode.lng);
        openSet.push(vId, fScore[vId]);
      }
    }
    
    if (evaluations > 25000) break;
  }

  // Reconstruction
  const path: Node[] = [];
  let curr: string | null = endId;
  let totalRisk = 0;
  let zonesIntersected = 0;
  let totalDistance = 0;

  if (gScore[endId] === Infinity) {
    return { path: [], metrics: null };
  }

  while (curr) {
    const node = nodeMap.get(curr)!;
    const risk = computePointRisk(node.lat, node.lng, riskZones, env);
    totalRisk += risk;
    if (risk > 0.2) zonesIntersected++;

    const prevId = previous[curr];
    if (prevId) {
      const prevNode = nodeMap.get(prevId)!;
      totalDistance += calculateHeuristic(node.lat, node.lng, prevNode.lat, prevNode.lng);
    }

    path.unshift({ ...node, risk });
    curr = prevId;
  }

  const avgRisk = totalRisk / (path.length || 1);
  const confidence = Math.max(0, 100 - (avgRisk * 80) - (zonesIntersected * 5));

  return {
    path,
    metrics: {
      totalRisk: avgRisk,
      zonesIntersected,
      distance: totalDistance * 111, // km approx
      confidence: Math.round(confidence)
    }
  };
}
