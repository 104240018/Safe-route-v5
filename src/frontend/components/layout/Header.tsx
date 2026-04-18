/**
 * COMPONENT: Header
 * RESPONSIBILITY: Renders the top application navigation and title.
 */

import React from 'react';
import { Shield, Settings, Menu, Sun, Moon, Cloud, CloudRain, Search, User, Bell } from 'lucide-react';

interface HeaderProps {
  isNightMode: boolean;
  onToggleDev: () => void;
  devMode: boolean;
  toggleUiDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  isNightMode, onToggleDev, devMode, toggleUiDarkMode
}) => {
  return (
    <header className={`flex h-16 items-center justify-between border-b px-6 transition-all duration-300 ${
      isNightMode 
        ? 'border-slate-800 bg-[#0f172a] text-white' 
        : 'border-slate-200 bg-white text-slate-900'
    }`}>
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-500/20">
          <Shield className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">SafeRoute</h1>
          <p className="text-[10px] font-medium text-slate-400">Tactical Navigation Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={toggleUiDarkMode}
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
            isNightMode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 bg-slate-50 border border-slate-100'
          }`}
          title="Toggle Interface Theme"
        >
          {isNightMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button 
          onClick={onToggleDev}
          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${
            devMode 
              ? 'border-orange-500/50 bg-orange-500/10 text-orange-500' 
              : 'border-slate-200 text-slate-400 hover:bg-slate-50'
          }`}
          title="Toggle Developer Terminal"
        >
          Dev Kernel
        </button>
      </div>
    </header>
  );
};
