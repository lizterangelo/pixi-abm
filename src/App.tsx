import { Application, extend } from "@pixi/react";
import { Container, Sprite } from "pixi.js";
import { AgentScene } from "./agents/AgentScene";
import {
  River,
  createRiver,
  createRiverControls,
  updateRiver,
  resetRiver,
  getRiver,
} from "./environment/River";
import { useRef, useEffect, useState } from "react";
import {
  resetSimulation,
  getSimulationState,
  addStateChangeListener,
  setSpeedMultiplier,
  getSpeedMultiplier,
  getDayCount,
  togglePlayPause,
} from "./simulation/SimulationControl";
import DayDisplay from "./components/DayDisplay";
import DissolvedOxygenDisplay from "./components/DissolvedOxygenDisplay";

// Declare global window properties
declare global {
  interface Window {
    resetAgents?: () => void;
    setupHyacinths?: (count: number, reproduceRate: number) => void;
    setupFish?: (count: number, reproduceRate: number) => void;
    updateAllHyacinthReproduceRate?: (rate: number) => void;
    updateAllFishReproduceRate?: (rate: number) => void;
  }
}

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

// Interface for oxygen data points
interface OxygenDataPoint {
  day: number;
  oxygenLevel: number;
}

const PopulationGraph = ({
  populationData,
}: {
  populationData: PopulationDataPoint[];
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || populationData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Graph dimensions
    const padding = 40; // Increased padding for better labels
    const graphWidth = canvas.width - 2 * padding;
    const graphHeight = canvas.height - 2 * padding;

    // Sample data for performance if we have too many points
    let displayData = populationData;
    const maxDisplayPoints = 200; // Maximum points to display for performance
    
    if (populationData.length > maxDisplayPoints) {
      // Sample data evenly across the entire range
      const step = Math.floor(populationData.length / maxDisplayPoints);
      displayData = populationData.filter((_, index) => index % step === 0);
      // Always include the last data point
      if (displayData[displayData.length - 1] !== populationData[populationData.length - 1]) {
        displayData.push(populationData[populationData.length - 1]);
      }
    }

    // Find max values for scaling (use all data, not just displayed)
    const maxDay = Math.max(...populationData.map((d) => d.day), 1);
    const maxPopulation = Math.max(
      ...populationData.map((d) => Math.max(d.fishCount, d.hyacinthCount)),
      1,
    );

    // Draw background
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, padding, graphWidth, graphHeight);

    // Draw grid lines
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;

    // Vertical grid lines (time) - more grid lines for better readability
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * graphWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + graphHeight);
      ctx.stroke();
    }

    // Horizontal grid lines (population)
    for (let i = 0; i <= 10; i++) {
      const y = padding + (i / 10) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + graphWidth, y);
      ctx.stroke();
    }

    // Draw axes labels
    ctx.fillStyle = "#333";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";

    // X-axis label
    ctx.fillText("Weeks", canvas.width / 2, canvas.height - 5);

    // Y-axis label
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Population", 0, 0);
    ctx.restore();

    // Draw scale numbers with better formatting
    ctx.font = "11px Arial";
    ctx.textAlign = "center";

    // X-axis numbers - show key time points
    const timeLabels = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    timeLabels.forEach((ratio) => {
      const x = padding + ratio * graphWidth;
      const dayValue = ratio * maxDay;
      ctx.fillText(dayValue.toFixed(0), x, canvas.height - padding + 15);
    });

    // Y-axis numbers
    ctx.textAlign = "right";
    const popLabels = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    popLabels.forEach((ratio) => {
      const y = padding + graphHeight - ratio * graphHeight;
      const popValue = ratio * maxPopulation;
      ctx.fillText(popValue.toFixed(0), padding - 5, y + 4);
    });

    if (displayData.length < 2) return;

    // Draw fish line (blue) with anti-aliasing
    ctx.strokeStyle = "#2196F3";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    displayData.forEach((point, index) => {
      const x = padding + (point.day / maxDay) * graphWidth;
      const y =
        padding + graphHeight - (point.fishCount / maxPopulation) * graphHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw hyacinth line (green) with anti-aliasing
    ctx.strokeStyle = "#4CAF50";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    displayData.forEach((point, index) => {
      const x = padding + (point.day / maxDay) * graphWidth;
      const y =
        padding +
        graphHeight -
        (point.hyacinthCount / maxPopulation) * graphHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw data points for recent data (last 20 points) for better visibility
    const recentData = populationData.slice(-20);
    
    // Fish points
    ctx.fillStyle = "#1976D2";
    recentData.forEach((point) => {
      const x = padding + (point.day / maxDay) * graphWidth;
      const y = padding + graphHeight - (point.fishCount / maxPopulation) * graphHeight;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Hyacinth points
    ctx.fillStyle = "#388E3C";
    recentData.forEach((point) => {
      const x = padding + (point.day / maxDay) * graphWidth;
      const y = padding + graphHeight - (point.hyacinthCount / maxPopulation) * graphHeight;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Enhanced legend with data info
    const legendX = canvas.width - 120;
    const legendY = 15;

    // Background for legend
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(legendX - 5, legendY - 5, 115, 70);
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 5, legendY - 5, 115, 70);

    // Fish legend
    ctx.fillStyle = "#2196F3";
    ctx.fillRect(legendX, legendY + 5, 15, 3);
    ctx.fillStyle = "#333";
    ctx.font = "11px Arial";
    ctx.textAlign = "left";
    ctx.fillText("🐟 Fish", legendX + 20, legendY + 12);

    // Hyacinth legend
    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(legendX, legendY + 25, 15, 3);
    ctx.fillStyle = "#333";
    ctx.fillText("🌿 Hyacinths", legendX + 20, legendY + 32);

    // Data info
    ctx.font = "9px Arial";
    ctx.fillStyle = "#666";
    if (displayData.length < populationData.length) {
      ctx.fillText(`Showing: ${displayData.length}`, legendX, legendY + 65);
    }
  }, [populationData]);

  return (
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: "8px",
        border: "2px solid #333",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        padding: "5px",
      }}
    >
      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        style={{
          display: "block",
        }}
      />
    </div>
  );
};

const OxygenGraph = ({
  oxygenData,
}: {
  oxygenData: OxygenDataPoint[];
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || oxygenData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Graph dimensions
    const padding = 40;
    const graphWidth = canvas.width - 2 * padding;
    const graphHeight = canvas.height - 2 * padding;

    // Sample data for performance if we have too many points
    let displayData = oxygenData;
    const maxDisplayPoints = 200;
    
    if (oxygenData.length > maxDisplayPoints) {
      const step = Math.floor(oxygenData.length / maxDisplayPoints);
      displayData = oxygenData.filter((_, index) => index % step === 0);
      if (displayData[displayData.length - 1] !== oxygenData[oxygenData.length - 1]) {
        displayData.push(oxygenData[oxygenData.length - 1]);
      }
    }

    // Find max values for scaling
    const maxDay = Math.max(...oxygenData.map((d) => d.day), 1);
    const maxOxygen = Math.max(...oxygenData.map((d) => d.oxygenLevel), 10); // Minimum scale of 10 mg/L
    const minOxygen = Math.min(...oxygenData.map((d) => d.oxygenLevel), 0);

    // Draw background
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, padding, graphWidth, graphHeight);

    // Draw grid lines
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;

    // Vertical grid lines (time)
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * graphWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + graphHeight);
      ctx.stroke();
    }

    // Horizontal grid lines (oxygen)
    for (let i = 0; i <= 10; i++) {
      const y = padding + (i / 10) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + graphWidth, y);
      ctx.stroke();
    }

    // Draw critical oxygen zones
    const oxygenRange = maxOxygen - minOxygen;
    
    // Critical zone (0-2 mg/L) - Red background
    if (minOxygen < 2) {
      const criticalTop = padding + graphHeight - ((2 - minOxygen) / oxygenRange) * graphHeight;
      const criticalBottom = padding + graphHeight - ((0 - minOxygen) / oxygenRange) * graphHeight;
      ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
      ctx.fillRect(padding, Math.max(criticalTop, padding), graphWidth, Math.min(criticalBottom - criticalTop, graphHeight));
    }

    // Warning zone (2-4 mg/L) - Yellow background
    if (minOxygen < 4) {
      const warningTop = padding + graphHeight - ((4 - minOxygen) / oxygenRange) * graphHeight;
      const warningBottom = padding + graphHeight - ((2 - minOxygen) / oxygenRange) * graphHeight;
      ctx.fillStyle = "rgba(255, 255, 0, 0.1)";
      ctx.fillRect(padding, Math.max(warningTop, padding), graphWidth, Math.min(warningBottom - warningTop, graphHeight));
    }

    // Draw axes labels
    ctx.fillStyle = "#333";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";

    // X-axis label
    ctx.fillText("Weeks", canvas.width / 2, canvas.height - 5);

    // Y-axis label
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Dissolved Oxygen (mg/L)", 0, 0);
    ctx.restore();

    // Draw scale numbers
    ctx.font = "11px Arial";
    ctx.textAlign = "center";

    // X-axis numbers
    const timeLabels = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    timeLabels.forEach((ratio) => {
      const x = padding + ratio * graphWidth;
      const dayValue = ratio * maxDay;
      ctx.fillText(dayValue.toFixed(0), x, canvas.height - padding + 15);
    });

    // Y-axis numbers
    ctx.textAlign = "right";
    const oxygenLabels = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    oxygenLabels.forEach((ratio) => {
      const y = padding + graphHeight - ratio * graphHeight;
      const oxygenValue = minOxygen + ratio * oxygenRange;
      ctx.fillText(oxygenValue.toFixed(1), padding - 5, y + 4);
    });

    if (displayData.length < 2) return;

    // Draw oxygen line with color coding
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    displayData.forEach((point, index) => {
      const x = padding + (point.day / maxDay) * graphWidth;
      const y = padding + graphHeight - ((point.oxygenLevel - minOxygen) / oxygenRange) * graphHeight;

      // Color code based on oxygen level
      if (point.oxygenLevel < 2) {
        ctx.strokeStyle = "#D32F2F"; // Red for critical
      } else if (point.oxygenLevel < 4) {
        ctx.strokeStyle = "#FF9800"; // Orange for warning
      } else if (point.oxygenLevel < 6) {
        ctx.strokeStyle = "#FFC107"; // Yellow for caution
      } else {
        ctx.strokeStyle = "#4CAF50"; // Green for good
      }

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw data points for recent data
    const recentData = oxygenData.slice(-20);
    recentData.forEach((point) => {
      const x = padding + (point.day / maxDay) * graphWidth;
      const y = padding + graphHeight - ((point.oxygenLevel - minOxygen) / oxygenRange) * graphHeight;
      
      // Color code the points
      if (point.oxygenLevel < 2) {
        ctx.fillStyle = "#D32F2F";
      } else if (point.oxygenLevel < 4) {
        ctx.fillStyle = "#FF9800";
      } else if (point.oxygenLevel < 6) {
        ctx.fillStyle = "#FFC107";
      } else {
        ctx.fillStyle = "#4CAF50";
      }
      
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Enhanced legend
    const legendX = canvas.width - 120;
    const legendY = 15;

    // Background for legend
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(legendX - 5, legendY - 5, 115, 85);
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 5, legendY - 5, 115, 85);

    // Legend items
    ctx.font = "10px Arial";
    ctx.textAlign = "left";
    
    // Good (Green)
    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(legendX, legendY + 5, 12, 3);
    ctx.fillStyle = "#333";
    ctx.fillText("≥6.0: Good", legendX + 16, legendY + 12);

    // Caution (Yellow)
    ctx.fillStyle = "#FFC107";
    ctx.fillRect(legendX, legendY + 20, 12, 3);
    ctx.fillStyle = "#333";
    ctx.fillText("4-6: Caution", legendX + 16, legendY + 27);

    // Warning (Orange)
    ctx.fillStyle = "#FF9800";
    ctx.fillRect(legendX, legendY + 35, 12, 3);
    ctx.fillStyle = "#333";
    ctx.fillText("2-4: Warning", legendX + 16, legendY + 42);

    // Critical (Red)
    ctx.fillStyle = "#D32F2F";
    ctx.fillRect(legendX, legendY + 50, 12, 3);
    ctx.fillStyle = "#333";
    ctx.fillText("<2: Critical", legendX + 16, legendY + 57);

    // Data info
    ctx.font = "9px Arial";
    ctx.fillStyle = "#666";
    if (displayData.length < oxygenData.length) {
      ctx.fillText(`Showing: ${displayData.length}`, legendX, legendY + 90);
    }
  }, [oxygenData]);

  return (
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: "8px",
        border: "2px solid #333",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        padding: "5px",
      }}
    >
      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        style={{
          display: "block",
        }}
      />
    </div>
  );
};

