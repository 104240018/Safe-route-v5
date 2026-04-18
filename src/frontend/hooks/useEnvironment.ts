/**
 * HOOK: useEnvironment
 * RESPONSIBILITY: Manages environment state (time, weather).
 */

import { useState } from 'react';
import { Environment, EnvTime, EnvWeather } from '../types';
import { toggleTime, toggleWeather, DEFAULT_ENVIRONMENT } from '../systems/environment';

export function useEnvironment() {
  const [environment, setEnvironment] = useState<Environment>(DEFAULT_ENVIRONMENT);

  const handleToggleTime = () => {
    setEnvironment(prev => ({
      ...prev,
      time: toggleTime(prev.time)
    }));
  };

  const handleToggleWeather = () => {
    setEnvironment(prev => ({
      ...prev,
      weather: toggleWeather(prev.weather)
    }));
  };

  return {
    environment,
    toggleTime: handleToggleTime,
    toggleWeather: handleToggleWeather
  };
}
