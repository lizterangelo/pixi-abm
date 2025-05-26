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
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      color: "white",
      padding: "10px 20px",
      borderRadius: "5px",
      fontSize: "18px",
      fontWeight: "bold",
      zIndex: 1001,
      pointerEvents: "none"
    }}>
      Total Nutrients: {totalNutrients.toFixed(2)} kg
    </div>
  );
};

const RiverControls = ({ river, setRiver }: { river: River, setRiver: (river: River) => void }) => {
  const { handleFlowDirectionChange, handleFlowRateChange, handleNutrientsChange, handleTemperatureChange, handleSunlightChange } = createRiverControls(river, setRiver);

  return (
    <div style={{ 
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      padding: "10px",
      borderRadius: "5px",
      border: "1px solid #ccc",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      <h3 style={{ margin: "0 0 10px 0" }}>River Controls</h3>
      <div style={{ marginBottom: "10px" }}>
        <label>Flow Direction (radians): </label>
        <input 
          type="range" 
          min="0" 
          max="6.28" 
          step="0.1" 
          value={river.flowDirection} 
          onChange={(e) => handleFlowDirectionChange(parseFloat(e.target.value))}
        />
        <span> {river.flowDirection.toFixed(2)}</span>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label>Flow Rate: </label>
        <input 
          type="range" 
          min="0" 
          max="200" 
          step="10" 
          value={river.flowRate} 
          onChange={(e) => handleFlowRateChange(parseFloat(e.target.value))}
        />
        <span> {river.flowRate}</span>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label>Total Nutrients (kg): </label>
        <input 
          type="range" 
          min="0" 
          max="500" 
          step="5" 
          value={river.totalNutrients} 
          onChange={(e) => handleNutrientsChange(parseFloat(e.target.value))}
        />
        <span> {river.totalNutrients.toFixed(1)}</span>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label>Temperature (°C): </label>
        <input 
          type="range" 
          min="20" 
          max="40" 
          step="1" 
          value={river.temperature} 
          onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
        />
        <span> {river.temperature}°C</span>
      </div>
      <div>
        <label>Sunlight (0.0-1.0): </label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.1" 
          value={river.sunlight} 
          onChange={(e) => handleSunlightChange(parseFloat(e.target.value))}
        />
        <span> {river.sunlight.toFixed(1)}</span>
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
          <AgentScene river={river} onNutrientConsumption={handleNutrientConsumption} />
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
