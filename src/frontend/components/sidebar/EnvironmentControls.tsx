/**
 * COMPONENT: EnvironmentControls
 * RESPONSIBILITY: UI for triggering environmental shifts (Night, Rain).
 */

import React from 'react';
import { Environment } from '../../types';

interface EnvironmentControlsProps {
  environment: Environment;
  toggleTime: () => void;
  toggleWeather: () => void;
  isNightMode: boolean;
}

export const EnvironmentControls: React.FC<EnvironmentControlsProps> = ({
  environment, toggleTime, toggleWeather, isNightMode
}) => {
  return (
    <section className="space-y-4">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Environment Simulation</h3>
      <div className={`rounded-xl border p-4 space-y-4 ${isNightMode ? 'border-orange-900/30 bg-orange-900/10' : 'border-orange-100 bg-orange-50/50'}`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-orange-800">Night Mode Simulation</span>
          <button 
            onClick={toggleTime}
            className={`h-5 w-10 rounded-full transition-colors relative ${environment.time === 'night' ? 'bg-orange-600' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-all ${environment.time === 'night' ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-orange-800">Precipitation (Rain)</span>
          <button 
            onClick={toggleWeather}
            className={`h-5 w-10 rounded-full transition-colors relative ${environment.weather === 'rain' ? 'bg-orange-600' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-all ${environment.weather === 'rain' ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </div>
    </section>
  );
};
