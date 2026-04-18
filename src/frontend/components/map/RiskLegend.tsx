import React from 'react';
import { Shield, AlertTriangle, Skull } from 'lucide-react';

interface RiskLegendProps {
  isNightMode: boolean;
}

/**
 * COMPONENT: RiskLegend
 * RESPONSIBILITY: Displays a visual guide for map risk colors and labels.
 */
export const RiskLegend: React.FC<RiskLegendProps> = ({ isNightMode }) => {
  return (
    <div className={`absolute bottom-6 left-6 z-[1000] p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-colors selection:bg-none pointer-events-none sm:pointer-events-auto
      ${isNightMode 
        ? 'bg-slate-900/80 border-slate-700 text-slate-200' 
        : 'bg-white/80 border-slate-200 text-slate-800'}`}>
      
      <div className="flex flex-col gap-3">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
          Risk Indicators
        </h4>

        {/* Gradient Bar */}
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" />
          <div className="flex justify-between text-[9px] font-bold uppercase tracking-tighter opacity-70">
            <span>Low</span>
            <span>Moderate</span>
            <span>Extreme</span>
          </div>
        </div>

        {/* Label Items */}
        <div className="space-y-2 mt-1">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-green-500/10 text-green-500">
              <Shield size={12} />
            </div>
            <span className="text-[10px] font-medium leading-none">Safe Passage</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-orange-500/10 text-orange-500">
              <AlertTriangle size={12} />
            </div>
            <span className="text-[10px] font-medium leading-none">Moderate Hazard</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-red-500/10 text-red-500">
              <Skull size={12} />
            </div>
            <span className="text-[10px] font-medium leading-none">Extreme Danger</span>
          </div>
        </div>
      </div>
    </div>
  );
};
