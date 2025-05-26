// Simulation control singleton
interface SimulationState {
  isPlaying: boolean;
  isPaused: boolean;
  globalTime: number; // Tracks total seconds elapsed
  tickCount: number;
  speedMultiplier: number; // 0.1 = slow, 1.0 = normal, 20.0 = fast
  dayCount: number; // Tracks number of days passed (1 second = 1 day)
}

const simulationState: SimulationState = {
  isPlaying: false,
  isPaused: true,
  globalTime: 0,
  tickCount: 0,
  speedMultiplier: 1.0,
  dayCount: 0,
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

export const togglePlayPause = () => {
  if (simulationState.isPlaying && !simulationState.isPaused) {
    pauseSimulation();
  } else {
    playSimulation(); // This handles both starting and resuming
  }
  // playSimulation and pauseSimulation already call notifyListeners
};

export const resetSimulation = () => {
  simulationState.isPlaying = false;
  simulationState.isPaused = true;
  simulationState.globalTime = 0;
  simulationState.tickCount = 0;
  simulationState.dayCount = 0; // Reset dayCount
  // simulationState.speedMultiplier remains unchanged as per user preference
  notifyListeners();
};

export const updateGlobalTime = (deltaTime: number) => {
  if (simulationState.isPlaying && !simulationState.isPaused) {
    const scaledDeltaTime = deltaTime * simulationState.speedMultiplier;
    simulationState.globalTime += scaledDeltaTime / 60; // Assuming deltaTime is in frames and targeting 60 FPS for 1 second
    simulationState.tickCount++;
    simulationState.dayCount = Math.floor(simulationState.globalTime); // Update dayCount based on globalTime
    notifyListeners();
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

export const getDayCount = (): number => {
  return simulationState.dayCount;
};

export const getGlobalTime = (): number => {
  return simulationState.globalTime;
};

export const isSimulationRunning = (): boolean => {
  return simulationState.isPlaying && !simulationState.isPaused;
};

export const addStateChangeListener = (listener: () => void) => {
  stateChangeListeners.push(listener);
  return () => {
    stateChangeListeners = stateChangeListeners.filter((l) => l !== listener);
  };
};

const notifyListeners = () => {
  stateChangeListeners.forEach((listener) => listener());
};
