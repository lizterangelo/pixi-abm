import { Application, extend } from "@pixi/react";
import { Container, Sprite } from "pixi.js";
import { AgentScene } from "./agents/AgentScene";
import { River, createRiver, createRiverControls, updateRiver, resetRiver, getRiver } from "./environment/River";
import { useRef, useEffect, useState } from "react";

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

const RiverControls = ({ river, setRiver }: { river: River, setRiver: (river: River) => void }) => {
  const { handleFlowDirectionChange, handleFlowRateChange, handleNutrientsChange, handleTemperatureChange, handleSunlightChange, handlePollutionChange } = createRiverControls(river, setRiver);

  return (
    <div style={{ 
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      padding: "10px",
      borderRadius: "5px",
      border: "1px solid #ccc",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      color: "black"
    }}>
      <h3 style={{ margin: "0 0 10px 0", color: "black" }}>River Controls</h3>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ color: "black" }}>Flow Direction (radians): </label>
        <input 
          type="range" 
          min="0" 
          max="6.28" 
          step="0.1" 
          value={river.flowDirection} 
          onChange={(e) => handleFlowDirectionChange(parseFloat(e.target.value))}
        />
        <span style={{ color: "black" }}> {river.flowDirection.toFixed(2)}</span>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ color: "black" }}>Flow Rate: </label>
        <input 
          type="range" 
          min="0" 
          max="200" 
          step="10" 
          value={river.flowRate} 
          onChange={(e) => handleFlowRateChange(parseFloat(e.target.value))}
        />
        <span style={{ color: "black" }}> {river.flowRate}</span>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ color: "black" }}>Total Nutrients (kg): </label>
        <input 
          type="range" 
          min="0" 
          max="500" 
          step="5" 
          value={river.totalNutrients} 
          onChange={(e) => handleNutrientsChange(parseFloat(e.target.value))}
        />
        <span style={{ color: "black" }}> {river.totalNutrients.toFixed(1)}</span>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ color: "black" }}>Temperature (°C): </label>
        <input 
          type="range" 
          min="12" 
          max="35" 
          step="1" 
          value={river.temperature} 
          onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
        />
        <span style={{ color: "black" }}> {river.temperature}°C</span>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ color: "black" }}>Sunlight (0.0-1.0): </label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.1" 
          value={river.sunlight} 
          onChange={(e) => handleSunlightChange(parseFloat(e.target.value))}
        />
        <span style={{ color: "black" }}> {river.sunlight.toFixed(1)}</span>
      </div>
      <div>
        <label style={{ color: "black" }}>Pollution Level (%): </label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          step="1" 
          value={river.pollutionLevel} 
          onChange={(e) => handlePollutionChange(parseFloat(e.target.value))}
        />
        <span style={{ color: "black" }}> {river.pollutionLevel.toFixed(1)}%</span>
      </div>
    </div>
  );
};

const AgentControls = ({ setRiver }: { setRiver: (river: River) => void }) => {
  const handleAddHyacinth = () => {
    // @ts-ignore
    if (window.addHyacinth) window.addHyacinth();
  };

  const handleAddFish = () => {
    // @ts-ignore
    if (window.addFish) window.addFish();
  };

  const handleReset = () => {
    // @ts-ignore
    if (window.resetAgents) window.resetAgents();
    
    // Reset the river to initial state
    const resetRiverState = resetRiver();
    setRiver(resetRiverState);
  };

  return (
    <div style={{ 
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      padding: "10px",
      borderRadius: "5px",
      display: "flex",
      gap: 10,
      border: "1px solid #ccc",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      <button onClick={handleAddHyacinth} style={buttonStyle}>Add Water Hyacinth</button>
      <button onClick={handleAddFish} style={buttonStyle}>Add Fish</button>
      <button onClick={handleReset} style={buttonStyle}>Reset</button>
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
      
      {/* Floating controls overlay */}
      <div style={{ 
        position: "absolute",
        top: "10px",
        left: "10px",
        right: "10px",
        display: "flex", 
        justifyContent: "space-between",
        zIndex: 1000,
        pointerEvents: "none"
      }}>
        <div style={{ pointerEvents: "auto" }}>
          <AgentControls setRiver={setRiver} />
        </div>
        <div style={{ pointerEvents: "auto" }}>
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
