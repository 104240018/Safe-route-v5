/**
 * COMPONENT: LeftSidebar
 * RESPONSIBILITY: The primary sidebar layout and coordinator for user/dev tab content.
 */

import React, { useState } from 'react';
import { User, Settings, MapPin, Target, Crosshair, ChevronLeft, ChevronRight, Navigation, Zap, Trash2, Map as MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Node, NavState, TravelMode, Environment, RiskCategory, RiskZone } from '../../types';
import { SimulationControls } from './SimulationControls';
import { EnvironmentControls } from './EnvironmentControls';
import { ZoneEditor } from './ZoneEditor';

interface LeftSidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  selectionMode: 'explore' | 'start' | 'end';
  setSelectionMode: (mode: 'explore' | 'start' | 'end') => void;
  startNode: Node | null;
  endNode: Node | null;
  setCurrentAsStart: () => void;
  calculateRoute: () => void;
  loading: boolean;
  devMode: boolean;
  fetchRadius: number;
  setFetchRadius: (r: number) => void;
  initGrid: () => void;
  clearMap: () => void;
  requestLocation: () => void;
  useGeolocation: boolean;
  setUseGeolocation: (val: boolean) => void;
  userLocation: [number, number];
  mapCenter: [number, number];
  setUserLocation: (loc: [number, number]) => void;
  isNightMode: boolean;
  navState: NavState;
  nodes: Node[];
  startNavigation: (mode: TravelMode) => void;
  pauseNavigation: () => void;
  stopNavigation: () => void;
  simMultiplier: number;
  setSimMultiplier: (val: number) => void;
  followSimulation: boolean;
  setFollowSimulation: (val: boolean) => void;
  shortestPath: Node[];
  environment: Environment;
  toggleTime: () => void;
  toggleWeather: () => void;
  drawingState: any;
  setDrawingState: (state: any) => void;
  onFinishDrawing: () => void;
  onUndoDrawing: () => void;
  onCancelDrawing: () => void;
  lastUsedCategory: RiskCategory;
  setLastUsedCategory: (cat: RiskCategory) => void;
  selectedZone: RiskZone | null;
  updateRiskZone: (id: number, updates: Partial<RiskZone>) => void;
  deleteRiskZone: (id: number) => void;
  onExitEdit: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isOpen, setIsOpen, selectionMode, setSelectionMode, startNode, endNode, setCurrentAsStart,
  calculateRoute, loading, devMode, fetchRadius, setFetchRadius, initGrid, clearMap,
  requestLocation, useGeolocation, setUseGeolocation, userLocation, mapCenter, setUserLocation,
  isNightMode, navState, nodes, startNavigation, pauseNavigation, stopNavigation,
  simMultiplier, setSimMultiplier, followSimulation, setFollowSimulation, shortestPath, environment, toggleTime, toggleWeather,
  drawingState, setDrawingState, onFinishDrawing, onUndoDrawing, onCancelDrawing,
  lastUsedCategory, setLastUsedCategory, selectedZone, updateRiskZone, deleteRiskZone, onExitEdit
}) => {
  const [activeTab, setActiveTab] = useState<'user' | 'dev'>('user');

  return (
    <div className="relative flex h-full">
      <AnimatePresence>
        {isOpen && (
          <motion.aside 
            initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
            className={`flex h-full w-[320px] flex-col border-r shadow-xl z-[1001] transition-colors ${isNightMode ? 'border-slate-800 bg-[#0f172a] text-white' : 'border-[#e2e8f0] bg-white text-[#0f172a]'}`}
          >
            <div className="flex h-16 items-center border-b px-2">
              <button onClick={() => setActiveTab('user')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'user' ? 'text-blue-500' : 'text-slate-400'}`}>Navigator</button>
              {devMode && <button onClick={() => setActiveTab('dev')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'dev' ? 'text-orange-500' : 'text-slate-400'}`}>Dev Tools</button>}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {activeTab === 'user' ? (
                <>
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">My Position</h3>
                    <div className="flex gap-2">
                      <button onClick={requestLocation} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-[10px] font-bold">Locate Me</button>
                      <button onClick={() => setUserLocation(mapCenter)} className="flex-1 border text-slate-500 rounded-lg py-2 text-[10px] font-bold">Set Center</button>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Trip Planning</h3>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSelectionMode(selectionMode === 'start' ? 'explore' : 'start')} 
                          className={`flex-1 p-3 border rounded-xl text-left text-xs ${selectionMode === 'start' ? 'border-blue-500 bg-blue-50 text-blue-800' : ''}`}
                        >
                          {startNode ? `A: ${startNode.lat.toFixed(4)}, ${startNode.lng.toFixed(4)}` : 'Set Start Point'}
                        </button>
                        <button 
                          onClick={setCurrentAsStart}
                          title="Use current location"
                          className="px-3 border rounded-xl flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-blue-600 transition-colors"
                        >
                          <Navigation size={16} />
                        </button>
                      </div>
                      <button 
                        onClick={() => setSelectionMode(selectionMode === 'end' ? 'explore' : 'end')} 
                        className={`w-full p-3 border rounded-xl text-left text-xs ${selectionMode === 'end' ? 'border-green-500 bg-green-50 text-green-800' : ''}`}
                      >
                        {endNode ? `B: ${endNode.lat.toFixed(4)}, ${endNode.lng.toFixed(4)}` : 'Set Destination'}
                      </button>
                      <button onClick={calculateRoute} disabled={!startNode || !endNode || loading} className="w-full bg-slate-900 text-white py-4 rounded-xl text-xs font-bold hover:bg-slate-800">
                        {loading ? 'Computing...' : 'Compute Paths'}
                      </button>
                    </div>
                  </section>

                  <SimulationControls 
                    navState={navState} startNavigation={startNavigation} pauseNavigation={pauseNavigation} stopNavigation={stopNavigation}
                    simMultiplier={simMultiplier} setSimMultiplier={setSimMultiplier} 
                    followSimulation={followSimulation} setFollowSimulation={setFollowSimulation}
                    isNightMode={isNightMode} startNode={startNode} endNode={endNode}
                  />
                </>
              ) : (
                <>
                  <EnvironmentControls environment={environment} toggleTime={toggleTime} toggleWeather={toggleWeather} isNightMode={isNightMode} />
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Infrastructure</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                          <span>Fetch Radius</span>
                          <span>{(fetchRadius * 111).toFixed(1)} km</span>
                        </div>
                        <input 
                          type="range" min="0.009" max="0.036" step="0.0018"
                          value={fetchRadius} onChange={(e) => setFetchRadius(parseFloat(e.target.value))}
                          className="w-full accent-orange-500"
                        />
                        {nodes.length > 8000 && (
                          <p className="text-[9px] font-bold text-red-500 animate-pulse">Warning: High node count. Performance may degrade.</p>
                        )}
                      </div>

                      <button onClick={initGrid} className="w-full bg-orange-600 text-white py-3 rounded-lg text-[10px] font-bold uppercase tracking-wider">Init Network</button>
                      
                      {(startNode || endNode || shortestPath.length > 0) && (
                        <button onClick={clearMap} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors uppercase">
                          <Trash2 size={12} />
                          Reset Navigation Data
                        </button>
                      )}
                      
                      <button onClick={clearMap} className="w-full border border-red-200 text-red-600 py-2 rounded-lg text-[10px] font-bold uppercase">Purge All Data</button>
                    </div>
                  </section>
                  <ZoneEditor 
                    drawingState={drawingState} setDrawingState={setDrawingState} onFinishDrawing={onFinishDrawing} onUndoDrawing={onUndoDrawing} onCancelDrawing={onCancelDrawing}
                    lastUsedCategory={lastUsedCategory} setLastUsedCategory={setLastUsedCategory} isNightMode={isNightMode}
                    selectedZone={selectedZone} updateRiskZone={updateRiskZone} deleteRiskZone={deleteRiskZone}
                    onExitEdit={onExitEdit}
                  />
                </>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <button onClick={() => setIsOpen(!isOpen)} className={`absolute top-1/2 z-[1001] h-10 w-10 border rounded-r-md bg-white ${isOpen ? 'left-[320px]' : 'left-0'}`}>
        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>
    </div>
  );
};
