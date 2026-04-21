/**
 * SYSTEM: App
 * RESPONSIBILITY: The global application entry point and logic coordinator.
 * Acts as the thin layer connecting systems, hooks, and components.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Zap, Skull } from 'lucide-react';
import { Header } from './components/layout/Header';
import { StatusBanner } from './components/layout/StatusBanner';
import { LeftSidebar } from './components/sidebar/LeftSidebar';
import { RightSidebar } from './components/sidebar/RightSidebar';
import { MapView } from './components/map/Map';
import { useEnvironment } from './hooks/useEnvironment';
import { useSimulation } from './hooks/useSimulation';
import { useGeofencing } from './hooks/useGeofencing';
import { useRouting } from './hooks/useRouting';
import { RiskZone, RiskCategory, Status, Environment } from './types';
import { computePointRisk, getRiskColor } from './systems/risk';
import { CATEGORY_PRESETS } from './constants';
import { getDistMeters } from './utils/distance';

const App: React.FC = () => {
  // Global App State
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([11.110487, 106.616726]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [followSimulation, setFollowSimulation] = useState(true);
  const [devMode, setDevMode] = useState(false);
  const [useGeolocation, setUseGeolocation] = useState(true);
  const [simMultiplier, setSimMultiplier] = useState(1.0);
  const [selectionMode, setSelectionMode] = useState<'explore' | 'start' | 'end'>('explore');
  const [fetchRadius, setFetchRadius] = useState(0.01);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [drawingState, setDrawingState] = useState<{ mode: 'none' | 'circle' | 'polygon', points: { lat: number, lng: number }[], radiusMeters: number, intensity: number }>({ mode: 'none', points: [], radiusMeters: 300, intensity: 0.8 });
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<number | null>(null);
  const [lastUsedCategory, setLastUsedCategory] = useState<RiskCategory>('crime');
  const [hoverRisk, setHoverRisk] = useState<number | null>(null);
  const [uiDarkMode, setUiDarkMode] = useState(false);
  const [hasAutoStartedEscape, setHasAutoStartedEscape] = useState(false);
  // Hooks
  const { environment, toggleTime, toggleWeather } = useEnvironment();
  const { 
    nodes, edges, shortestPath, safestPath, loading, startNode, endNode, selectedRoute,
    setStartNode, setEndNode, calculateRoute, initGrid, clearMap, setNodes, setEdges,
    setSelectedRoute, metrics, clearActiveRoute: clearRoutingState, calculateEscapeRoute
  } = useRouting(riskZones);
  
  const activePath = selectedRoute === 'safest' ? safestPath : shortestPath;
  const { navState, navWarnings, startNavigation, pauseNavigation, stopNavigation } = useSimulation(
    activePath,
    simMultiplier
  );

  const [showEscapePrompt, setShowEscapePrompt] = useState(false);

  const clearActiveRoute = useCallback(() => {
    stopNavigation();
    clearRoutingState();
    setHasAutoStartedEscape(false); // 👈 reset
  }, [stopNavigation, clearRoutingState]);

  const showAlert = useCallback((message: string, type: 'error' | 'success', duration?: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    setStatuses(prev => {
      // Prevent spamming the exact same active warning
      if (prev.some(s => s.message === message)) return prev;
      return [...prev.slice(-4), { id, message, type, duration: duration || 4000 }];
    });
  }, []);

  const clearStatus = useCallback((id: string) => {
    setStatuses(prev => prev.filter(s => s.id !== id));
  }, []);

  const activePosition: [number, number] = React.useMemo(() => {
    const pos = navState.status === 'navigating' && navState.currentPosition
      ? navState.currentPosition
      : userLocation;
    return [pos[0], pos[1]]; // Return stable reference
  }, [navState.status, navState.currentPosition?.[0], navState.currentPosition?.[1], userLocation[0], userLocation[1]]);

  const findClosestNode = useCallback((lat: number, lng: number) => {
    if (nodes.length === 0) return null;
    let minD = Infinity;
    let closest: Node | null = null;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      // Use squared distance to avoid expensive Math.sqrt calls in tight loops
      const d2 = Math.pow(n.lat - lat, 2) + Math.pow(n.lng - lng, 2);
      if (d2 < minD) {
        minD = d2;
        closest = n;
      }
    }
    return closest;
  }, [nodes]);

  const prevRiskZonesLength = useRef(riskZones.length);
  
  useEffect(() => {
    if (riskZones.length !== prevRiskZonesLength.current) {
      const isAdded = riskZones.length > prevRiskZonesLength.current;
      prevRiskZonesLength.current = riskZones.length;
      
      // Auto-update route if a newly added zone spawns ON the active path
      if (isAdded && activePath.length > 0 && startNode && endNode) {
        const newZone = riskZones[riskZones.length - 1]; // Newly appended zone
        let intersectsPath = false;
        
        const zLat = newZone.lat ?? newZone.points?.[0]?.lat;
        const zLng = newZone.lng ?? newZone.points?.[0]?.lng;
        
        if (newZone.points && newZone.points.length > 0) {
          const step = Math.max(1, Math.floor(activePath.length / 30));
          for (let i = 0; i < activePath.length; i += step) {
            for (const p of newZone.points) {
              if (getDistMeters(activePath[i].lat, activePath[i].lng, p.lat, p.lng) < 2000) {
                intersectsPath = true;
                break;
              }
            }
            if (intersectsPath) break;
          }
        } else if (zLat && zLng) {
          // Fast spatial sample to prevent UI lag (checking every ~10th node depending on length)
          const step = Math.max(1, Math.floor(activePath.length / 30));
          for (let i = 0; i < activePath.length; i += step) {
            // Rough distance check (1.5km buffer to be safe for big polygons)
            if (getDistMeters(activePath[i].lat, activePath[i].lng, zLat, zLng) < 1500) { 
              intersectsPath = true;
              break;
            }
          }
        }
        
        if (intersectsPath) {
          showAlert("Route recalculating due to new tactical hazard...", 'success');
          
          let overrideStartId = undefined;
          if (navState.status === 'navigating' && navState.currentPosition) {
            const closest = findClosestNode(navState.currentPosition[0], navState.currentPosition[1]);
            if (closest) overrideStartId = closest.id;
          }
          calculateRoute(environment, overrideStartId);
        }
      }
    }
  }, [riskZones, activePath, startNode, endNode, calculateRoute, environment, showAlert, navState.status, navState.currentPosition, findClosestNode]);

  const { stayAlertTriggered, setStayAlertTriggered } = useGeofencing(activePosition, riskZones, environment, showAlert);

  useEffect(() => {
    if (!stayAlertTriggered) return;

    const isSimulating = navState.status === 'navigating' || navState.status === 'paused';
    const hasPath = activePath.length > 1;
    const noActiveNavigation = !hasPath || !isSimulating;

    if (noActiveNavigation) {
      setShowEscapePrompt(true);
    } else {
      setStayAlertTriggered(false);
    }
  }, [stayAlertTriggered, navState.status, activePath.length, setStayAlertTriggered]);

  const handleEscape = async () => {
    setShowEscapePrompt(false);
    setStayAlertTriggered(false);
    
    // 1. Clear active state
    clearActiveRoute();
    setHasAutoStartedEscape(false);
    // 2. Compute escape path
    showAlert("Calculating fastest escape route to safe area...", 'success');
    const result: any = await calculateEscapeRoute(activePosition[0], activePosition[1], riskZones, environment);
    console.log("ESCAPE RESULT", result);
    console.log("UPDATED PATH", shortestPath);
    if (result?.error) {
      showAlert(result.error, 'error');
    } else if (result?.success) {
      showAlert("Escape route found! Head to the highlighted safe exit.", 'success', 8000);
    }
  };

  // Initial Data
  useEffect(() => {
    fetch('/api/risk-zones').then(r => r.json()).then(setRiskZones);
    fetch('/api/nodes').then(r => r.json()).then(setNodes);
    fetch('/api/edges').then(r => r.json()).then(setEdges);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (nodes.length > 8000) {
      showAlert("High node density detected. System performance may be affected.", 'error');
    }
  }, [nodes.length, showAlert]);

    useEffect(() => {
      if (
        !hasAutoStartedEscape &&
        navState.status === 'idle' &&
        shortestPath.length > 1 &&
        metrics?.shortest?.type === 'escape'
      ) {
        startNavigation('car');
        setHasAutoStartedEscape(true); // 👈 prevent loop
      }
    }, [
      shortestPath.length,
      metrics,
      navState.status,
      hasAutoStartedEscape,
      startNavigation
    ]);

  // Handlers
  const requestLocation = () => {
    showAlert("Locating device position...", 'success');
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        showAlert(`Position Locked: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, 'success');
        if (useGeolocation) {
           setUserLocation([latitude, longitude]);
        }
      }, (err) => {
        showAlert(`Location access failed: ${err.message}`, 'error');
      });
    } else {
      showAlert("Geolocation not supported by this browser.", 'error');
    }
  };

  const handleSetCurrentAsStart = () => {
    const activeCoords = navState.status === 'navigating' && navState.currentPosition 
      ? navState.currentPosition 
      : userLocation;
    const closest = findClosestNode(activeCoords[0], activeCoords[1]);
    if (closest) {
      setStartNode(closest);
      showAlert(`Start point locked to active location (${closest.lat.toFixed(4)})`, 'success');
    } else {
      showAlert("No road nodes near current position.", 'error');
    }
  };

  const handleMapClick = async (latlng: any) => {
    if (drawingState.mode !== 'none') {
      setDrawingState(prev => ({ ...prev, points: [...prev.points, { lat: latlng.lat, lng: latlng.lng }] }));
      return;
    }

    if (selectionMode === 'start') {
      const closest = findClosestNode(latlng.lat, latlng.lng);
      if (closest) {
        setStartNode(closest);
        showAlert(`Start point set near ${closest.lat.toFixed(4)}`, 'success');
        setSelectionMode('end'); // Jump to next step
      } else {
        showAlert("No road nodes found. Please 'Init Network' in Dev Tools.", 'error');
        setSelectionMode('explore');
      }
    } else if (selectionMode === 'end') {
      const closest = findClosestNode(latlng.lat, latlng.lng);
      if (closest) {
        setEndNode(closest);
        showAlert(`Destination set near ${closest.lat.toFixed(4)}`, 'success');
        setSelectionMode('explore'); // Stop jumping back to start
      } else {
        showAlert("No road nodes found. Please 'Init Network' in Dev Tools.", 'error');
        setSelectionMode('explore');
      }
    }
  };

  const calculateFinalRisk = useCallback((zone: RiskZone, env: Environment) => {
    return computePointRisk(zone.lat, zone.lng, [zone], env);
  }, []);

  const handleFinishDrawing = async () => {
    if (drawingState.points.length === 0) return;
    const category = lastUsedCategory;
    const newZone: Partial<RiskZone> = {
      type: drawingState.mode,
      category,
      name: `New ${category} Zone`,
      description: `Active ${category} risk identified in this sector.`,
      base_risk: drawingState.intensity,
      modifiers: { night: CATEGORY_PRESETS[category].night, rain: CATEGORY_PRESETS[category].rain }
    };

    if (drawingState.mode === 'circle') {
      newZone.lat = drawingState.points[0].lat;
      newZone.lng = drawingState.points[0].lng;
      newZone.radius = drawingState.radiusMeters / 111000;
    } else {
      newZone.points = drawingState.points;
      newZone.lat = drawingState.points.reduce((s, p) => s + p.lat, 0) / drawingState.points.length;
      newZone.lng = drawingState.points.reduce((s, p) => s + p.lng, 0) / drawingState.points.length;
      newZone.radius = 0;
    }

    const res = await fetch('/api/risk-zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newZone)
    });
    const saved = await res.json();
    setRiskZones(prev => [...prev, saved]);
    setDrawingState({ mode: 'none', points: [], radiusMeters: 300, intensity: 0.8 });
  };

  const updateRiskZone = async (id: number, updates: Partial<RiskZone>) => {
    try {
      const res = await fetch(`/api/risk-zones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setRiskZones(prev => prev.map(z => z.id === id ? { ...z, ...updates } : z));
        showAlert("Zone Signature Updated", 'success');
      }
    } catch (e) {
      showAlert("Update Sync Failed", 'error');
    }
  };

  const deleteRiskZone = async (id: number) => {
    try {
      await fetch(`/api/risk-zones/${id}`, { method: 'DELETE' });
      setRiskZones(z => z.filter(x => x.id !== id));
      if (selectedZoneId === id) setSelectedZoneId(null);
      if (hoveredZoneId === id) setHoveredZoneId(null);
      showAlert("Zone Signature Expunged", 'success');
    } catch (e) {
      showAlert("Deletion Failed", 'error');
    }
  };

  return (
    <div className={`flex h-screen w-screen flex-col overflow-hidden font-sans ${uiDarkMode ? 'bg-[#0f172a]' : 'bg-white'}`}>
      <Header 
        isNightMode={uiDarkMode} 
        onToggleDev={() => setDevMode(!devMode)} 
        devMode={devMode}
        toggleUiDarkMode={() => setUiDarkMode(!uiDarkMode)}
      />
      
      <div className="relative flex flex-1 overflow-hidden">
        <LeftSidebar 
          isOpen={leftPanelOpen} setIsOpen={setLeftPanelOpen}
          selectionMode={selectionMode} setSelectionMode={setSelectionMode}
          startNode={startNode} endNode={endNode}
          setCurrentAsStart={handleSetCurrentAsStart}
          calculateRoute={() => {
            calculateRoute(environment);
            setSelectionMode('explore');
          }} 
          loading={loading}
          devMode={devMode} fetchRadius={fetchRadius} setFetchRadius={setFetchRadius}
          initGrid={async () => {
            showAlert("Initializing Tactical Network...", 'success');
            try {
              const success = await initGrid(userLocation[0], userLocation[1], fetchRadius);
              if (success) showAlert("Network Synced. Optimized nodes online.", 'success');
            } catch (err: any) {
              showAlert(err.message || "Failed to initialize grid. Check logs.", 'error');
            }
          }}
          clearMap={async () => {
            await clearMap();
            setRiskZones([]);
            setSelectedZoneId(null);
            setHoveredZoneId(null);
            showAlert("Map Purged: Tactical data strictly erased.", 'success');
          }} 
          requestLocation={requestLocation}
          userLocation={userLocation} mapCenter={userLocation} setUserLocation={setUserLocation}
          useGeolocation={useGeolocation} setUseGeolocation={setUseGeolocation}
          isNightMode={uiDarkMode}
          navState={navState} nodes={nodes} shortestPath={shortestPath} startNavigation={startNavigation} pauseNavigation={pauseNavigation} stopNavigation={stopNavigation}
          simMultiplier={simMultiplier} setSimMultiplier={setSimMultiplier}
          followSimulation={followSimulation} setFollowSimulation={setFollowSimulation}
          environment={environment} toggleTime={toggleTime} toggleWeather={toggleWeather}
          drawingState={drawingState} setDrawingState={setDrawingState}
          onFinishDrawing={handleFinishDrawing} onUndoDrawing={() => setDrawingState(s => ({ ...s, points: s.points.slice(0, -1) }))}
          onCancelDrawing={() => setDrawingState({ mode: 'none', points: [] })}
          lastUsedCategory={lastUsedCategory} setLastUsedCategory={setLastUsedCategory}
          selectedZone={riskZones.find(z => z.id === selectedZoneId) || null}
          updateRiskZone={updateRiskZone}
          deleteRiskZone={deleteRiskZone}
          onExitEdit={() => setSelectedZoneId(null)}
        />

        <MapView 
          userLocation={userLocation} useGeolocation={useGeolocation} nodes={nodes} edges={edges} riskZones={riskZones}
          startNode={startNode} endNode={endNode} shortestPath={shortestPath} safestPath={safestPath} selectedRoute={selectedRoute}
          devMode={devMode} selectionMode={selectionMode} onMapClick={handleMapClick}
          onCenterChange={(lat, lng) => !useGeolocation && setUserLocation([lat, lng])}
          deleteRiskZone={deleteRiskZone}
          getRiskColor={getRiskColor}
          isNightMode={uiDarkMode} 
          onHoverRisk={setHoverRisk} 
          onHoverZone={setHoveredZoneId}
          onSelectZone={setSelectedZoneId}
          selectedZoneId={selectedZoneId}
          followSimulation={followSimulation}
          setFollowSimulation={setFollowSimulation}
          navState={navState} environment={environment} calculateFinalRisk={calculateFinalRisk} metrics={metrics}
          drawingState={drawingState} setDrawingState={setDrawingState} onFinishDrawing={handleFinishDrawing}
        />

        {/* Escape Prompt Overlay */}
        {showEscapePrompt && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[2000] w-[90%] max-w-md">
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`p-5 rounded-2xl shadow-2xl border backdrop-blur-xl ${uiDarkMode ? 'bg-slate-900/90 border-red-500/50 text-white' : 'bg-white/90 border-red-200 text-slate-900'}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <Skull size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold tracking-tight">Prolonged Exposure Warning</h3>
                  <p className="mt-1 text-xs opacity-80 leading-relaxed font-medium">
                    You have been in a high-risk area for too long. Navigation is recommended to restore safety.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={handleEscape}
                      className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-red-500/20"
                    >
                      Find fastest way out
                    </button>
                    <button 
                      onClick={() => { setShowEscapePrompt(false); setStayAlertTriggered(false); }}
                      className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border transition-all ${uiDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        <RightSidebar 
          metrics={metrics}
          hoverRisk={hoverRisk}
          selectedRoute={selectedRoute}
          setSelectedRoute={setSelectedRoute}
          isNightMode={uiDarkMode}
          isOpen={rightPanelOpen}
          setIsOpen={setRightPanelOpen}
          hoveredZone={riskZones.find(z => z.id === hoveredZoneId) || null}
          selectedZone={riskZones.find(z => z.id === selectedZoneId) || null}
          navStatus={navState.status}
          onStopNavigation={stopNavigation}
          setSelectionMode={setSelectionMode}
        />
        
        <StatusBanner statuses={statuses} onClear={clearStatus} />
      </div>
    </div>
  );
};

export default App;
