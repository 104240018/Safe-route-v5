/**
 * COMPONENT: ZoneEditor
 * RESPONSIBILITY: UI for managing risk zones, drawing, and categorization.
 */

import React, { useState, useEffect } from 'react';
import { Zap, Map as MapIcon, Edit3, Save, Trash2, X } from 'lucide-react';
import { RiskCategory, RiskZone } from '../../types';
import { CATEGORY_PRESETS } from '../../constants';

interface ZoneEditorProps {
  drawingState: { mode: 'none' | 'circle' | 'polygon', points: { lat: number, lng: number }[], radiusMeters: number, intensity: number };
  setDrawingState: React.Dispatch<React.SetStateAction<{ mode: 'none' | 'circle' | 'polygon', points: { lat: number, lng: number }[], radiusMeters: number, intensity: number }>>;
  onFinishDrawing: () => void;
  onUndoDrawing: () => void;
  onCancelDrawing: () => void;
  lastUsedCategory: RiskCategory;
  setLastUsedCategory: (cat: RiskCategory) => void;
  isNightMode: boolean;
  selectedZone: RiskZone | null;
  updateRiskZone: (id: number, updates: Partial<RiskZone>) => void;
  deleteRiskZone: (id: number) => void;
  onExitEdit: () => void;
}

export const ZoneEditor: React.FC<ZoneEditorProps> = ({
  drawingState, setDrawingState, onFinishDrawing, onUndoDrawing, onCancelDrawing,
  lastUsedCategory, setLastUsedCategory, isNightMode, selectedZone, updateRiskZone, deleteRiskZone, onExitEdit
}) => {
  const [localZone, setLocalZone] = useState<RiskZone | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (selectedZone) {
      setLocalZone({ ...selectedZone });
      setConfirmDelete(false);
    } else {
      setLocalZone(null);
    }
  }, [selectedZone]);

  const handleLocalUpdate = (updates: Partial<RiskZone>) => {
    if (!localZone) return;
    setLocalZone(prev => prev ? ({ ...prev, ...updates }) : null);
  };

  const handleCategoryChange = (cat: RiskCategory) => {
    if (!localZone) return;
    const preset = CATEGORY_PRESETS[cat];
    handleLocalUpdate({ 
      category: cat,
      base_risk: preset.baseRisk,
      modifiers: { night: preset.night, rain: preset.rain }
    });
  };

  const saveChanges = () => {
    if (localZone && selectedZone) {
      updateRiskZone(selectedZone.id, localZone);
      onExitEdit();
    }
  };

  return (
    <section className="space-y-4">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Risk Management</h3>
      
      {localZone ? (
        <div className={`space-y-4 rounded-xl border p-4 shadow-sm ${isNightMode ? 'border-blue-900/30 bg-blue-900/10' : 'border-blue-100 bg-blue-50/50'}`}>
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase text-blue-600">Editing: {localZone.name || 'Unnamed'}</h4>
            <button onClick={onExitEdit} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
              <X size={14} className="text-slate-400" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Sector Designation</label>
              <input 
                value={localZone.name || ''} 
                onChange={(e) => handleLocalUpdate({ name: e.target.value })}
                className={`w-full rounded-lg border px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 ${isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Intelligence Briefing</label>
              <textarea 
                value={localZone.description || ''} 
                onChange={(e) => handleLocalUpdate({ description: e.target.value })}
                className={`w-full rounded-lg border px-3 py-2 text-xs h-20 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Intensity</label>
                  <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">{Math.round(localZone.base_risk * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.1"
                  value={localZone.base_risk} 
                  onChange={(e) => handleLocalUpdate({ base_risk: parseFloat(e.target.value) })}
                  className="w-full accent-blue-600"
                />
              </div>
              {localZone.type === 'circle' && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Impact Radius</label>
                    <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">{Math.round(localZone.radius * 111000)}m</span>
                  </div>
                  <input 
                    type="range" min="0.0009" max="0.018" step="0.0009"
                    value={localZone.radius} 
                    onChange={(e) => handleLocalUpdate({ radius: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>
              )}
            </div>

            <div className="pt-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Risk Intelligence Category</label>
              <div className="grid grid-cols-2 gap-2">
                {(['crime', 'traffic', 'school', 'construction'] as RiskCategory[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`rounded-lg border py-2 text-[9px] font-bold uppercase transition-all ${localZone.category === cat ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-[#e2e8f0] bg-white text-[#64748b] hover:bg-slate-50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Combat Multipliers</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                   <span className="text-[8px] font-bold text-slate-400">NIGHT EFFECT</span>
                   <input 
                    type="number" step="0.1"
                    value={localZone.modifiers.night || 1} 
                    onChange={(e) => handleLocalUpdate({ modifiers: { ...localZone.modifiers, night: parseFloat(e.target.value) } })}
                    className={`rounded border px-2 py-1 text-[10px] font-bold ${isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                   />
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-[8px] font-bold text-slate-400">RAIN EFFECT</span>
                   <input 
                    type="number" step="0.1"
                    value={localZone.modifiers.rain || 1} 
                    onChange={(e) => handleLocalUpdate({ modifiers: { ...localZone.modifiers, rain: parseFloat(e.target.value) } })}
                    className={`rounded border px-2 py-1 text-[10px] font-bold ${isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                   />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button 
                onClick={onExitEdit}
                className="rounded-lg bg-slate-100 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={saveChanges}
                className="rounded-lg bg-blue-600 py-2 text-[10px] font-bold text-white hover:bg-blue-700"
              >
                Save Protocol
              </button>
            </div>

            <div className="pt-4 border-t border-slate-200 mt-2">
              {confirmDelete ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[9px] font-bold text-red-600 uppercase text-center">Confirm Permanent Deletion?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg bg-slate-100 py-2 text-[10px] font-bold text-slate-600 uppercase"
                    >
                      Abort
                    </button>
                    <button 
                      onClick={() => selectedZone && deleteRiskZone(selectedZone.id)}
                      className="rounded-lg bg-red-600 py-2 text-[10px] font-bold text-white uppercase"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-bold text-red-500 hover:bg-red-50 transition-colors uppercase"
                >
                  <Trash2 size={12} />
                  Sanitize Sector
                </button>
              )}
            </div>
          </div>
        </div>
      ) : drawingState.mode === 'none' ? (
        <div className="space-y-2">
          <button 
            onClick={() => setDrawingState(s => ({ ...s, mode: 'circle', points: [] }))}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-[10px] font-bold transition-all ${isNightMode ? 'border-slate-800 text-slate-500 hover:border-blue-900 hover:text-blue-400' : 'border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-600'}`}
          >
            <Zap size={14} /> Add Circular Zone
          </button>
          <button 
            onClick={() => setDrawingState(s => ({ ...s, mode: 'polygon', points: [] }))}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-[10px] font-bold transition-all ${isNightMode ? 'border-slate-800 text-slate-500 hover:border-orange-900 hover:text-orange-400' : 'border-slate-200 text-slate-400 hover:border-orange-200 hover:text-orange-600'}`}
          >
            <MapIcon size={14} /> Add Polygon Zone
          </button>
        </div>
      ) : (
        <div className={`space-y-3 rounded-xl border p-4 ${isNightMode ? 'border-blue-900/30 bg-blue-900/10' : 'border-blue-100 bg-blue-50/50'}`}>
          <div className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase">
            DRAWING {drawingState.mode}: {drawingState.points.length} POINTS
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-bold text-blue-500 uppercase">Intensity</label>
                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">{Math.round(drawingState.intensity * 100)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.1"
                value={drawingState.intensity} 
                onChange={(e) => setDrawingState(s => ({ ...s, intensity: parseFloat(e.target.value) }))}
                className="w-full accent-blue-600"
              />
            </div>
            {drawingState.mode === 'circle' && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-bold text-blue-500 uppercase">Impact Radius</label>
                  <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">{drawingState.radiusMeters}m</span>
                </div>
                <input 
                  type="range" min="100" max="2000" step="100"
                  value={drawingState.radiusMeters} 
                  onChange={(e) => setDrawingState(s => ({ ...s, radiusMeters: parseInt(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={onUndoDrawing} className="rounded-lg bg-orange-100 py-2 text-[10px] font-bold text-orange-700 hover:bg-orange-200">Undo</button>
            <button onClick={onCancelDrawing} className="rounded-lg bg-red-100 py-2 text-[10px] font-bold text-red-700 hover:bg-red-200">Cancel</button>
          </div>
          <button 
            onClick={onFinishDrawing}
            disabled={drawingState.points.length < (drawingState.mode === 'circle' ? 1 : 3)}
            className="w-full rounded-lg bg-blue-600 py-3 text-[10px] font-bold text-white hover:bg-blue-700 disabled:opacity-30"
          >
            Finish & Save Zone
          </button>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[9px] font-bold text-[#94a3b8]">LAST USED CATEGORY</label>
        <div className="grid grid-cols-2 gap-2">
          {(['crime', 'traffic', 'school', 'construction'] as RiskCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setLastUsedCategory(cat)}
              className={`rounded-lg border py-2 text-[9px] font-bold uppercase transition-all ${lastUsedCategory === cat ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-[#e2e8f0] bg-white text-[#64748b] hover:bg-slate-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
