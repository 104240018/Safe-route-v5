/**
 * COMPONENT: PolygonDrawer
 * RESPONSIBILITY: Renders the visual preview during risk zone creation (drawing).
 * INPUT: drawingState
 * OUTPUT: Preview shapes on map
 */

import React from 'react';
import { Circle, Polyline, CircleMarker } from 'react-leaflet';

interface PolygonDrawerProps {
  drawingState: { mode: 'none' | 'circle' | 'polygon', points: { lat: number, lng: number }[] };
}

export const PolygonDrawer: React.FC<PolygonDrawerProps> = ({ drawingState }) => {
  if (drawingState.mode === 'none' || drawingState.points.length === 0) return null;

  const polyPoints = drawingState.points.map(p => [p.lat, p.lng] as [number, number]);

  const safePositions =
    polyPoints.length >= 3
      ? [...polyPoints, polyPoints[0]]
      : polyPoints;

  return (
    <>
      {drawingState.mode === 'circle' && (
        <Circle 
          center={[drawingState.points[0].lat, drawingState.points[0].lng]}
          radius={drawingState.radiusMeters || 300}
          pathOptions={{
            color: '#3b82f6',
            weight: 2,
            fillOpacity: 0.2,
            dashArray: '5, 10'
          }}
        />
      )}

      {drawingState.mode === 'polygon' && (
        <>
          <Polyline 
            positions={safePositions}
            pathOptions={{
              color: '#f97316',
              weight: 2,
              dashArray: '5, 10'
            }}
          />

          {drawingState.points.map((p, i) => (
            <CircleMarker 
              key={i}
              center={[p.lat, p.lng]}
              radius={4}
              pathOptions={{
                color: '#f97316',
                fillOpacity: 1
              }}
            />
          ))}
        </>
      )}
    </>
  );
};