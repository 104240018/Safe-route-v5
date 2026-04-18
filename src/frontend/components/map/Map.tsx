/**
 * COMPONENT: Map
 * RESPONSIBILITY: The main map view, orchestrating layers and interactions.
 */

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Polygon, Polyline, Marker, Popup, useMapEvents, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Trash2, Shield, Target } from 'lucide-react';
import { Node, Edge, RiskZone, NavState, Environment } from '../../types';
import { HeatmapLayer } from './HeatmapLayer';
import { PolygonDrawer } from './PolygonDrawer';
import { MarkerSimulation } from './MarkerSimulation';
import { RiskPathLayer } from './RiskPathLayer';
import { RiskLegend } from './RiskLegend';

interface MapProps {
  userLocation: [number, number];
  useGeolocation: boolean;
  nodes: Node[];
  edges: Edge[];
  riskZones: RiskZone[];
  startNode: Node | null;
  endNode: Node | null;
  shortestPath: Node[];
  safestPath: Node[];
  selectedRoute: 'shortest' | 'safest' | null;
  devMode: boolean;
  selectionMode: 'explore' | 'start' | 'end';
  onMapClick: (latlng: L.LatLng) => void;
  onCenterChange: (lat: number, lng: number) => void;
  deleteRiskZone: (id: number) => void;
  getRiskColor: (risk: number) => string;
  isNightMode: boolean;
  onHoverRisk: (risk: number | null) => void;
  onHoverZone: (id: number | null) => void;
  onSelectZone: (id: number | null) => void;
  selectedZoneId: number | null;
  navState: NavState;
  environment: Environment;
  calculateFinalRisk: (zone: RiskZone, env: Environment) => number;
  metrics: any;
  followSimulation: boolean;
  setFollowSimulation: (val: boolean) => void;
  drawingState: { mode: 'none' | 'circle' | 'polygon', points: { lat: number, lng: number }[] };
  setDrawingState: React.Dispatch<React.SetStateAction<any>>;
  onFinishDrawing: (zone: any) => void;
}

const RecenterMap: React.FC<{ lat: number, lng: number, active: boolean, followMode: boolean }> = ({ lat, lng, active, followMode }) => {
  const map = useMap();
  useEffect(() => {
    if (active && followMode) map.setView([lat, lng], map.getZoom(), { animate: false });
  }, [lat, lng, active, followMode, map]);
  return null;
};

const InfrastructureLayer: React.FC<{ devMode: boolean, nodes: Node[], edges: Edge[], startNode: Node | null, endNode: Node | null }> = React.memo(({ devMode, nodes, edges, startNode, endNode }) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Stable refs for rendering loops
  const dataRef = useRef({ nodes, edges, startNode, endNode });
  const nodeMapRef = useRef<Map<string, Node>>(new Map());

  // 1. Sync Data and Pre-compute heavy structures (Runs ONLY when data changes)
  useEffect(() => {
    dataRef.current = { nodes, edges, startNode, endNode };
    
    // Only rebuild nodeMap if nodes reference actually changes
    if (nodes !== dataRef.current.nodes || nodeMapRef.current.size === 0) {
      const mapObj = new Map<string, Node>();
      for (const n of nodes) {
        mapObj.set(n.id, n);
      }
      nodeMapRef.current = mapObj;
    }
  }, [nodes, edges, startNode, endNode]);

  // 2. Manage Canvas Lifecycle & Map Events (Runs ONLY on mount/unmount and mode switch)
  useEffect(() => {
    if (!devMode || !map) return;

      // 🚨 ensure map panes are ready
    if (!map.getPanes) return;   

    const pane = map.getPane('overlayPane');
    
    if (!pane) {
      console.warn('[Map] overlayPane not ready');
      return;
    }    

  // ✅ reuse existing canvas if possible
  let canvas = canvasRef.current;

  if (!canvas) {
    canvas = L.DomUtil.create('canvas', 'leaflet-infrastructure-layer') as HTMLCanvasElement;
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '350';

    pane.appendChild(canvas);
    canvasRef.current = canvas;
  }

    let renderTimeout: number | null = null;

    const render = () => {
      if (!canvas || !map) return;
      const size = map.getSize();
      if (size.x === 0 || size.y === 0) return;

      canvas.width = size.x;
      canvas.height = size.y;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bounds = map.getBounds();
      const paddedBounds = bounds.pad(0.1); 
      ctx.clearRect(0, 0, size.x, size.y);

      const { nodes: currentNodes, edges: currentEdges, startNode: currentStart, endNode: currentEnd } = dataRef.current;
      const cachedNodeMap = nodeMapRef.current;

      ctx.beginPath();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;
      
      currentEdges.forEach(edge => {
        const from = cachedNodeMap.get(edge.from_id);
        const to = cachedNodeMap.get(edge.to_id);
        if (from && to) {
          if (paddedBounds.contains([from.lat, from.lng]) || paddedBounds.contains([to.lat, to.lng])) {
            const p1 = map.latLngToContainerPoint([from.lat, from.lng]);
            const p2 = map.latLngToContainerPoint([to.lat, to.lng]);
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
          }
        }
      });
      ctx.stroke();

      currentNodes.forEach(node => {
        if (bounds.contains([node.lat, node.lng])) {
          const point = map.latLngToContainerPoint([node.lat, node.lng]);
          const isSpecial = currentStart?.id === node.id || currentEnd?.id === node.id;
          
          ctx.beginPath();
          ctx.arc(point.x, point.y, isSpecial ? 3 : 1.5, 0, Math.PI * 2);
          ctx.fillStyle = currentStart?.id === node.id ? '#3b82f6' : currentEnd?.id === node.id ? '#22c55e' : '#94a3b8';
          ctx.globalAlpha = isSpecial ? 1.0 : 0.4;
          ctx.fill();
        }
      });
    };

    const update = () => {
      if (!canvas || !map) return;
      
      // Calculate origin once and set transform for smoother sync than setPosition
      const layerPoint = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, layerPoint);

      if (renderTimeout) cancelAnimationFrame(renderTimeout);
      renderTimeout = requestAnimationFrame(render);
    };

    map.on('viewreset move zoomend', update);
    update();

    return () => {
      map.off('viewreset move zoomend', update);
      if (renderTimeout) cancelAnimationFrame(renderTimeout);
      pane?.removeChild(canvas);
      canvasRef.current = null;
    };
  }, [devMode, map]); // Safely decoupled from data updates

  // 3. Force render correctly when critical data changes while in dev mode
  useEffect(() => {
    if (devMode && canvasRef.current && map) {
       L.DomUtil.setPosition(canvasRef.current, map.containerPointToLayerPoint([0, 0]));
       map.fire('move');
    }
  }, [nodes, edges, startNode, endNode, devMode, map]);

  return null;
});