const NutrientsDisplay = ({ totalNutrients }: { totalNutrients: number }) => {
  return (
    <div
      style={{
      backgroundColor: "rgba(255, 255, 255, 0.9)",
        padding: "6px 12px",
        borderRadius: "15px",
      border: "2px solid #4CAF50",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      fontWeight: "bold",
        color: "#2E7D32",
        fontSize: "12px",
        whiteSpace: "nowrap",
      }}
    >
      🌱 Nutrients: {totalNutrients.toFixed(1)} kg
    </div>
  );
};

const PollutionDisplay = ({ pollutionLevel }: { pollutionLevel: number }) => {
  const pollutionColor =
    pollutionLevel > 50
      ? "#D32F2F"
      : pollutionLevel > 20
        ? "#FF9800"
        : "#4CAF50";
  
  return (
    <div
      style={{
      backgroundColor: "rgba(255, 255, 255, 0.9)",
        padding: "6px 12px",
        borderRadius: "15px",
      border: `2px solid ${pollutionColor}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      fontWeight: "bold",
        color: pollutionColor,
        fontSize: "12px",
        whiteSpace: "nowrap",
      }}
    >
      🏭 Pollution: {pollutionLevel.toFixed(1)}%
    </div>
  );
};

const FishCountDisplay = ({ fishCount }: { fishCount: number }) => {
  return (
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        padding: "6px 12px",
        borderRadius: "15px",
        border: "2px solid #FF5722",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        fontWeight: "bold",
        color: "#D84315",
        fontSize: "12px",
        whiteSpace: "nowrap",
      }}
    >
      🐟 Fish: {fishCount}
    </div>
  );
};

const HyacinthCountDisplay = ({ hyacinthCount }: { hyacinthCount: number }) => {
  return (
    <div
      style={{
      backgroundColor: "rgba(255, 255, 255, 0.9)",
        padding: "6px 12px",
        borderRadius: "15px",
        border: "2px solid #8BC34A",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      fontWeight: "bold",
        color: "#558B2F",
        fontSize: "12px",
        whiteSpace: "nowrap",
      }}
    >
      🌿 Hyacinths: {hyacinthCount}
    </div>
  );
};

const RiverControls = ({
  river,
  setRiver,
}: {
  river: River;
  setRiver: (river: River) => void;
}) => {
  const {
    handleFlowDirectionChange,
    handleFlowRateChange,
    handleNutrientsChange,
    handleTemperatureChange,
    handleSunlightChange,
    handlePollutionChange,
  } = createRiverControls(setRiver);

  return (
    <div
      style={{
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      padding: "8px",
      borderRadius: "5px",
      border: "1px solid #ccc",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      color: "black",
        fontSize: "12px",
      }}
    >
      <h4 style={{ margin: "0 0 8px 0", color: "black", fontSize: "14px" }}>
        River Controls
      </h4>
      <div style={{ marginBottom: "6px" }}>
        <label style={{ color: "black", fontSize: "11px" }}>
          Flow Direction:{" "}
        </label>
        <input 
          type="range" 
          min="0" 
          max="6.28" 
          step="0.1" 
          value={river.flowDirection} 
          onChange={(e) =>
            handleFlowDirectionChange(parseFloat(e.target.value))
          }
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}>
          {" "}
          {river.flowDirection.toFixed(1)}
        </span>
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
        <span style={{ color: "black", fontSize: "10px" }}>
          {" "}
          {river.flowRate}
        </span>
      </div>
      <div style={{ marginBottom: "6px" }}>
        <label style={{ color: "black", fontSize: "11px" }}>
          Nutrients:{" "}
        </label>
        <input 
          type="range" 
          min="0" 
          max="500" 
          step="5" 
          value={river.totalNutrients} 
          onChange={(e) => handleNutrientsChange(parseFloat(e.target.value))}
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}>
          {" "}
          {river.totalNutrients.toFixed(0)}
        </span>
      </div>
      <div style={{ marginBottom: "6px" }}>
        <label style={{ color: "black", fontSize: "11px" }}>
          Temperature (°C):{" "}
        </label>
        <input 
          type="range" 
          min="12" 
          max="45" 
          step="1" 
          value={river.temperature} 
          onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}>
          {" "}
          {river.temperature}°C
        </span>
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
        <span style={{ color: "black", fontSize: "10px" }}>
          {" "}
          {river.sunlight.toFixed(1)}
        </span>
      </div>
      <div>
        <label style={{ color: "black", fontSize: "11px" }}>
          Pollution (%):{" "}
        </label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          step="1" 
          value={river.pollutionLevel} 
          onChange={(e) => handlePollutionChange(parseFloat(e.target.value))}
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}>
          {" "}
          {river.pollutionLevel.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

const SetupControls = ({ 
  setRiver, 
  populationData, 
  oxygenData, 
  currentRiver, 
  currentFishCount, 
  currentHyacinthCount 
}: { 
  setRiver: (river: River) => void;
  populationData: PopulationDataPoint[];
  oxygenData: OxygenDataPoint[];
  currentRiver: River;
  currentFishCount: number;
  currentHyacinthCount: number;
}) => {
  const [hyacinthCount, setHyacinthCount] = useState(5);
  const [fishCount, setFishCount] = useState(3);
  const [hyacinthReproduceRate, setHyacinthReproduceRate] = useState(5);
  const [fishReproduceRate, setFishReproduceRate] = useState(5);
  const [simulationState, setSimulationState] = useState(getSimulationState());
  const [speedMultiplier, setSpeedMultiplierState] =
    useState(getSpeedMultiplier());

  useEffect(() => {
    const unsubscribe = addStateChangeListener(() => {
      setSimulationState(getSimulationState());
      setSpeedMultiplierState(getSpeedMultiplier());
    });
    return unsubscribe;
  }, []);

  const handleSetup = () => {
    // Reset agents first
    if (window.resetAgents) window.resetAgents();

    // Setup hyacinths and fish using batch functions
    // Convert percentage (1-100) to decimal (0-1) for internal use
    if (window.setupHyacinths)
      window.setupHyacinths(hyacinthCount, hyacinthReproduceRate / 100);
    if (window.setupFish) window.setupFish(fishCount, fishReproduceRate / 100);
  };

  const handleMagicSetup = () => {
    // Set optimal parameters in the controls only
    setHyacinthCount(5);
    setHyacinthReproduceRate(5);
    setFishCount(15);
    setFishReproduceRate(6);

    // Update river settings to optimal values
    const optimalRiver = updateRiver({
      flowDirection: 0,
      flowRate: 1,
      totalNutrients: 500,
      temperature: 30,
      sunlight: 0.8,
      pollutionLevel: 33,
    });
    setRiver(optimalRiver);

    // Note: Don't spawn agents automatically - user should click Setup button
  };

  const handleBaselineSetup = () => {
    // Set baseline parameters from the screenshot
    setHyacinthCount(5);
    setHyacinthReproduceRate(12);
    setFishCount(15);
    setFishReproduceRate(6);

    // Update river settings to baseline values
    const baselineRiver = updateRiver({
      flowDirection: 0.0,
      flowRate: 1,
      totalNutrients: 500,
      temperature: 30,
      sunlight: 0.8,
      pollutionLevel: 16,
    });
    setRiver(baselineRiver);

    // Note: Don't spawn agents automatically - user should click Setup button
  };

  const handleScenario2Setup = () => {
    // Set scenario 2 parameters from the screenshot
    setHyacinthCount(20);
    setHyacinthReproduceRate(12);
    setFishCount(0);
    setFishReproduceRate(6);

    // Update river settings to scenario 2 values
    const scenario2River = updateRiver({
      flowDirection: 0.0,
      flowRate: 1,
      totalNutrients: 500,
      temperature: 30,
      sunlight: 0.8,
      pollutionLevel: 100,
    });
    setRiver(scenario2River);

    // Note: Don't spawn agents automatically - user should click Setup button
  };

  const handleScenario3Setup = () => {
    // Set scenario 3 parameters from the screenshot
    setHyacinthCount(20);
    setHyacinthReproduceRate(12);
    setFishCount(15);
    setFishReproduceRate(6);

    // Update river settings to scenario 3 values
    const scenario3River = updateRiver({
      flowDirection: 0.0,
      flowRate: 1,
      totalNutrients: 10,
      temperature: 30,
      sunlight: 0.8,
      pollutionLevel: 33,
    });
    setRiver(scenario3River);

    // Note: Don't spawn agents automatically - user should click Setup button
  };

  const handleExportCSV = () => {
    // Get current simulation day
    const currentDay = getDayCount();
    
    // Create CSV data based on current simulation progress
    const csvData = [];
    csvData.push(['Weeks', 'Total Pollution', 'Dissolved Oxygen', 'Fish Count', 'Hyacinth Count']);
    
    // Generate data from week 0 to current week
    for (let week = 0; week <= currentDay; week++) {
      // Find the closest data point for this week, or use current values
      const populationPoint = populationData.find(p => Math.floor(p.day) === week);
      const oxygenPoint = oxygenData.find(o => Math.floor(o.day) === week);
      
      const fishCount = populationPoint ? populationPoint.fishCount : currentFishCount;
      const hyacinthCount = populationPoint ? populationPoint.hyacinthCount : currentHyacinthCount;
      const oxygenLevel = oxygenPoint ? oxygenPoint.oxygenLevel : currentRiver.currentDissolvedOxygen;
      
      csvData.push([
        week,
        currentRiver.pollutionLevel.toFixed(2),
        oxygenLevel.toFixed(2),
        fishCount,
        hyacinthCount
      ]);
    }
    
    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    
    // Create and download file with current day info in filename
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `simulation_data_week${currentDay}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleHyacinthReproduceRateChange = (newRate: number) => {
    setHyacinthReproduceRate(newRate);
    // Update all existing hyacinth reproduce rates
    // Convert percentage (1-100) to decimal (0-1) for internal use
    if (window.updateAllHyacinthReproduceRate)
      window.updateAllHyacinthReproduceRate(newRate / 100);
  };

  const handleFishReproduceRateChange = (newRate: number) => {
    setFishReproduceRate(newRate);
    // Update all existing fish reproduce rates
    // Convert percentage (1-100) to decimal (0-1) for internal use
    if (window.updateAllFishReproduceRate)
      window.updateAllFishReproduceRate(newRate / 100);
  };

  const handleTogglePlayPause = () => {
    togglePlayPause();
  };

  const handleReset = () => {
    resetSimulation(); // Resets simulation state (time, ticks, days, play/pause)
    
    // Reset agents (clears hyacinth and fish arrays via window.resetAgents)
    if (window.resetAgents) window.resetAgents();
    
    // Explicitly set desired river parameters after general reset
    // To ensure all other default values from resetRiver() are applied first:
    let riverStateAfterFullReset = resetRiver();
    riverStateAfterFullReset = updateRiver({
      ...riverStateAfterFullReset, // Start with all defaults from resetRiver
      pollutionLevel: 100, // Then override pollution
      totalNutrients: 500, // Then override nutrients
    });
    setRiver(riverStateAfterFullReset);
  };

  const handleSpeedChange = (value: number) => {
    setSpeedMultiplier(value);
  };

  return (
    <div
      style={{
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      padding: "8px",
      borderRadius: "5px",
      border: "1px solid #ccc",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        fontSize: "12px",
        maxWidth: "220px",
        minWidth: "200px",
      }}
    >
      <h4 style={{ margin: "0 0 8px 0", color: "black", fontSize: "14px" }}>
        Setup & Control
      </h4>

      {/* Magic Setup Button */}
      <button
        onClick={handleMagicSetup}
        style={{
          ...buttonStyle,
          backgroundColor: "#9C27B0", // Purple color for magic
          fontSize: "12px",
          padding: "8px 12px",
          marginBottom: "8px",
          width: "100%",
          fontWeight: "bold",
        }}
      >
        ✨ Optimal Settings
      </button>

      {/* Baseline Setup Button */}
      <button
        onClick={handleBaselineSetup}
        style={{
          ...buttonStyle,
          backgroundColor: "#2196F3", // Blue color for baseline
          fontSize: "12px",
          padding: "8px 12px",
          marginBottom: "8px",
          width: "100%",
          fontWeight: "bold",
        }}
      >
        🔄 Baseline Settings
      </button>

      {/* Scenario 2 Setup Button */}
      <button
        onClick={handleScenario2Setup}
        style={{
          ...buttonStyle,
          backgroundColor: "#FF9800", // Orange color for scenario 2
          fontSize: "12px",
          padding: "8px 12px",
          marginBottom: "8px",
          width: "100%",
          fontWeight: "bold",
        }}
      >
        🔄 Scenario 2 Settings
      </button>

      {/* Scenario 3 Setup Button */}
      <button
        onClick={handleScenario3Setup}
        style={{
          ...buttonStyle,
          backgroundColor: "#4CAF50", // Green color for scenario 3
          fontSize: "12px",
          padding: "8px 12px",
          marginBottom: "8px",
          width: "100%",
          fontWeight: "bold",
        }}
      >
        🔄 Scenario 3 Settings
      </button>

      {/* CSV Export Button */}
      <button
        onClick={handleExportCSV}
        style={{
          ...buttonStyle,
          backgroundColor: "#2196F3", // Blue color for export
          fontSize: "12px",
          padding: "8px 12px",
          marginBottom: "8px",
          width: "100%",
          fontWeight: "bold",
        }}
      >
        📊 Export CSV Data
      </button>
      
      {/* Simulation Controls */}
      <div style={{ marginBottom: "8px", display: "flex", gap: "6px" }}>
        <button 
          onClick={handleTogglePlayPause}
          style={{
            ...buttonStyle,
            backgroundColor:
              simulationState.isPlaying && !simulationState.isPaused
                ? "#FF9800"
                : "#4CAF50", // Orange when playing, Green when paused/stopped
            fontSize: "11px", 
            padding: "4px 8px",
            flex: 1,
          }}
        >
          {simulationState.isPlaying && !simulationState.isPaused
            ? "⏸️ Pause"
            : "▶️ Play"}
        </button>
        <button 
          onClick={handleReset} 
          style={{
            ...buttonStyle,
            backgroundColor: "#f44336",
            fontSize: "11px",
            padding: "4px 8px",
            flex: 1,
          }}
        >
          🔄 Reset
        </button>
        <button
          onClick={handleSetup}
          style={{
            ...buttonStyle,
            fontSize: "11px",
            padding: "4px 8px",
            flex: 1,
          }}
        >
          🔧 Setup
        </button>
      </div>

      {/* Speed Control Slider */}
      <div
        style={{
          marginBottom: "8px",
          borderTop: "1px solid #ddd",
          paddingTop: "8px",
        }}
      >
        <div style={{ marginBottom: "6px" }}>
          <label style={{ color: "black", fontSize: "11px" }}>Speed: </label>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={speedMultiplier}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            style={{ width: "120px" }}
          />
          <span style={{ color: "black", fontSize: "10px" }}>
            {" "}
            {speedMultiplier}x
          </span>
        </div>
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
        <span style={{ color: "black", fontSize: "10px" }}>
          {" "}
          {hyacinthCount}
        </span>
      </div>
      <div style={{ marginBottom: "6px" }}>
        <label style={{ color: "black", fontSize: "11px" }}>
          Hyacinth Reproduce Rate:{" "}
        </label>
        <input 
          type="range" 
          min="1"
          max="100"
          step="1"
          value={hyacinthReproduceRate} 
          onChange={(e) =>
            handleHyacinthReproduceRateChange(parseInt(e.target.value))
          }
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}>
          {" "}
          {hyacinthReproduceRate}%
        </span>
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
        <label style={{ color: "black", fontSize: "11px" }}>
          Fish Reproduce Rate:{" "}
        </label>
        <input 
          type="range" 
          min="1"
          max="100"
          step="1"
          value={fishReproduceRate} 
          onChange={(e) =>
            handleFishReproduceRateChange(parseInt(e.target.value))
          }
          style={{ width: "80px" }}
        />
        <span style={{ color: "black", fontSize: "10px" }}>
          {" "}
          {fishReproduceRate}%
        </span>
      </div>
    </div>
  );
};

const AppContent = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [river, setRiver] = useState<River>(createRiver());
  const [fishCount, setFishCount] = useState(0);
  const [hyacinthCount, setHyacinthCount] = useState(0);
  const [populationData, setPopulationData] = useState<PopulationDataPoint[]>(
    [],
  );
  const [oxygenData, setOxygenData] = useState<OxygenDataPoint[]>([]);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const lastRecordedDay = useRef<number>(-1);
  
  // Handle nutrient consumption by hyacinths
  const handleNutrientConsumption = (consumedAmount: number) => {
    const currentRiver = getRiver(); // Get the current singleton state
    const updatedRiver = updateRiver({ 
      totalNutrients: Math.max(0, currentRiver.totalNutrients - consumedAmount),
    });
    setRiver(updatedRiver);
  };
  
  // Handle pollution consumption by hyacinths
  const handlePollutionConsumption = (consumedAmount: number) => {
    const currentRiver = getRiver(); // Get the current singleton state
    const updatedRiver = updateRiver({ 
      pollutionLevel: Math.max(0, currentRiver.pollutionLevel - consumedAmount),
    });
    setRiver(updatedRiver);
  };

  const handleCurrentDOChange = (newDO: number) => {
    const updatedRiver = updateRiver({ currentDissolvedOxygen: newDO });
    setRiver(updatedRiver);
  };

  // Handle count updates from AgentScene
  const handleCountsChange = (
    newFishCount: number,
    newHyacinthCount: number,
  ) => {
    setFishCount(newFishCount);
    setHyacinthCount(newHyacinthCount);

    // Record population data every day
    const currentDay = getDayCount();
    if (currentDay !== lastRecordedDay.current) {
      lastRecordedDay.current = currentDay;

      setPopulationData((prevData) => {
        const newDataPoint: PopulationDataPoint = {
          day: currentDay,
          fishCount: newFishCount,
          hyacinthCount: newHyacinthCount,
        };

        // Keep all data points for complete historical record
        return [...prevData, newDataPoint];
      });

      // Record oxygen data
      setOxygenData((prevData) => {
        const newOxygenPoint: OxygenDataPoint = {
          day: currentDay,
          oxygenLevel: river.currentDissolvedOxygen,
        };

        // Keep all oxygen data points
        return [...prevData, newOxygenPoint];
      });
    }
  };

  // Reset population data when simulation is reset
  useEffect(() => {
    const unsubscribe = addStateChangeListener(() => {
      const currentDay = getDayCount();
      if (currentDay === 0 && lastRecordedDay.current !== 0) {
        setPopulationData([]);
        setOxygenData([]);
        lastRecordedDay.current = -1;
      }
    });
    return unsubscribe;
  }, []);
  
  return (
    <div
      style={{
      display: "flex", 
      flexDirection: "column", 
      height: "100vh", 
      width: "100vw",
      boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Toggle button - always visible */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 1002,
        }}
      >
        <button
          onClick={() => setIsUIVisible(!isUIVisible)}
          style={{
            backgroundColor: isUIVisible ? "#FF5722" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={isUIVisible ? "Hide UI" : "Show UI"}
        >
          {isUIVisible ? "👁️" : "👁️‍🗨️"}
        </button>
      </div>

      {/* Horizontal top layout with all components - conditionally visible */}
      {isUIVisible && (
        <div
          style={{
        position: "absolute",
        top: "10px",
        left: "10px",
            right: "70px", // Leave space for toggle button
        display: "flex", 
            alignItems: "flex-start",
            gap: "10px",
        zIndex: 1000,
            pointerEvents: "none",
            flexWrap: "wrap",
          }}
        >
          {/* Setup and Control */}
          <div style={{ pointerEvents: "auto" }}>
            <SetupControls setRiver={setRiver} populationData={populationData} oxygenData={oxygenData} currentRiver={river} currentFishCount={fishCount} currentHyacinthCount={hyacinthCount} />
          </div>

          {/* River Controls */}
          <div style={{ pointerEvents: "auto" }}>
          <RiverControls river={river} setRiver={setRiver} />
        </div>

          {/* Status displays */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
            <NutrientsDisplay totalNutrients={river.totalNutrients} />
            <PollutionDisplay pollutionLevel={river.pollutionLevel} />
            <DayDisplay />
            <DissolvedOxygenDisplay currentDO={river.currentDissolvedOxygen} />
            <FishCountDisplay fishCount={fishCount} />
            <HyacinthCountDisplay hyacinthCount={hyacinthCount} />
      </div>

          {/* Graphs */}
          <div style={{ display: "flex", gap: "10px" }}>
            <OxygenGraph oxygenData={oxygenData} />
            <PopulationGraph populationData={populationData} />
          </div>
        </div>
      )}
      
      {/* Full screen simulation */}
      <div 
        ref={containerRef}
        style={{ 
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          position: "relative",
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
  return <AppContent />;
}

const buttonStyle = {
  padding: "8px 12px",
  backgroundColor: "#4CAF50",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "bold",
  boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
};
