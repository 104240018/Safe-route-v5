/**
 * COMPONENT: MarkerSimulation
 * RESPONSIBILITY: Renders the animated navigation avatar and current/user positions.
 */

import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface MarkerSimulationProps {
  userLocation: [number, number];
  navPosition: [number, number] | null;
  status: 'idle' | 'navigating' | 'paused';
}

export const MarkerSimulation: React.FC<MarkerSimulationProps> = ({ userLocation, navPosition, status }) => {
  return (
    <>
      <Marker 
        position={userLocation}
        icon={L.divIcon({
          className: 'user-location-icon',
          html: `<div class="h-5 w-5 rounded-full bg-[#3b82f6] border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.6)] flex items-center justify-center">
            <div class="h-2 w-2 rounded-full bg-white animate-ping"></div>
          </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })}
      >
        <Popup>Your Position</Popup>
      </Marker>

      {navPosition && status !== 'idle' && (
        <Marker 
          position={navPosition}
          icon={L.divIcon({
            className: 'nav-marker',
            html: `<div class="h-8 w-8 rounded-full bg-blue-600 border-4 border-white shadow-2xl flex items-center justify-center text-white">
              <div class="animate-bounce"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg></div>
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })}
        />
      )}
    </>
  );
};
