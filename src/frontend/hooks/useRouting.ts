/**
 * HOOK: useRouting
 * RESPONSIBILITY: Manages routing data, path calculation, and grid initialization.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Node, RiskZone, Edge } from '../types';

export function useRouting(riskZones: RiskZone[]) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [shortestPath, setShortestPath] = useState<Node[]>([]);
  const [safestPath, setSafestPath] = useState<Node[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [startNode, setStartNode] = useState<Node | null>(null);
  const [endNode, setEndNode] = useState<Node | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<'shortest' | 'safest' | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../workers/routingWorker.ts', import.meta.url), { type: 'module' });
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Sync graph state to worker to prevent cloning thousands of objects on every request
  useEffect(() => {
    if (workerRef.current && nodes.length > 0) {
      workerRef.current.postMessage({ type: 'SYNC_GRAPH', data: { nodes, edges } });
    }
  }, [nodes, edges]);

  const calculateRoute = useCallback(async (environment: any, overrideStartNodeId?: string) => {
    const sId = overrideStartNodeId || startNode?.id;
    if (!sId || !endNode || !workerRef.current) return;
    setLoading(true);

    const runWorker = (riskWeight: number): Promise<any> => {
      return new Promise((resolve) => {
        const handler = (e: MessageEvent) => {
          if (e.data.type === 'ROUTE_RESULT') {
            workerRef.current?.removeEventListener('message', handler);
            resolve(e.data.data);
          }
        };
        workerRef.current?.addEventListener('message', handler);
        workerRef.current?.postMessage({
          type: 'CALCULATE_ROUTE',
          data: { startId: sId, endId: endNode.id, riskWeight, env: environment, riskZones }
        });
      });
    };

    try {
      const shortest = await runWorker(0);
      const safest = await runWorker(50.0);

      setShortestPath(shortest.path || []);
      setSafestPath(safest.path || []);
      setMetrics({
        shortest: shortest.metrics,
        safest: safest.metrics
      });
      setSelectedRoute('safest');
    } catch (e) {
      console.error("Worker Routing error:", e);
    } finally {
      setLoading(false);
    }
  }, [startNode, endNode, riskZones]);


  const initGrid = useCallback(async (lat: number, lng: number, radius: number) => {
    setLoading(true);
    try {
      const res = await fetch('/api/init-grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, radius, endLat: endNode?.lat, endLng: endNode?.lng })
      });
      
      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        console.error("Failed to parse JSON. Status:", res.status, "Body:", rawText.slice(0, 200));
        throw new Error(`Server returned non-JSON response (Status ${res.status})`);
      }

      if (!res.ok || (data && data.error)) {
        throw new Error(data.error || 'Failed to initialize grid');
      }
      if (data.success) {
        const [nodeRes, edgeRes] = await Promise.all([
          fetch('/api/nodes'),
          fetch('/api/edges')
        ]);
        const nData = await nodeRes.json();
        const eData = await edgeRes.json();
        
        if (nData.error || eData.error) throw new Error(nData.error || eData.error);
        
        setNodes(nData);
        setEdges(eData);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Grid init error:", e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [endNode]);

  const clearMap = useCallback(async () => {
    await Promise.all([
      fetch('/api/nodes', { method: 'DELETE' }),
      fetch('/api/risk-zones', { method: 'DELETE' })
    ]);
    setNodes([]);
    setEdges([]);
    setShortestPath([]);
    setSafestPath([]);
    setStartNode(null);
    setEndNode(null);
  }, []);

  return {
    nodes, setNodes,
    edges, setEdges,
    shortestPath, safestPath,
    metrics, loading,
    startNode, setStartNode,
    endNode, setEndNode,
    selectedRoute, setSelectedRoute,
    calculateRoute, initGrid, clearMap,
    clearActiveRoute: useCallback(() => {
      setShortestPath([]);
      setSafestPath([]);
      setMetrics(null);
      setStartNode(null);
      setEndNode(null);
    }, []),
    calculateEscapeRoute: useCallback(async (currentLat: number, currentLng: number, riskZones: RiskZone[], environment: any) => {
      if (!workerRef.current || !nodes.length) {
        return Promise.resolve({ error: 'Worker not ready or no nodes' });
      }
      setLoading(true);
      const requestId = ++requestIdRef.current;
      // 1. Find the nearest node to current position
      let nearestNode: Node | null = null;
      let minDist = Infinity;
      for (const node of nodes) {
        const d = Math.sqrt(Math.pow(node.lat - currentLat, 2) + Math.pow(node.lng - currentLng, 2));
        if (d < minDist) {
          minDist = d;
          nearestNode = node;
        }
      }

      if (!nearestNode) {
        setLoading(false);
        return { error: 'No graph nodes found nearby' };
      }

      // 2. Find closest "safe" node (risk < 0.3)
      // We do a simple search in the sync worker data or just ask worker to find it.
      // Better to let the worker handle the A* with a target predicate.
      
      return new Promise((resolve) => {
        const handler = (e: MessageEvent) => {

            if (requestId !== requestIdRef.current) {
              return; // ignore outdated worker responses
            }

          if (e.data.type === 'ESCAPE_ROUTE_RESULT') {
            workerRef.current?.removeEventListener('message', handler);
            const data = e.data.data;
              if (!data || !Array.isArray(data.path)) {
                console.error('[ESCAPE] Invalid worker response:', data);

                setShortestPath([]);   // 🔥 clear bad state
                setSafestPath([]);

                resolve({ error: 'Invalid worker response' });

              } else if (data.path.length < 2) {
                console.warn('[ESCAPE] Empty or invalid path:', data.path);

                setShortestPath([]);   // 🔥 clear bad state
                setSafestPath([]);

                resolve({ error: 'No valid escape path found' });

              } else {
                // ✅ ONLY here we trust the path
                const validPath = data.path.filter(n => n && n.lat != null && n.lng != null);

                if (validPath.length < 2) {
                  console.warn('[ESCAPE] Filtered path invalid:', validPath);

                  setShortestPath([]);
                  setSafestPath([]);

                  resolve({ error: 'Path corrupted after filtering' });
                  return;
                }

                setShortestPath(validPath);
                setSafestPath([]);
                setMetrics({ shortest: data.metrics });
                setSelectedRoute('shortest');

                resolve({ success: true });
              }
            setLoading(false);
          }
        };
        workerRef.current?.addEventListener('message', handler);
        workerRef.current?.postMessage({
          type: 'CALCULATE_ESCAPE_ROUTE',
          data: { startId: nearestNode!.id, env: environment, riskZones, riskThreshold: 0.3 }
        });
      });
    }, [nodes])
  };
}
