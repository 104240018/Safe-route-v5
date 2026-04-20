/**
 * COMPONENT: RightSidebar
 * RESPONSIBILITY: Displays contextual information like route metrics and live risk probes.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Navigation, ChevronLeft, ChevronRight, Zap, Map as MapIcon, Info, Target } from 'lucide-react';
import { RouteMetrics, RiskZone } from '../../types';
import { text } from "../../utils/uiTheme";

interface RightSidebarProps {
  metrics: { shortest: RouteMetrics, safest: RouteMetrics } | null;
  hoverRisk: number | null;
  selectedRoute: 'shortest' | 'safest' | null;
  setSelectedRoute: (route: 'shortest' | 'safest') => void;
  isNightMode: boolean;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  hoveredZone: RiskZone | null;
  selectedZone: RiskZone | null;
  navStatus: 'idle' | 'navigating' | 'paused';
  onStopNavigation: () => void;
  setSelectionMode: (mode: 'explore' | 'navigate' | 'escape') => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  metrics, hoverRisk, selectedRoute, setSelectedRoute, isNightMode, isOpen, setIsOpen, hoveredZone, selectedZone,navStatus,onStopNavigation,setSelectionMode

}) => {
    const theme = isNightMode ? "dark" : "light";
    const handleStopNavigation = () => {
    onStopNavigation();          // stop simulation
    setSelectionMode('explore'); // restore interaction
  };
  if (!metrics && hoverRisk === null && !hoveredZone && !selectedZone &&   navStatus !== 'navigating') return null;

  return (
    <div className="relative flex h-full">
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            className={`absolute right-0 top-0 z-[1001] h-full w-80 border-l p-6 shadow-2xl backdrop-blur-md transition-colors ${
              isNightMode ? 'border-slate-800 bg-slate-900/90' : 'border-[#e2e8f0] bg-white/90'
            }`}
          >
            <div className="space-y-8">
              {navStatus === 'navigating' && (
              <section className="rounded-2xl p-4 border border-red-200 bg-red-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Navigation size={14} className="text-red-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                      Navigation Active
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleStopNavigation}
                  className="w-full mt-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 transition-all"
                >
                  Stop Navigation
                </button>
              </section>
            )}
              {(hoveredZone || selectedZone) && (
              <section className={`rounded-2xl p-4 transition-all border-l-4 ${
                isNightMode ? 'bg-slate-800/50 border-blue-500' : 'bg-blue-50/50 border-blue-400'
              }`}>

                <div className="flex items-center gap-2 mb-2">
                  <Target size={14} className="text-blue-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                    Zone Signature
                  </h3>
                </div>

                <div className="space-y-1">
                  
                  {/* NAME */}
                  <div className={`text-lg font-black tracking-tighter uppercase ${text.primary(theme)}`}>
                    {(hoveredZone || selectedZone)?.name || 'Unnamed Sector'}
                  </div>

                  {/* CATEGORY | TYPE */}
                  <div className={`text-[10px] font-bold uppercase tracking-tighter ${text.muted(theme)}`}>
                    {(hoveredZone || selectedZone)?.category} | {(hoveredZone || selectedZone)?.type}
                  </div>

                </div>

                <p className={`mt-3 text-xs font-medium leading-relaxed italic ${text.secondary(theme)}`}>
                  "{(hoveredZone || selectedZone)?.description || 'No detailed intelligence available for this sector.'}"
                </p>

                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-200/50 pt-3">

                  <div>
                    <div className={`text-[9px] font-bold uppercase ${text.muted(theme)}`}>
                      Base Risk
                    </div>
                    <div className="text-sm font-black text-red-500 tracking-tighter">
                      {(((hoveredZone || selectedZone)?.base_risk || 0) * 100).toFixed(0)}%
                    </div>
                  </div>

                  {(hoveredZone || selectedZone)?.type === 'circle' && (
                    <div>
                      <div className={`text-[9px] font-bold uppercase ${text.muted(theme)}`}>
                        Impact Radius
                      </div>
                      <div className={`text-sm font-black tracking-tighter ${text.primary(theme)}`}>
                        {(((hoveredZone || selectedZone)?.radius || 0) * 111).toFixed(2)} km
                      </div>
                    </div>
                  )}

                </div>

              </section>
              )}

              {hoverRisk !== null && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-[10px] font-black uppercase tracking-widest ${text.muted(theme)}`}>Live Risk Probe</h3>
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  </div>
                  <div className="relative h-32 w-full overflow-hidden rounded-2xl bg-slate-100 flex items-center justify-center">
                     <div className="absolute inset-0 bg-gradient-to-t from-red-500/20 to-transparent" style={{ height: `${hoverRisk * 100}%`, top: 'auto' }} />
                     <div className="text-center z-10">
                        <div className={`text-4xl font-black tracking-tighter ${text.primary(theme)}`}>{(hoverRisk * 100).toFixed(0)}%</div>
                        <div className={`text-[10px] font-bold uppercase ${text.muted(theme)}`}>Vector Intensity</div>
                     </div>
                  </div>
                </section>
              )}

              {metrics && metrics.shortest && metrics.safest && (
                <section className="space-y-6">
                  <h3 className={`text-[10px] font-black uppercase tracking-widest ${text.muted(theme)}`}>Route Analytics</h3>
                  
                  <div className="space-y-4">
                    {/* Safest Route Card */}
                    <button 
                      onClick={() => setSelectedRoute('safest')}
                      className={`w-full overflow-hidden rounded-2xl border-2 p-4 text-left transition-all ${
                        selectedRoute === 'safest' ? 'border-green-500 bg-green-50 shadow-lg' : 'border-[#e2e8f0]'
                      }`}
                    >
                       <div className="mb-3 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-tight text-green-600">Shield Path (Safest)</span>
                          <ShieldCheck size={18} className="text-green-500" />
                       </div>
                       <div className="flex items-baseline gap-1">
                          <span className={`text-2xl font-black tracking-tighter ${
                            selectedRoute === 'safest'
                              ? 'text-slate-900'
                              : text.primary(theme)
                          }`}>{metrics.safest.confidence ?? 0}</span>
                          <span className="text-xs font-bold text-slate-400">SCORE</span>
                       </div>
                       <p className={`mt-2 text-[10px] font-medium leading-relaxed ${text.secondary(theme)}`}>{metrics.safest.explanation}</p>
                       <div className="mt-4 flex gap-4 text-[10px] font-bold">
                          <div className="flex flex-col">
                             <span className={`text-[10px] font-bold ${text.muted(theme)}`}>LENGTH</span>
                             <span   className={`font-semibold tracking-tight ${
                                selectedRoute === 'safest'
                                  ? 'text-slate-900'
                                  : text.primary(theme)
                              }`}>{metrics.safest.distance.toFixed(1)} km</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[#94a3b8]">EXPOSURE</span>
                             <span className="text-green-600">Low</span>
                          </div>
                       </div>
                    </button>

                    {/* Shortest Route Card */}
                    <button 
                      onClick={() => setSelectedRoute('shortest')}
                      className={`w-full overflow-hidden rounded-2xl border-2 p-4 text-left transition-all ${
                        selectedRoute === 'shortest' ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-[#e2e8f0]'
                      }`}
                    >
                       <div className="mb-3 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-tight text-blue-600">Swift Path (Shortest)</span>
                          <Navigation size={18} className="text-blue-500" />
                       </div>
                       <div className="flex items-baseline gap-1">
                          <span className={`text-2xl font-black tracking-tighter ${
                            selectedRoute === 'shortest'
                              ? 'text-slate-900'
                              : text.primary(theme)
                          }`}>{metrics.shortest.distance.toFixed(1)}</span>
                          <span className="text-xs font-bold text-slate-400">KM</span>
                       </div>
                       <p className={`mt-2 text-[10px] font-medium leading-relaxed ${text.secondary(theme)}`}>{metrics.shortest.explanation}</p>
                       <div className="mt-4 flex gap-4 text-[10px] font-bold">
                          <div className="flex flex-col">
                             <span className="text-[#94a3b8]">INTENSITY</span>
                             <span className="text-red-600">{(metrics.shortest.totalRisk * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex flex-col">
                             <span className={`text-[10px] font-bold ${text.muted(theme)}`}>CONFLICTS</span>
                             <span     className={`font-semibold tracking-tight ${
    selectedRoute === 'shortest'
      ? 'text-slate-900'
      : text.primary(theme)
  }`}>{metrics.shortest.zonesIntersected} Zones</span>
                          </div>
                       </div>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className={`text-[9px] font-black uppercase ${text.muted(theme)}`}>Metric Legend</h4>
                    <div className="grid grid-cols-2 gap-y-3">
                       <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span className={`text-[9px] font-bold ${text.secondary(theme)}`}>Secure Zone</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-yellow-500" />
                          <span className={`text-[9px] font-bold ${text.secondary(theme)}`}>Caution Area</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                          <span className={`text-[9px] font-bold ${text.secondary(theme)}`}>Lethal Conflict</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-slate-300" />
                          <span className={`text-[9px] font-bold ${text.secondary(theme)}`}>Unmapped Void</span>
                       </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`fixed top-1/2 z-[1001] h-10 w-10 border rounded-l-md bg-white transition-all shadow-md ${isOpen ? 'right-[320px]' : 'right-0'}`}
      >
        {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
    </div>
  );
};
