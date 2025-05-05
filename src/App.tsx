import { Application, extend } from "@pixi/react";
import { Container, Sprite } from "pixi.js";
import { AgentScene } from "./agents/AgentScene";
import { useEnvironment } from "./environment/EnvironmentContext";
import { createRiver } from "./environment/River";
import { EnvironmentProvider } from "./environment/EnvironmentContext";
import { useRef, useEffect } from "react";

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

  const handleFlowRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    setRiver({ ...river, flowRate: rate });
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
      <div>
        <label>Flow Rate: </label>
        <input 
          type="range" 
          min="0" 
          max="200" 
          step="10" 
          value={river.flowRate} 
          onChange={handleFlowRateChange}
        />
        <span> {river.flowRate}</span>
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
  
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      padding: "20px", 
      gap: "20px", 
      height: "100vh", 
      boxSizing: "border-box" 
    }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <AgentControls />
        <RiverControls />
      </div>
      
      <div 
        ref={containerRef}
        style={{ 
          flex: 1, 
          border: "2px solid #666", 
          borderRadius: "8px", 
          overflow: "hidden",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
          position: "relative",
          display: "flex"
        }}
      >
        <div style={{ position: "absolute", width: "100%", height: "100%" }}>
          <Application 
            background={"#1099bb"} 
            resizeTo={containerRef}
            autoDensity={true}
          >
            <AgentScene />
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
