import { Application, extend } from "@pixi/react";
import { Container, Sprite } from "pixi.js";
import { AgentScene } from "./agents/AgentScene";
import { River, createRiver, createRiverControls, updateRiver, resetRiver, getRiver } from "./environment/River";
import { useRef, useEffect, useState } from "react";
import { playSimulation, pauseSimulation, resetSimulation, getSimulationState, addStateChangeListener, setSpeedMultiplier, getSpeedMultiplier, getTickCount, getDayCount, togglePlayPause } from "./simulation/SimulationControl";
import DayDisplay from "./components/DayDisplay";

// extend tells @pixi/react what Pixi.js components are available
extend({
  Container,
  Sprite,
});

const NutrientsDisplay = ({ totalNutrients }: { totalNutrients: number }) => {
  return (
    <div style={{
      position: "absolute",
      top: "10px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      padding: "8px 16px",
      borderRadius: "20px",
      border: "2px solid #4CAF50",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      zIndex: 1001,
      fontWeight: "bold",
      color: "#2E7D32"
    }}>
      🌱 Nutrients: {totalNutrients.toFixed(1)} kg
    </div>
  );
};

const PollutionDisplay = ({ pollutionLevel }: { pollutionLevel: number }) => {
  const pollutionColor = pollutionLevel > 50 ? "#D32F2F" : pollutionLevel > 20 ? "#FF9800" : "#4CAF50";
  
  return (
    <div style={{
      position: "absolute",
      top: "50px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      padding: "8px 16px",
      borderRadius: "20px",
      border: `2px solid ${pollutionColor}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      zIndex: 1001,
      fontWeight: "bold",
      color: pollutionColor
    }}>
      🏭 Pollution: {pollutionLevel.toFixed(1)}%
    </div>
  );
};

const TickDisplay = () => {
  const [tickCount, setTickCount] = useState(getTickCount());
  const [speedMultiplier, setSpeedMultiplierState] = useState(getSpeedMultiplier());

  useEffect(() => {
    const unsubscribe = addStateChangeListener(() => {
      setTickCount(getTickCount());
      setSpeedMultiplierState(getSpeedMultiplier());
    });
    return unsubscribe;
  }, []);

  const getSpeedLabel = (value: number) => {
    if (value === 0.1) return "Very Slow";
    if (value === 0.5) return "Slow";
    if (value === 1) return "Normal";
    if (value === 5) return "Fast";
    if (value === 10) return "Very Fast";
    if (value === 20) return "Super Fast";
    return `${value}x`;
  };

  return (
    <div style={{
      position: "absolute",
      top: "90px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      padding: "8px 16px",
      borderRadius: "20px",
      border: "2px solid #2196F3",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      zIndex: 1001,
      fontWeight: "bold",
      color: "#1976D2",
      fontSize: "12px"
    }}>
      ⏱️ Speed: {getSpeedLabel(speedMultiplier)} ({speedMultiplier}x)
    </div>
  );
};

const RiverControls = ({ river, setRiver }: { river: River, setRiver: (river: River) => void }) => {
  const { handleFlowDirectionChange, handleFlowRateChange, handleNutrientsChange, handleTemperatureChange, handleSunlightChange, handlePollutionChange } = createRiverControls(river, setRiver);

  return (
    <div style={{ 
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      padding: "8px",
      borderRadius: "5px",
      border: "1px solid #ccc",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      color: "black",
      fontSize: "12px"
    }}>
      <h4 style={{ margin: "0 0 8px 0", color: "black", fontSize: "14px" }}>River Controls</h4>
      <div style={{ marginBottom: "6px" }}>
        <label style={{ color: "black", fontSize: "11px" }}>Flow Direction: </label>
        <input 
          type="range" 
          min="0" 
          max="6.28" 
          step="0.1" 
          value={river.flowDirection} 
          onChange={(e) => handleFlowDirectionChange(parseFloat(e.target.value))}
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}> {river.flowDirection.toFixed(1)}</span>
      </div>
      <div style={{ marginBottom: "6px" }}>
        <label style={{ color: "black", fontSize: "11px" }}>Flow Rate: </label>
        <input 
          type="range" 
          min="0" 
          max="10" 
          step="0.5" 
          value={river.flowRate} 
          onChange={(e) => handleFlowRateChange(parseFloat(e.target.value))}
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}> {river.flowRate}</span>
      </div>
      <div style={{ marginBottom: "6px" }}>
        <label style={{ color: "black", fontSize: "11px" }}>Nutrients (kg): </label>
        <input 
          type="range" 
          min="0" 
          max="500" 
          step="5" 
          value={river.totalNutrients} 
          onChange={(e) => handleNutrientsChange(parseFloat(e.target.value))}
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}> {river.totalNutrients.toFixed(0)}</span>
      </div>
      <div style={{ marginBottom: "6px" }}>
        <label style={{ color: "black", fontSize: "11px" }}>Temperature (°C): </label>
        <input 
          type="range" 
          min="12" 
          max="45" 
          step="1" 
          value={river.temperature} 
          onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}> {river.temperature}°C</span>
      </div>
      <div style={{ marginBottom: "6px" }}>
        <label style={{ color: "black", fontSize: "11px" }}>Sunlight: </label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.1" 
          value={river.sunlight} 
          onChange={(e) => handleSunlightChange(parseFloat(e.target.value))}
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}> {river.sunlight.toFixed(1)}</span>
      </div>
      <div>
        <label style={{ color: "black", fontSize: "11px" }}>Pollution (%): </label>
        <input 
          type="range" 
          min="0" 
          max="1000" 
          step="10" 
          value={river.pollutionLevel} 
          onChange={(e) => handlePollutionChange(parseFloat(e.target.value))}
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}> {river.pollutionLevel.toFixed(0)}%</span>
      </div>
    </div>
  );
};

const SetupControls = ({ setRiver }: { setRiver: (river: River) => void }) => {
  const [hyacinthCount, setHyacinthCount] = useState(5);
  const [fishCount, setFishCount] = useState(3);
  const [simulationState, setSimulationState] = useState(getSimulationState());
  const [speedMultiplier, setSpeedMultiplierState] = useState(getSpeedMultiplier());

  useEffect(() => {
    const unsubscribe = addStateChangeListener(() => {
      setSimulationState(getSimulationState());
      setSpeedMultiplierState(getSpeedMultiplier());
    });
    return unsubscribe;
  }, []);

  const handleSetup = () => {
    // Reset agents first
    // @ts-ignore
    if (window.resetAgents) window.resetAgents();
    
    // Setup hyacinths and fish using batch functions
    // @ts-ignore
    if (window.setupHyacinths) window.setupHyacinths(hyacinthCount);
    // @ts-ignore
    if (window.setupFish) window.setupFish(fishCount);
  };

  const handleTogglePlayPause = () => {
    togglePlayPause();
  };

  const handleReset = () => {
    resetSimulation();
    
    // Reset agents
    // @ts-ignore
    if (window.resetAgents) window.resetAgents();
    
    // Don't reset river settings - keep current user configurations
  };

  const handleSpeedChange = (value: number) => {
    setSpeedMultiplier(value);
  };

  const speedButtons = [
    { label: "Very Slow", value: 0.1, color: "#2196F3" },
    { label: "Slow", value: 0.5, color: "#4CAF50" },
    { label: "Normal", value: 1, color: "#FF9800" },
    { label: "Fast", value: 5, color: "#FF5722" },
    { label: "Very Fast", value: 10, color: "#E91E63" },
    { label: "Super Fast", value: 20, color: "#9C27B0" }
  ];

  return (
    <div style={{ 
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      padding: "8px",
      borderRadius: "5px",
      border: "1px solid #ccc",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      fontSize: "12px"
    }}>
      <h4 style={{ margin: "0 0 8px 0", color: "black", fontSize: "14px" }}>Setup & Control</h4>
      
      {/* Simulation Controls */}
      <div style={{ marginBottom: "8px", display: "flex", gap: "6px" }}>
        <button 
          onClick={handleTogglePlayPause}
          style={{
            ...buttonStyle,
            backgroundColor: (simulationState.isPlaying && !simulationState.isPaused) ? "#FF9800" : "#4CAF50", // Orange when playing, Green when paused/stopped
            fontSize: "11px", 
            padding: "4px 8px"
          }}
        >
          {(simulationState.isPlaying && !simulationState.isPaused) ? "⏸️ Pause" : "▶️ Play"}
        </button>
        <button 
          onClick={handleReset} 
          style={{...buttonStyle, backgroundColor: "#f44336", fontSize: "11px", padding: "4px 8px"}}
        >
          🔄 Reset
        </button>
      </div>

      {/* Agent Setup */}
      <div style={{ marginBottom: "6px" }}>
        <label style={{ color: "black", fontSize: "11px" }}>Hyacinths: </label>
        <input 
          type="range" 
          min="0" 
          max="20" 
          step="1" 
          value={hyacinthCount} 
          onChange={(e) => setHyacinthCount(parseInt(e.target.value))}
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}> {hyacinthCount}</span>
      </div>
      <div style={{ marginBottom: "8px" }}>
        <label style={{ color: "black", fontSize: "11px" }}>Fish: </label>
        <input 
          type="range" 
          min="0" 
          max="15" 
          step="1" 
          value={fishCount} 
          onChange={(e) => setFishCount(parseInt(e.target.value))}
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}> {fishCount}</span>
      </div>
      <button 
        onClick={handleSetup} 
        style={{...buttonStyle, fontSize: "12px", padding: "6px 12px", marginBottom: "8px"}}
      >
        🔧 Setup
      </button>

      {/* Speed Control Buttons */}
      <div style={{ marginTop: "8px", borderTop: "1px solid #ddd", paddingTop: "8px" }}>
        <div style={{ color: "black", fontSize: "11px", marginBottom: "6px", fontWeight: "bold" }}>
          Speed Control:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
          {speedButtons.map((button) => (
            <button
              key={button.value}
              onClick={() => handleSpeedChange(button.value)}
              style={{
                ...buttonStyle,
                backgroundColor: speedMultiplier === button.value ? button.color : "#f0f0f0",
                color: speedMultiplier === button.value ? "white" : "black",
                fontSize: "10px",
                padding: "4px 6px",
                border: speedMultiplier === button.value ? `2px solid ${button.color}` : "1px solid #ccc",
                fontWeight: speedMultiplier === button.value ? "bold" : "normal"
              }}
            >
              {button.label}
            </button>
          ))}
        </div>
        <div style={{ color: "black", fontSize: "10px", marginTop: "4px", textAlign: "center" }}>
          Current: {speedMultiplier}x
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [river, setRiver] = useState<River>(createRiver()); // This will always return the same singleton instance
  
  // Handle nutrient consumption by hyacinths
  const handleNutrientConsumption = (consumedAmount: number) => {
    const currentRiver = getRiver(); // Get the current singleton state
    const updatedRiver = updateRiver({ 
      totalNutrients: Math.max(0, currentRiver.totalNutrients - consumedAmount) 
    });
    setRiver(updatedRiver);
  };
  
  // Handle pollution consumption by hyacinths
  const handlePollutionConsumption = (consumedAmount: number) => {
    const currentRiver = getRiver(); // Get the current singleton state
    const updatedRiver = updateRiver({ 
      pollutionLevel: Math.max(0, currentRiver.pollutionLevel - consumedAmount) 
    });
    setRiver(updatedRiver);
  };
  
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100vh", 
      width: "100vw",
      boxSizing: "border-box",
      position: "relative"
    }}>
      {/* Nutrients display at the top center */}
      <NutrientsDisplay totalNutrients={river.totalNutrients} />
      
      {/* Pollution display at the top center */}
      <PollutionDisplay pollutionLevel={river.pollutionLevel} />
      
      {/* Tick display at the top center */}
      <TickDisplay />

      {/* Day display below TickDisplay */}
      <DayDisplay />
      
      {/* Floating controls overlay */}
      <div style={{ 
        position: "absolute",
        top: "10px",
        left: "10px",
        right: "10px",
        display: "flex", 
        justifyContent: "flex-start",
        zIndex: 1000,
        pointerEvents: "none"
      }}>
        <div style={{ pointerEvents: "auto", display: "flex", gap: "8px" }}>
          <SetupControls setRiver={setRiver} />
          <RiverControls river={river} setRiver={setRiver} />
        </div>
      </div>
      
      {/* Full screen simulation */}
      <div 
        ref={containerRef}
        style={{ 
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          position: "relative"
        }}
      >
        <Application 
          background={"#1099bb"} 
          resizeTo={containerRef}
          autoDensity={true}
        >
          <AgentScene river={river} onNutrientConsumption={handleNutrientConsumption} onPollutionConsumption={handlePollutionConsumption} />
        </Application>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppContent />
  );
}

const buttonStyle = {
  padding: "8px 12px",
  backgroundColor: "#4CAF50",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "bold",
  boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
};
