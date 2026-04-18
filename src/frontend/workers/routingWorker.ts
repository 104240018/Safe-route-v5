/**
 * WEB WORKER: Routing
 * RESPONSIBILITY: Executes A* pathfinding in a separate thread to keep UI fluid.
 */

let graphNodes: any[] = [];
let graphEdges: any[] = [];

self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'SYNC_GRAPH') {
    graphNodes = data.nodes;
    graphEdges = data.edges;
    self.postMessage({ type: 'SYNC_COMPLETE' });
  } else if (type === 'CALCULATE_ROUTE') {
    const { startId, endId, riskWeight, env, riskZones } = data;
    const result = aStar(startId, endId, riskWeight, env, graphNodes, graphEdges, riskZones);
    self.postMessage({ type: 'ROUTE_RESULT', data: result });
  } else if (type === 'CALCULATE_ESCAPE_ROUTE') {
    const { startId, env, riskZones, riskThreshold } = data;
    const result = escapeAStar(startId, riskThreshold, env, graphNodes, graphEdges, riskZones);
    self.postMessage({ type: 'ESCAPE_ROUTE_RESULT', data: result });
  }
};

// --- Inlined A* and Dependencies for Worker Self-Containment ---

function calculateHeuristic(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
}

function calculateEdgeCost(distance: number, risk: number, riskWeight: number): number {
  const riskPenalty = Math.pow(risk, 2) * riskWeight * 100; 
  return distance + riskPenalty;
}

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

function distToSegment(pLat: number, pLng: number, s1Lat: number, s1Lng: number, s2Lat: number, s2Lng: number): number {
  const l2 = Math.pow(s1Lat - s2Lat, 2) + Math.pow(s1Lng - s2Lng, 2);
  if (l2 === 0) return Math.sqrt(Math.pow(pLat - s1Lat, 2) + Math.pow(pLng - s1Lng, 2));
  let t = Math.max(0, Math.min(1, ((pLat - s1Lat) * (s2Lat - s1Lat) + (pLng - s1Lng) * (s2Lng - s1Lng)) / l2));
  return Math.sqrt(Math.pow(pLat - (s1Lat + t * (s2Lat - s1Lat)), 2) + Math.pow(pLng - (s1Lng + t * (s2Lng - s1Lng)), 2));
}

