/**
 * SYSTEM: Environment
 * RESPONSIBILITY: Logic for determining environmental states and transitions.
 */

import { Environment, EnvTime, EnvWeather } from "../types";

export const DEFAULT_ENVIRONMENT: Environment = {
  time: 'day',
  weather: 'clear'
};

export function toggleTime(current: EnvTime): EnvTime {
  return current === 'day' ? 'night' : 'day';
}

export function toggleWeather(current: EnvWeather): EnvWeather {
  return current === 'clear' ? 'rain' : 'clear';
}
