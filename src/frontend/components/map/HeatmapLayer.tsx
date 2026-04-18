/**
 * SYSTEM: HeatmapLayer
 * RESPONSIBILITY: High-performance canvas rendering of the risk vector field.
 * INPUT: RiskZones[], Environment
 * OUTPUT: Canvas overlay on Leaflet map
 */

import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { RiskZone, Environment } from '../../types';

interface HeatmapLayerProps {
  zones: RiskZone[];
  env: Environment;
  calculateFinalRisk: (zone: RiskZone, env: Environment) => number;
  enabled?: boolean;
}

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ 
  zones, 
  env, 
  calculateFinalRisk,
  enabled = true 
}) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paletteRef = useRef<Uint8ClampedArray | null>(null);
  const renderTimeoutRef = useRef<number | null>(null);

  // Initialize palette once
  useEffect(() => {
    const palCanvas = document.createElement('canvas');
    palCanvas.width = 1; palCanvas.height = 256;
    const palCtx = palCanvas.getContext('2d', { willReadFrequently: true });
    if (!palCtx) return;
    const grad = palCtx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.01, '#dcfce7'); 
    grad.addColorStop(0.2, '#22c55e');
    grad.addColorStop(0.4, '#eab308'); 
    grad.addColorStop(0.6, '#f97316');
    grad.addColorStop(0.8, '#ef4444'); 
    grad.addColorStop(1.0, '#7f1d1d');
    palCtx.fillStyle = grad; 
    palCtx.fillRect(0, 0, 1, 256);
    paletteRef.current = palCtx.getImageData(0, 0, 1, 256).data;
  }, []);

  useEffect(() => {
    if (!map || !map.getPanes) {
    console.warn('[Map] map not ready');
    return;
}

    let canvas = canvasRef.current;
    const pane = map.getPane('overlayPane');

    if (!pane) {
      console.warn('[Map] overlayPane not ready');
      return;
    }

    if (!canvas) {
      canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer') as HTMLCanvasElement;
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '400';
      if (pane) pane.appendChild(canvas);
      canvasRef.current = canvas;
    }

    if (!enabled) {
      canvas.style.display = 'none';
      return;
    } else {
      canvas.style.display = 'block';
    }

    const render = () => {
      if (!map || !canvasRef.current || !paletteRef.current) return;
      const displaySize = map.getSize();
      if (displaySize.x <= 0 || displaySize.y <= 0) return;

      const actCanvas = canvasRef.current;
      if (actCanvas.width !== displaySize.x || actCanvas.height !== displaySize.y) {
        actCanvas.width = displaySize.x; 
        actCanvas.height = displaySize.y;
      }
      
      const ctx = actCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.clearRect(0, 0, displaySize.x, displaySize.y);
      
      // Optional optimization: cluster or cap points if vastly > 500 server-side recommended
      const maxZones = 500;
      const renderZones = zones.slice(0, maxZones);

      const screenZones = renderZones.map(z => {
        try {
          const center = map.latLngToContainerPoint([z.lat!, z.lng!]);
          // Use calculateFinalRisk for circles, but for polygons we must bypass the centroid 
          // bounding check to avoid skipping L-shaped or concave polygons
          let risk = 0;
          if (z.type === 'circle') {
             risk = calculateFinalRisk(z, env);
          } else {
             const modifiers = typeof z.modifiers === 'string' ? JSON.parse(z.modifiers) : (z.modifiers || {});
             risk = z.base_risk;
             if (env.time === 'night') risk *= (modifiers.night ?? 1);
             if (env.weather === 'rain') risk *= (modifiers.rain ?? 1);
          }
          risk = Math.min(risk, 1.0);
          
          let radiusPx = 0;
          let pointsPx: { x: number, y: number }[] = [];
          
          if (z.type === 'circle') {
             // If radius is stored in degrees initially (e.g. 0.003), convert back for the bound constraint
             const baseRadMeters = (z.radius && z.radius > 1) ? z.radius : ((z.radius || 0.003) * 111000);
             const edge = map.latLngToContainerPoint(L.latLng(z.lat!, z.lng!).toBounds(baseRadMeters).getNorthEast());
             radiusPx = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
             radiusPx = Math.max(radiusPx, 10);
          } else {
            const pts = typeof z.points === 'string' ? JSON.parse(z.points) : z.points;
            pointsPx = (pts as any[]).map(p => map.latLngToContainerPoint([p.lat, p.lng]));
          }
          return { type: z.type, center, risk, radiusPx, pointsPx };
        } catch(e) { return null; }
      }).filter(z => z && z.risk > 0);

      ctx.globalCompositeOperation = 'lighter';

      for (const sz of screenZones) {
        if (!sz) continue;
        
        if (sz.type === 'circle' && sz.radiusPx > 0) {
          const r = sz.radiusPx * 1.3; // Make effective heatmap spread 30% larger
          const grad = ctx.createRadialGradient(sz.center.x, sz.center.y, 0, sz.center.x, sz.center.y, r);
          
          // Tuning parameter (k): Higher values (>1) keep the center "hotter" over a 
          // wider area before falling off. Values like 2.0 to 3.0 give a nice broad spread.
          const k = 2; 
          const steps = 5; // Number of intermediate stops (keeps performance high)
          
          // 1. Generate dynamic falloff curve from center (t=0) to near the edge (t=0.9)
          for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * 0.9; // Stop looping at 90% of the radius
            const intensity = 1 - Math.pow(t, k); // falloff(t) = 1 - t^k
            grad.addColorStop(t, `rgba(255, 255, 255, ${sz.risk * intensity})`);
          }
          
          // 2. Soft Edge: Smoothly taper off the remaining distance to eliminate sharp boundaries
          grad.addColorStop(0.95, `rgba(255, 255, 255, ${sz.risk * 0.05})`); // Small trailing tail
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)'); // True zero at exactly the edge
          
          ctx.beginPath();
          ctx.arc(sz.center.x, sz.center.y, r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else if (sz.pointsPx && sz.pointsPx.length > 0) {
          // Polygon overlay: Find interior bounds to span a radial fade matching the new circle formula
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const p of sz.pointsPx) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          }
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;

          let maxR = 0;
          for (const p of sz.pointsPx) {
            const d = Math.sqrt(Math.pow(p.x - cx, 2) + Math.pow(p.y - cy, 2));
            if (d > maxR) maxR = d;
          }
          
          // Generate a smooth radiating center field clipped to polygon bounds
          const polyGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.1);
          const pk = 2; // Curve falloff (hot center)
          const pSteps = 5;
          for (let i = 0; i <= pSteps; i++) {
            const t = (i / pSteps) * 0.9;
            const intensity = 1 - Math.pow(t, pk);
            polyGrad.addColorStop(t, `rgba(255, 255, 255, ${sz.risk * intensity})`);
          }
          polyGrad.addColorStop(0.95, `rgba(255, 255, 255, ${sz.risk * 0.05})`);
          polyGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.beginPath();
          ctx.moveTo(sz.pointsPx[0].x, sz.pointsPx[0].y);
          for (let i = 1; i < sz.pointsPx.length; i++) {
            ctx.lineTo(sz.pointsPx[i].x, sz.pointsPx[i].y);
          }
          ctx.closePath();
          
          ctx.shadowBlur = 40;
          ctx.shadowColor = `rgba(255, 255, 255, ${sz.risk * 0.4})`; // Exterior bleeding ring
          ctx.fillStyle = polyGrad;
          ctx.fill();
          
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
        }
      }

      // Additive Map Colorization
      const imgData = ctx.getImageData(0, 0, displaySize.x, displaySize.y);
      const pixels = imgData.data;
      const palette = paletteRef.current;

      for (let i = 0; i < pixels.length; i += 4) {
        const alpha = pixels[i + 3];
        if (alpha > 0) {
          const offset = alpha * 4;
          pixels[i] = palette[offset];         // R
          pixels[i + 1] = palette[offset + 1]; // G
          pixels[i + 2] = palette[offset + 2]; // B
          pixels[i + 3] = alpha * 0.8; // Minor opacity reduction to see base map
        }
      }

      ctx.putImageData(imgData, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    };

    const throttledRender = () => {
      if (renderTimeoutRef.current) cancelAnimationFrame(renderTimeoutRef.current);
      renderTimeoutRef.current = requestAnimationFrame(() => {
        if (canvasRef.current) {
          L.DomUtil.setPosition(canvasRef.current, map.containerPointToLayerPoint([0, 0]));
        }
        render();
      });
    };

    map.on('viewreset move zoomend', throttledRender);
    throttledRender();

    return () => {
      map.off('viewreset move zoomend', throttledRender);
      if (renderTimeoutRef.current) cancelAnimationFrame(renderTimeoutRef.current);
      if (canvasRef.current && pane && pane.contains(canvasRef.current)) {
         pane.removeChild(canvasRef.current);
         canvasRef.current = null;
      }
    };
  }, [map, zones, env, calculateFinalRisk, enabled]);

  return null;
};
