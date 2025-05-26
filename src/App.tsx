import { Application, extend } from "@pixi/react";
import { Container, Sprite } from "pixi.js";
import { AgentScene } from "./agents/AgentScene";
import { River, createRiver, createRiverControls, updateRiver, resetRiver, getRiver } from "./environment/River";
import { useRef, useEffect, useState } from "react";
import { playSimulation, pauseSimulation, resetSimulation, getSimulationState, addStateChangeListener, setSpeedMultiplier, getSpeedMultiplier, getTickCount, getDayCount, togglePlayPause } from "./simulation/SimulationControl";
import DayDisplay from "./components/DayDisplay";
import DissolvedOxygenDisplay from "./components/DissolvedOxygenDisplay";

// extend tells @pixi/react what Pixi.js components are available
extend({
  Container,
  Sprite,
});

// Interface for population data points
interface PopulationDataPoint {
  day: number;
  fishCount: number;
  hyacinthCount: number;
}

const PopulationGraph = ({ populationData }: { populationData: PopulationDataPoint[] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || populationData.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Graph dimensions
    const padding = 30;
    const graphWidth = canvas.width - 2 * padding;
    const graphHeight = canvas.height - 2 * padding;
    
    // Find max values for scaling
    const maxDay = Math.max(...populationData.map(d => d.day), 1);
    const maxPopulation = Math.max(
      ...populationData.map(d => Math.max(d.fishCount, d.hyacinthCount)),
      1
    );
    
    // Draw background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, padding, graphWidth, graphHeight);
    
    // Draw grid lines
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // Vertical grid lines (time)
    for (let i = 0; i <= 5; i++) {
      const x = padding + (i / 5) * graphWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + graphHeight);
      ctx.stroke();
    }
    
    // Horizontal grid lines (population)
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + graphWidth, y);
      ctx.stroke();
    }
    
    // Draw axes labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // X-axis label
    ctx.fillText('Days', canvas.width / 2, canvas.height - 5);
    
    // Y-axis label
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Population', 0, 0);
    ctx.restore();
    
    // Draw scale numbers
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    // X-axis numbers
    for (let i = 0; i <= 5; i++) {
      const x = padding + (i / 5) * graphWidth;
      const dayValue = (i / 5) * maxDay;
      ctx.fillText(dayValue.toFixed(0), x, canvas.height - padding + 15);
    }
    
    // Y-axis numbers
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = padding + graphHeight - (i / 5) * graphHeight;
      const popValue = (i / 5) * maxPopulation;
      ctx.fillText(popValue.toFixed(0), padding - 5, y + 3);
    }
    
    if (populationData.length < 2) return;
    
    // Draw fish line (blue)
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    populationData.forEach((point, index) => {
      const x = padding + (point.day / maxDay) * graphWidth;
      const y = padding + graphHeight - (point.fishCount / maxPopulation) * graphHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // Draw hyacinth line (green)
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    populationData.forEach((point, index) => {
      const x = padding + (point.day / maxDay) * graphWidth;
      const y = padding + graphHeight - (point.hyacinthCount / maxPopulation) * graphHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // Draw legend
    const legendX = canvas.width - 80;
    const legendY = 20;
    
    // Fish legend
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(legendX, legendY, 15, 3);
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('🐟 Fish', legendX + 20, legendY + 10);
    
    // Hyacinth legend
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(legendX, legendY + 20, 15, 3);
    ctx.fillStyle = '#333';
    ctx.fillText('🌿 Hyacinths', legendX + 20, legendY + 30);
    
  }, [populationData]);
  
  return (
    <div style={{
      position: "absolute",
      bottom: "10px",
      right: "10px",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderRadius: "8px",
      border: "2px solid #333",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      zIndex: 1001,
      padding: "5px"
    }}>
      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        style={{
          display: "block"
        }}
      />
    </div>
  );
};

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

const FishCountDisplay = ({ fishCount }: { fishCount: number }) => {
  return (
    <div style={{
      position: "absolute",
      top: "10px",
      right: "10px",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      padding: "8px 16px",
      borderRadius: "20px",
      border: "2px solid #FF5722",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      zIndex: 1001,
      fontWeight: "bold",
      color: "#D84315",
      fontSize: "14px"
    }}>
      🐟 Fish: {fishCount}
    </div>
  );
};

const HyacinthCountDisplay = ({ hyacinthCount }: { hyacinthCount: number }) => {
  return (
    <div style={{
      position: "absolute",
      top: "50px",
      right: "10px",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      padding: "8px 16px",
      borderRadius: "20px",
      border: "2px solid #8BC34A",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      zIndex: 1001,
      fontWeight: "bold",
      color: "#558B2F",
      fontSize: "14px"
    }}>
      🌿 Hyacinths: {hyacinthCount}
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
          max="100" 
          step="1" 
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
  const [hyacinthReproduceRate, setHyacinthReproduceRate] = useState(5);
  const [fishReproduceRate, setFishReproduceRate] = useState(5);
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
    // Convert percentage (1-100) to decimal (0-1) for internal use
    // @ts-ignore
    if (window.setupHyacinths) window.setupHyacinths(hyacinthCount, hyacinthReproduceRate / 100);
    // @ts-ignore
    if (window.setupFish) window.setupFish(fishCount, fishReproduceRate / 100);
  };

  const handleHyacinthReproduceRateChange = (newRate: number) => {
    setHyacinthReproduceRate(newRate);
    // Update all existing hyacinth reproduce rates
    // Convert percentage (1-100) to decimal (0-1) for internal use
    // @ts-ignore
    if (window.updateAllHyacinthReproduceRate) window.updateAllHyacinthReproduceRate(newRate / 100);
  };

  const handleFishReproduceRateChange = (newRate: number) => {
    setFishReproduceRate(newRate);
    // Update all existing fish reproduce rates
    // Convert percentage (1-100) to decimal (0-1) for internal use
    // @ts-ignore
    if (window.updateAllFishReproduceRate) window.updateAllFishReproduceRate(newRate / 100);
  };

  const handleTogglePlayPause = () => {
    togglePlayPause();
  };

  const handleReset = () => {
    resetSimulation(); // Resets simulation state (time, ticks, days, play/pause)
    
    // Reset agents (clears hyacinth and fish arrays via window.resetAgents)
    // @ts-ignore
    if (window.resetAgents) window.resetAgents();
    
    // Explicitly set desired river parameters after general reset
    const specificRiverSettings = updateRiver({
      pollutionLevel: 100, // Override: Set pollution to 100%
      totalNutrients: 500,   // Override: Set nutrients to 500 kg
      // Other river parameters will retain values from a full resetRiver() if we were to call it,
      // or retain current values if we don't call a full resetRiver().
      // For safety and to ensure other defaults are also set (like DO, flow rate etc. from resetRiver):
      // Call resetRiver() first, then override specific values.
    });
    // To ensure all other default values from resetRiver() are applied first:
    let riverStateAfterFullReset = resetRiver();
    riverStateAfterFullReset = updateRiver({
      ...riverStateAfterFullReset, // Start with all defaults from resetRiver
      pollutionLevel: 100,       // Then override pollution
      totalNutrients: 500,       // Then override nutrients
    });
    setRiver(riverStateAfterFullReset);
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
      <div style={{ marginBottom: "6px" }}>
        <label style={{ color: "black", fontSize: "11px" }}>Hyacinth Reproduce Rate: </label>
        <input 
          type="range" 
          min="1" 
          max="100" 
          step="1" 
          value={hyacinthReproduceRate} 
          onChange={(e) => handleHyacinthReproduceRateChange(parseInt(e.target.value))}
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}> {hyacinthReproduceRate}%</span>
      </div>
      <div style={{ marginBottom: "6px" }}>
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
      <div style={{ marginBottom: "8px" }}>
        <label style={{ color: "black", fontSize: "11px" }}>Fish Reproduce Rate: </label>
        <input 
          type="range" 
          min="1" 
          max="100" 
          step="1" 
          value={fishReproduceRate} 
          onChange={(e) => handleFishReproduceRateChange(parseInt(e.target.value))}
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}> {fishReproduceRate}%</span>
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
  const [river, setRiver] = useState<River>(createRiver());
  const [fishCount, setFishCount] = useState(0);
  const [hyacinthCount, setHyacinthCount] = useState(0);
  const [populationData, setPopulationData] = useState<PopulationDataPoint[]>([]);
  const lastRecordedDay = useRef<number>(-1);
  
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

  const handleCurrentDOChange = (newDO: number) => {
    const updatedRiver = updateRiver({ currentDissolvedOxygen: newDO });
    setRiver(updatedRiver);
  };

  // Handle count updates from AgentScene
  const handleCountsChange = (newFishCount: number, newHyacinthCount: number) => {
    setFishCount(newFishCount);
    setHyacinthCount(newHyacinthCount);
    
    // Record population data every day
    const currentDay = getDayCount();
    if (currentDay !== lastRecordedDay.current) {
      lastRecordedDay.current = currentDay;
      
      setPopulationData(prevData => {
        const newDataPoint: PopulationDataPoint = {
          day: currentDay,
          fishCount: newFishCount,
          hyacinthCount: newHyacinthCount
        };
        
        // Keep only the last 100 data points to prevent memory issues
        const updatedData = [...prevData, newDataPoint];
        return updatedData.length > 100 ? updatedData.slice(-100) : updatedData;
      });
    }
  };

  // Reset population data when simulation is reset
  useEffect(() => {
    const unsubscribe = addStateChangeListener(() => {
      const currentDay = getDayCount();
      if (currentDay === 0 && lastRecordedDay.current !== 0) {
        setPopulationData([]);
        lastRecordedDay.current = -1;
      }
    });
    return unsubscribe;
  }, []);
  
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

      {/* Dissolved Oxygen display below DayDisplay */}
      <DissolvedOxygenDisplay currentDO={river.currentDissolvedOxygen} />

      {/* Fish count display */}
      <FishCountDisplay fishCount={fishCount} />

      {/* Hyacinth count display */}
      <HyacinthCountDisplay hyacinthCount={hyacinthCount} />

      {/* Population graph */}
      <PopulationGraph populationData={populationData} />
      
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
          <AgentScene 
            river={river} 
            onNutrientConsumption={handleNutrientConsumption} 
            onPollutionConsumption={handlePollutionConsumption}
            onCurrentDOChange={handleCurrentDOChange}
            onCountsChange={handleCountsChange}
          />
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