function distToPolygonEdge(lat: number, lng: number, points: { lat: number, lng: number }[]): number {
  let minDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = distToSegment(lat, lng, points[i].lat, points[i].lng, points[(i + 1) % points.length].lat, points[(i + 1) % points.length].lng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/** True if (lat,lng) lies inside any zone's geographic boundary (circle or polygon), ignoring risk gradient. */
function isInsideAnyZoneGeometry(lat: number, lng: number, zones: any[]): boolean {
  for (const zone of zones) {
    if (zone.type === 'circle') {
      const dist = Math.sqrt(Math.pow(lat - zone.lat, 2) + Math.pow(lng - zone.lng, 2));
      if (dist < zone.radius) return true;
    } else if (zone.type === 'polygon') {
      const pts = typeof zone.points === 'string' ? JSON.parse(zone.points) : zone.points;
      if (pts && pts.length > 0 && pointInPolygon(lat, lng, pts)) return true;
    }
  }
  return false;
}

function computePointRisk(lat: number, lng: number, zones: any[], env: any): number {
  let combinedSafety = 1.0;
  for (const zone of zones) {
    const modifiers = typeof zone.modifiers === 'string' ? JSON.parse(zone.modifiers) : (zone.modifiers || {});
    let finalRisk = zone.base_risk;
    if (env.time === 'night') finalRisk *= (modifiers.night ?? 1);
    if (env.weather === 'rain') finalRisk *= (modifiers.rain ?? 1);
    finalRisk = Math.min(finalRisk, 1.0);

    let contribution = 0;
    if (zone.type === 'circle') {
      const dist = Math.sqrt(Math.pow(lat - zone.lat, 2) + Math.pow(lng - zone.lng, 2));
      if (dist < zone.radius) contribution = (1 - dist / zone.radius) * finalRisk;
    } else if (zone.type === 'polygon') {
      const pts = typeof zone.points === 'string' ? JSON.parse(zone.points) : zone.points;
      if (pts && pts.length > 0 && pointInPolygon(lat, lng, pts)) {
        const d = distToPolygonEdge(lat, lng, pts);
        contribution = Math.min(1, (1 - d / 0.003)) * finalRisk;
      }
    }
    if (contribution > 0) combinedSafety *= (1 - contribution);
  }
  return 1.0 - combinedSafety;
}

class PriorityQueue<T> {
  private items: { priority: number; value: T }[] = [];
  push(value: T, priority: number) {
    this.items.push({ value, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }
  pop(): T | undefined { return this.items.shift()?.value; }
  get size() { return this.items.length; }
}

function aStar(startId: string, endId: string, riskWeight: number, env: any, nodes: any[], edges: any[], riskZones: any[]) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adj = new Map<string, any[]>();
  for (const edge of edges) {
    if (!adj.has(edge.from_id)) adj.set(edge.from_id, []);
    adj.get(edge.from_id)!.push(edge);
  }

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

  let evals = 0;
  while (openSet.size > 0) {
    const uId = openSet.pop()!;
    evals++;
    if (uId === endId) break;

    const neighbors = adj.get(uId) || [];
    for (const edge of neighbors) {
      const vId = edge.to_id;
      const vNode = nodeMap.get(vId);
      if (!vNode) continue;

      const risk = computePointRisk(vNode.lat, vNode.lng, riskZones, env);
      const weight = calculateEdgeCost(edge.distance, risk, riskWeight);
      const tentG = gScore[uId] + weight;

      if (tentG < gScore[vId]) {
        previous[vId] = uId;
        gScore[vId] = tentG;
        fScore[vId] = tentG + calculateHeuristic(vNode.lat, vNode.lng, endNode.lat, endNode.lng);
        openSet.push(vId, fScore[vId]);
      }
    }
    if (evals > 25000) break;
  }

  const path = [];
  let curr = endId;
  let totalRisk = 0;
  let zonesInt = 0;
  let totalDist = 0;

  if (gScore[endId] === Infinity) return { path: [], metrics: null };

  while (curr) {
    const node = nodeMap.get(curr)!;
    const risk = computePointRisk(node.lat, node.lng, riskZones, env);
    totalRisk += risk;
    if (risk > 0.2) zonesInt++;
    const prevId = previous[curr];
    if (prevId) {
      const pNode = nodeMap.get(prevId)!;
      totalDist += calculateHeuristic(node.lat, node.lng, pNode.lat, pNode.lng);
    }
    path.unshift({ ...node, risk });
    curr = prevId!;
  }

  const avgRisk = totalRisk / (path.length || 1);
  return {
    path,
    metrics: {
      totalRisk: avgRisk,
      zonesIntersected: zonesInt,
      distance: totalDist * 111,
      confidence: Math.round(Math.max(0, 100 - (avgRisk * 80) - (zonesInt * 5)))
    }
  };
}

/** Valid escape exit: combined final risk below threshold AND physically outside all zone boundaries. */
function isValidEscapeExit(
  lat: number,
  lng: number,
  riskThreshold: number,
  env: any,
  riskZones: any[]
): boolean {

  // 1. Risk condition
  const finalRisk = computePointRisk(lat, lng, riskZones, env);
  if (finalRisk >= riskThreshold) return false;

  // 2. HARD geometry exclusion (circle)
  for (const zone of riskZones) {
    if (zone.type === 'circle') {
      const dx = lat - zone.lat;
      const dy = lng - zone.lng;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // ❌ must be fully OUTSIDE + buffer
      const buffer = zone.radius + 0.0008; // ~80m safety margin
      if (dist <= buffer) return false;
    }
  }

  // 3. HARD geometry exclusion (polygon)
  const pointInPolygon = (lat: number, lng: number, points: any[]) => {
    let inside = false;

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].lat, yi = points[i].lng;
      const xj = points[j].lat, yj = points[j].lng;

      const intersect =
        yi > lng !== yj > lng &&
        lat < ((xj - xi) * (lng - yi)) / (yj - yi + 1e-12) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  };

  for (const zone of riskZones) {
    if (zone.type === 'polygon') {
      const pts = typeof zone.points === 'string'
        ? JSON.parse(zone.points)
        : zone.points;

      if (pts?.length && pointInPolygon(lat, lng, pts)) {
        return false;
      }
    }
  }

  return true;
}

function escapeAStar(startId: string, riskThreshold: number, env: any, nodes: any[], edges: any[], riskZones: any[]) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adj = new Map<string, any[]>();
  for (const edge of edges) {
    if (!adj.has(edge.from_id)) adj.set(edge.from_id, []);
    adj.get(edge.from_id)!.push(edge);
  }

  const startNode = nodeMap.get(startId);
  if (!startNode) return { path: [], metrics: null };

  const gScore: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const openSet = new PriorityQueue<string>();

  for (const node of nodes) {
    gScore[node.id] = Infinity;
  }

  gScore[startId] = 0;
  // A* with zero heuristic = Dijkstra: shortest path (risk weight 0) to nearest valid exit node.
  openSet.push(startId, 0);

  let endId: string | null = null;
  let evals = 0;
  while (openSet.size > 0) {
    const uId = openSet.pop()!;
    evals++;
    
    const uNode = nodeMap.get(uId)!;
    if (isValidEscapeExit(uNode.lat, uNode.lng, riskThreshold, env, riskZones)) {
      endId = uId;
      break;
    }

    const neighbors = adj.get(uId) || [];
    for (const edge of neighbors) {
      const vId = edge.to_id;
      const vNode = nodeMap.get(vId);
      if (!vNode) continue;

      // Escape route uses Risk_Weight = 0 as requested (pure shortest path)
      const weight = edge.distance;
      const tentG = gScore[uId] + weight;

      if (tentG < gScore[vId]) {
        previous[vId] = uId;
        gScore[vId] = tentG;
        const vNode = nodeMap.get(vId)!;
        const riskPenalty = computePointRisk(vNode.lat, vNode.lng, riskZones, env) * 50;
        openSet.push(vId, tentG + riskPenalty);

      }
    }
    if (evals > 25000) break;
  }

  if (!endId) {
    console.warn('[ESCAPE] No valid exit found, using fallback (lowest risk node)');

    let bestNodeId: string | null = null;
    let bestRisk = Infinity;

    for (const node of nodes) {
      const risk = computePointRisk(node.lat, node.lng, riskZones, env);

      if (risk < bestRisk) {
        bestRisk = risk;
        bestNodeId = node.id;
      }
    }

    if (!bestNodeId) {
      return { path: [], metrics: null }; // still fail-safe
    }

    endId = bestNodeId;
  }

  const path = [];
  let curr: string | null = endId;
  let totalDist = 0;

  while (curr) {
    const node = nodeMap.get(curr)!;
    const prevId = previous[curr];
    if (prevId) {
      const pNode = nodeMap.get(prevId)!;
      totalDist += calculateHeuristic(node.lat, node.lng, pNode.lat, pNode.lng);
    }
    path.unshift(node);
    curr = prevId || null;
  }

  return {
    path,
    metrics: {
      distance: totalDist * 111,
      type: 'escape'
    }
  };
}