export const MapView: React.FC<MapProps> = ({
  userLocation, useGeolocation, nodes, edges, riskZones, startNode, endNode,
  shortestPath, safestPath, selectedRoute,
  devMode, selectionMode, onMapClick, onCenterChange,
  deleteRiskZone, getRiskColor,
  isNightMode, onHoverRisk, onHoverZone, onSelectZone, selectedZoneId,
  navState, environment, calculateFinalRisk, metrics, followSimulation, setFollowSimulation,
  drawingState, setDrawingState, onFinishDrawing
}) => {
  const isEscape = metrics?.shortest?.type === 'escape';
  const escapeDestination = isEscape && shortestPath.length > 0 ? shortestPath[shortestPath.length - 1] : null;
  const MapEvents = () => {
    const map = useMapEvents({
      click(e) { 
        onMapClick(e.latlng); 
      },
      moveend() { const center = map.getCenter(); onCenterChange(center.lat, center.lng); },
      dragstart() {
        if (followSimulation) setFollowSimulation(false);
      },
      zoomstart() {
        if (followSimulation) setFollowSimulation(false);
      }
    });

      useEffect(() => {
        const container = map.getContainer();

        if (drawingState.mode !== 'none') {
          container.style.cursor = 'crosshair';
        } else if (selectionMode !== 'explore') {
          container.style.cursor = 'pointer';
        } else {
          container.style.cursor = 'grab'; // default
        }

        return () => {
          container.style.cursor = 'grab';
        };
      }, [selectionMode, drawingState.mode]);

    return null;
  };

  return (
    <main className={`relative flex-1 border-r h-full transition-colors ${isNightMode ? 'border-slate-800' : 'border-[#e2e8f0]'}`}>
      <MapContainer 
        center={userLocation} zoom={14} className="h-full w-full"
      >
        <TileLayer
          url={isNightMode 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
        />
        
        <RecenterMap lat={userLocation[0]} lng={userLocation[1]} active={useGeolocation} followMode={true} />
        <RecenterMap 
          lat={navState.currentPosition?.[0] || userLocation[0]} 
          lng={navState.currentPosition?.[1] || userLocation[1]} 
          active={navState.status === 'navigating'} 
          followMode={followSimulation}
        />
        <MapEvents />
        <HeatmapLayer zones={riskZones} env={environment} calculateFinalRisk={calculateFinalRisk} enabled={true} />
        <PolygonDrawer drawingState={drawingState} />
        <MarkerSimulation userLocation={userLocation} navPosition={navState.currentPosition} status={navState.status} />
        <InfrastructureLayer devMode={devMode} nodes={nodes} edges={edges} startNode={startNode} endNode={endNode} />

        {/* Routes below zones so polygons/circles receive hover and clicks (paths are non-interactive) */}
        {selectedRoute === 'safest' && Array.isArray(shortestPath) && shortestPath.length > 1 && (
          <RiskPathLayer 
            path={shortestPath} zones={riskZones} env={environment} 
            isSelected={false} getRiskColor={getRiskColor} type="shortest" 
          />
        )}

        {selectedRoute === 'shortest' && Array.isArray(safestPath) && safestPath.length > 1 && (
          <RiskPathLayer 
            path={safestPath} zones={riskZones} env={environment} 
            isSelected={false} getRiskColor={getRiskColor} type="safest" 
          />
        )}

        {selectedRoute === 'shortest' && Array.isArray(shortestPath) && shortestPath.length > 1 && (
          <RiskPathLayer 
            path={shortestPath} zones={riskZones} env={environment} 
            isSelected={true} getRiskColor={getRiskColor} type="shortest" 
            isDashed={isEscape}
          />
        )}

        {selectedRoute === 'safest' && Array.isArray(safestPath) && safestPath.length > 1 && (
          <RiskPathLayer 
            path={safestPath} zones={riskZones} env={environment} 
            isSelected={true} getRiskColor={getRiskColor} type="safest" 
          />
        )}

        {selectedRoute === null && (
          <>
            {Array.isArray(shortestPath) && shortestPath.length > 1 && (
              <RiskPathLayer 
                path={shortestPath} zones={riskZones} env={environment} 
                isSelected={false} getRiskColor={getRiskColor} type="shortest" 
              />
            )}

            {Array.isArray(safestPath) && safestPath.length > 1 && (
              <RiskPathLayer 
                path={safestPath} zones={riskZones} env={environment} 
                isSelected={false} getRiskColor={getRiskColor} type="safest" 
              />
            )}
          </>
        )}

        {riskZones.map(zone => {
          const points = typeof zone.points === 'string' ? JSON.parse(zone.points) : (zone.points || []);
          const isSelected = selectedZoneId === zone.id;
          
          if (zone.type === 'polygon') {
            const pos = (points as any[]).map(p => [p.lat, p.lng]) as [number, number][];
            
            return (
              <Polygon 
                key={zone.id}
                positions={pos} 
                interactive={true}
                eventHandlers={{
                  mouseover: () => onHoverZone(zone.id),
                  mouseout: () => onHoverZone(null),
                  click: (e) => { L.DomEvent.stopPropagation(e); onSelectZone(zone.id); }
                }}
                pathOptions={{ 
                  color: isSelected ? '#3b82f6' : '#ef4444', 
                  weight: isSelected ? 4 : 2, 
                  dashArray: isSelected ? '0' : '5, 5', 
                  fillOpacity: isSelected ? 0.4 : 0.15, 
                  fillColor: isSelected ? '#3b82f6' : '#ef4444' 
                }} 
              />
            );
          } else {
            return (
              <Circle 
                key={zone.id}
                center={[zone.lat, zone.lng]} 
                radius={zone.radius * 111000} 
                interactive={true}
                eventHandlers={{
                  mouseover: () => onHoverZone(zone.id),
                  mouseout: () => onHoverZone(null),
                  click: (e) => { L.DomEvent.stopPropagation(e); onSelectZone(zone.id); }
                }}
                pathOptions={{ 
                  fillColor: isSelected ? '#3b82f6' : '#ef4444', 
                  fillOpacity: isSelected ? 0.4 : 0.15, 
                  color: isSelected ? '#3b82f6' : '#ef4444', 
                  weight: isSelected ? 4 : 2, 
                  dashArray: isSelected ? '0' : '5, 5' 
                }} 
              />
            );
          }
        })}

        {escapeDestination && (
          <CircleMarker
            center={[escapeDestination.lat, escapeDestination.lng]}
            radius={16}
            pane="markerPane"
            interactive={false}
            pathOptions={{
              color: '#ffffff',
              weight: 4,
              fillColor: '#16a34a',
              fillOpacity: 0.95,
              opacity: 1
            }}
          />
        )}

        {startNode && <Marker position={[startNode.lat, startNode.lng]} icon={L.divIcon({ className: 'm', html: '<div class="h-4 w-4 rounded-full bg-blue-500 border-2 border-white"></div>' })} />}
        {endNode && <Marker position={[endNode.lat, endNode.lng]} icon={L.divIcon({ className: 'm', html: '<div class="h-4 w-4 rounded-full bg-green-500 border-2 border-white"></div>' })} />}
      </MapContainer>

      {/* Map Content Overlays */}
      <RiskLegend isNightMode={isNightMode} />
      
      {navState.status === 'navigating' && (
        <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2">
          {!followSimulation && (
            <button 
              onClick={() => {
                onCenterChange(navState.currentPosition![0], navState.currentPosition![1]);
                setFollowSimulation(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-xl text-blue-600 border hover:bg-slate-50 transition-colors"
              title="Recenter & Follow Simulation"
            >
              <Target size={20} />
            </button>
          )}
        </div>
      )}
    </main>
  );
};
