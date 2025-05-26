// Simulation control singleton
interface SimulationState {
  isPlaying: boolean;
  isPaused: boolean;
  globalTime: number;
}

let simulationState: SimulationState = {
  isPlaying: false,
  isPaused: false,
  globalTime: 0
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
  notifyListeners();
};

export const updateGlobalTime = (deltaTime: number) => {
  if (simulationState.isPlaying && !simulationState.isPaused) {
    simulationState.globalTime += deltaTime;
  }
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