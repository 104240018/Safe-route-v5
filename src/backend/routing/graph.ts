/**
 * SYSTEM: Graph
 * RESPONSIBILITY: Graph utilities for navigating nodes and edges.
 * INPUT: Database connection
 * OUTPUT: Adjacency maps, neighbor lookups
 */

import { Node, Edge } from "./astar.js";

export function buildAdjacencyMap(edges: Edge[]): Map<string, Edge[]> {
  const adj = new Map<string, Edge[]>();
  for (const edge of edges) {
    if (!adj.has(edge.from_id)) adj.set(edge.from_id, []);
    adj.get(edge.from_id)!.push(edge);
  }
  return adj;
}
