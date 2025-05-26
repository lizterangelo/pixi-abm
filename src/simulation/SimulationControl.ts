// Simulation control singleton
interface SimulationState {
  isPlaying: boolean;
  isPaused: boolean;
  globalTime: number;
  tickCount: number;
  speedMultiplier: number; // 0.1 = slow, 1.0 = normal, 3.0 = fast
}

let simulationState: SimulationState = {
  isPlaying: false,
  isPaused: false,
  globalTime: 0,
  tickCount: 0,
  speedMultiplier: 1.0
};

let stateChangeListeners: (() => void)[] = [];

export const getSimulationState = (): SimulationState => {
  return { ...simulationState };
};

export const playSimulation = () => {
  simulationState.isPlaying = true;
  simulationState.isPaused = false;
  notifyListeners();
};

export const pauseSimulation = () => {
  simulationState.isPaused = true;
  notifyListeners();
};

export const resetSimulation = () => {
  simulationState.isPlaying = false;
  simulationState.isPaused = false;
  simulationState.globalTime = 0;
  simulationState.tickCount = 0;
  notifyListeners();
};

export const updateGlobalTime = (deltaTime: number) => {
  if (simulationState.isPlaying && !simulationState.isPaused) {
    simulationState.globalTime += deltaTime * simulationState.speedMultiplier;
    simulationState.tickCount += 1;
  }
};

export const setSpeedMultiplier = (speed: number) => {
  simulationState.speedMultiplier = Math.max(0.1, Math.min(20.0, speed));
  notifyListeners();
};

export const getSpeedMultiplier = (): number => {
  return simulationState.speedMultiplier;
};

export const getTickCount = (): number => {
  return simulationState.tickCount;
};

export const isSimulationRunning = (): boolean => {
  return simulationState.isPlaying && !simulationState.isPaused;
};

export const addStateChangeListener = (listener: () => void) => {
  stateChangeListeners.push(listener);
  return () => {
    stateChangeListeners = stateChangeListeners.filter(l => l !== listener);
  };
};

const notifyListeners = () => {
  stateChangeListeners.forEach(listener => listener());
}; 