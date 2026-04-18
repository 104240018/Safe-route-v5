import React from 'react';
import { Polyline } from 'react-leaflet';
import { Node, RiskZone, Environment } from '../../types';
import { computePointRisk } from '../../systems/risk';

interface RiskPathLayerProps {
  path: Node[];
  zones: RiskZone[];
  env: Environment;
  isSelected: boolean;
  getRiskColor: (risk: number) => string;
  type: 'shortest' | 'safest' | 'escape';
  isDashed?: boolean;
}

/**
 * COMPONENT: RiskPathLayer
 * RESPONSIBILITY: Renders a path with segment-based color coding based on risk levels.
 */
export const RiskPathLayer: React.FC<RiskPathLayerProps> = ({ 
  path, zones, env, isSelected, getRiskColor, type, isDashed 
}) => {
  // Use useMemo to avoid re-calculating risk for every node on every map move/zoom
  // We only re-calculate if the path itself, the zones, or the environment change.
        const segments = React.useMemo(() => {
          if (!Array.isArray(path) || path.length < 2) return [];

          const safeSegments: {
            id: string;
            positions: [number, number][];
            color: string;
          }[] = [];

          for (let i = 0; i < path.length - 1; i++) {
            const node = path[i];
            const nextNode = path[i + 1];

            // 🚨 STRICT VALIDATION
            if (
              !node ||
              !nextNode ||
              typeof node.lat !== 'number' ||
              typeof node.lng !== 'number' ||
              typeof nextNode.lat !== 'number' ||
              typeof nextNode.lng !== 'number'
            ) {
              continue;
            }

            const positions: [number, number][] = [
              [node.lat, node.lng],
              [nextNode.lat, nextNode.lng]
            ];

            // 🚨 DOUBLE SAFETY CHECK
            if (
              positions.length !== 2 ||
              positions.some(p => !Array.isArray(p) || p.length !== 2)
            ) {
              continue;
            }

            const midLat = (node.lat + nextNode.lat) / 2;
            const midLng = (node.lng + nextNode.lng) / 2;

            const risk = computePointRisk(midLat, midLng, zones, env);

            const color =
              type === 'shortest'
                ? getRiskColor(risk)
                : type === 'escape'
                ? '#3b82f6'
                : '#22c55e';

            safeSegments.push({
              id: `${node.id}-${nextNode.id}-${i}`,
              positions,
              color
            });
          }

          return safeSegments;
        }, [path, zones, env, type, getRiskColor]);

  if (segments.length === 0) return null;

  // Selection styling
  const weight =
  type === 'escape'
    ? 7
    : isSelected
    ? 8
    : 3;
  const opacity = isSelected ? 0.9 : 0.4;
  const zIndex = isSelected ? 1000 : 500;

  return (
    <>
      {segments.map((seg) => (
        <Polyline
          key={seg.id}
          positions={seg.positions}
          interactive={false}
          bubblingMouseEvents={false}
          pathOptions={{
            color: seg.color,
            weight: weight,
            opacity: opacity,
            dashArray: isDashed ? '10, 10' : undefined,
            lineJoin: 'round',
            lineCap: 'round',        }}
        />
      ))}
    </>
  );
};
