/**
 * COMPONENT: SimulationControls
 * RESPONSIBILITY: UI for starting, pausing, and controlling navigation simulation.
 */

import React from 'react';
import { motion } from 'motion/react';
import { Play, Pause, Square, Drone, Car, Footprints } from 'lucide-react';
import { NavState, TravelMode, Node } from '../../types';

interface SimulationControlsProps {
  navState: NavState;
  startNavigation: (mode: TravelMode) => void;
  pauseNavigation: () => void;
  stopNavigation: () => void;
  simMultiplier: number;
  setSimMultiplier: (val: number) => void;
  followSimulation: boolean;
  setFollowSimulation: (val: boolean) => void;
  isNightMode: boolean;
  startNode: Node | null;
  endNode: Node | null;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  navState, startNavigation, pauseNavigation, stopNavigation,
  simMultiplier, setSimMultiplier, followSimulation, setFollowSimulation, isNightMode, startNode, endNode
}) => {
  return (
    <section className="space-y-4">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Navigation Simulation</h3>
      
      <div className={`rounded-xl border p-4 space-y-4 ${isNightMode ? 'border-slate-800 bg-slate-900/30' : 'border-[#e2e8f0] bg-[#f8fafc]'}`}>
        {navState.status === 'idle' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(['walk', 'drone', 'car'] as TravelMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => startNavigation(mode)}
                  disabled={!startNode || !endNode}
                  className={`flex flex-col items-center gap-2 rounded-lg border py-3 transition-all disabled:opacity-30 ${isNightMode ? 'border-slate-800 bg-slate-900 hover:border-blue-500' : 'bg-white hover:border-blue-500'}`}
                >
                  {mode === 'walk' && <Footprints size={16} />}
                  {mode === 'drone' && <Drone size={16} />}
                  {mode === 'car' && <Car size={16} />}
                  <span className="text-[9px] font-bold uppercase">{mode}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-[#64748b] uppercase">Follow Simulation</span>
                <button 
                  onClick={() => setFollowSimulation(!followSimulation)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${followSimulation ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${followSimulation ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex justify-between text-[10px] font-bold mt-2">
                <span className="text-[#64748b] uppercase">Speed Factor</span>
                <span className="text-blue-500">x{simMultiplier}</span>
              </div>
              <input 
                type="range" min="1" max="100" step="1"
                value={simMultiplier}
                onChange={(e) => setSimMultiplier(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white animate-pulse">
                  {navState.travelMode === 'walk' && <Footprints size={14} />}
                  {navState.travelMode === 'drone' && <Drone size={14} />}
                  {navState.travelMode === 'car' && <Car size={14} />}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-blue-500">{navState.status}</div>
                  <div className="text-[9px] text-[#94a3b8]">{(navState.speed * 3.6).toFixed(0)} km/h</div>
                </div>
              </div>
              <div className="flex gap-2">
                {navState.status === 'navigating' ? (
                  <button onClick={pauseNavigation} className="rounded-lg bg-blue-500/10 p-2 text-blue-500 hover:bg-blue-500/20">
                    <Pause size={16} />
                  </button>
                ) : (
                  <button onClick={() => startNavigation(navState.travelMode)} className="rounded-lg bg-green-500/10 p-2 text-green-500 hover:bg-green-500/20">
                    <Play size={16} />
                  </button>
                )}
                <button onClick={stopNavigation} className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <Square size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-[#94a3b8]">PROGRESS</span>
                <span>{(navState.progress * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <motion.div 
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${navState.progress * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
