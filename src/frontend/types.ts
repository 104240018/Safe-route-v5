export type TravelMode = 'walk' | 'drone' | 'car';
export type NavStatus = 'idle' | 'navigating' | 'paused';
export type EnvTime = 'day' | 'night';
export type EnvWeather = 'clear' | 'rain';

export interface Environment {
  time: EnvTime;
  weather: EnvWeather;
}

export interface NavState {
  status: NavStatus;
  currentPosition: [number, number] | null;
  currentSegmentIndex: number;
  progress: number; // 0 to 1 total progress
  travelMode: TravelMode;
  speed: number; // m/s
  distanceRemaining: number;
  timeRemaining: number;
  distanceTraveled: number;
  totalDistance: number;
  segmentDistances?: number[];
}

export interface Node {
  id: string;
  lat: number;
  lng: number;
  risk?: number;
}

export interface Edge {
  from_id: string;
  to_id: string;
  distance: number;
}

export interface RouteMetrics {
  totalRisk: number;
  zonesIntersected: number;
  distance: number;
  explanation?: string;
  confidence?: number;
}

export type RiskCategory = 'crime' | 'traffic' | 'school' | 'construction';

export interface RiskZone {
  id: number;
  type: 'circle' | 'polygon';
  category: RiskCategory;
  lat: number; // Center lat for circle
  lng: number; // Center lng for circle
  radius: number; // In degrees for circle
  points?: { lat: number, lng: number }[]; // For polygon
  base_risk: number;
  name?: string;
  description?: string;
  modifiers: {
    night?: number;
    rain?: number;
  };
}

export interface Status {
  id: string;
  type: 'info' | 'error' | 'success';
  message: string;
  duration?: number;
}
