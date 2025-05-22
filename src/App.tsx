import { Application, extend } from "@pixi/react";
import { Container, Sprite } from "pixi.js";
import { AgentScene } from "./agents/AgentScene";
import { useEnvironment } from "./environment/EnvironmentContext";
import { createRiver } from "./environment/River";
import { EnvironmentProvider } from "./environment/EnvironmentContext";
import { useRef, useEffect, useState } from "react";

// extend tells @pixi/react what Pixi.js components are available
extend({
  Container,
  Sprite,
});

const RiverControls = () => {
  const { river, setRiver } = useEnvironment();

  const handleFlowDirectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const direction = parseFloat(e.target.value);
    setRiver({ ...river, flowDirection: direction });
  };

  const handleBaseFlowRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    setRiver({ ...river, baseFlowRate: rate });
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const temp = parseFloat(e.target.value);
    setRiver({ ...river, temperature: temp });
  };

  const handleNutrientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nutrient = parseFloat(e.target.value);
    setRiver({ ...river, nutrientConcentration: nutrient });
  };

  const handleSunlightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const light = parseFloat(e.target.value);
    setRiver({ ...river, sunlight: light });
  };

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
          onChange={handleFlowDirectionChange}
        />
        <span> {river.flowDirection.toFixed(2)}</span>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label>Base Flow Rate (m/s): </label>
        <input 
          type="range" 
          min="0.1" 
          max="3.0" 
          step="0.1" 
          value={river.baseFlowRate} 
          onChange={handleBaseFlowRateChange}
        />
        <span> {river.baseFlowRate.toFixed(1)}</span>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label>Temperature (°C): </label>
        <input 
          type="range" 
          min="25" 
          max="35" 
          step="0.5" 
          value={river.temperature} 
          onChange={handleTemperatureChange}
        />
        <span> {river.temperature.toFixed(1)}</span>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label>Nutrient Concentration (mg/L): </label>
        <input 
          type="range" 
          min="0.5" 
          max="10.0" 
          step="0.1" 
          value={river.nutrientConcentration} 
          onChange={handleNutrientChange}
        />
        <span> {river.nutrientConcentration.toFixed(1)}</span>
      </div>
      <div>
        <label>Sunlight (0-1): </label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.1" 
          value={river.sunlight} 
          onChange={handleSunlightChange}
        />
        <span> {river.sunlight.toFixed(1)}</span>
      </div>
    </div>
  );
};

const AgentControls = () => {
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
  };

  return (
    <div style={{ 
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      padding: "10px",
      borderRadius: "5px",
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: 600,
      border: "1px solid #ccc",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      margin: "0 auto"
    }}>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleAddHyacinth} style={buttonStyle}>Add Water Hyacinth</button>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleAddFish} style={buttonStyle}>Add Fish</button>
        <button onClick={handleReset} style={buttonStyle}>Reset</button>
      </div>
    </div>
  );
};

const AppContent = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState({ hyacinths: 0, fish: 0 });
  
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      padding: "20px", 
      gap: "20px", 
      height: "100vh", 
      boxSizing: "border-box" 
    }}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 40 }}>
        <AgentControls />
        <RiverControls />
      </div>
      
      <div 
        ref={containerRef}
        style={{ 
          width: "1200px",
          height: "900px",
          border: "2px solid #666", 
          borderRadius: "8px", 
          overflow: "hidden",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
          position: "relative",
          display: "flex"
        }}
      >
        <div style={{
          position: "absolute",
          right: 20,
          bottom: 20,
          background: "rgba(255,255,255,0.85)",
          border: "1px solid #bbb",
          borderRadius: "6px",
          padding: "10px 18px",
          fontWeight: "bold",
          color: "#222",
          minWidth: 120,
          textAlign: "center",
          zIndex: 10,
          boxShadow: "0 2px 6px rgba(0,0,0,0.12)"
        }}>
          Hyacinths: {counts.hyacinths}<br />Fish: {counts.fish}
        </div>
        <div style={{ position: "absolute", width: "100%", height: "100%" }}>
          <Application 
            background={"#1099bb"} 
            resizeTo={containerRef}
            autoDensity={true}
          >
            <AgentScene onCountsChange={setCounts} />
          </Application>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <EnvironmentProvider>
      <AppContent />
    </EnvironmentProvider>
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
