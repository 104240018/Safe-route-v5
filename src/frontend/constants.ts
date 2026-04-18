import { RiskCategory } from './types';

export const CATEGORY_PRESETS: Record<RiskCategory, { baseRisk: number, night: number, rain: number }> = {
  crime: { baseRisk: 0.8, night: 1.5, rain: 1.1 },
  traffic: { baseRisk: 0.5, night: 1.2, rain: 1.8 },
  school: { baseRisk: 0.3, night: 0.8, rain: 1.1 },
  construction: { baseRisk: 0.6, night: 1.1, rain: 1.4 }
};
