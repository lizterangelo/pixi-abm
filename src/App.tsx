import { Application, extend } from "@pixi/react";
import { Container, Sprite } from "pixi.js";
import { AgentScene } from "./agents/AgentScene";
import { useEnvironment } from "./environment/EnvironmentContext";
import { createRiver } from "./environment/River";
import { EnvironmentProvider } from "./environment/EnvironmentContext";

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
      position: "absolute", 
      top: 10, 
      right: 10, 
      zIndex: 100,
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      padding: "10px",
      borderRadius: "5px"
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
  const handleAddBunny = () => {
    // @ts-ignore
    if (window.addBunny) window.addBunny();
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
      position: "absolute", 
      top: 10, 
      left: 10, 
      zIndex: 100,
      display: "flex",
      gap: 10
    }}>
      <button onClick={handleAddBunny} style={buttonStyle}>Add Bunny</button>
      <button onClick={handleAddFish} style={buttonStyle}>Add Fish</button>
      <button onClick={handleReset} style={buttonStyle}>Reset</button>
    </div>
  );
};

const AppContent = () => {
  return (
    <div style={{ position: "relative" }}>
      <AgentControls />
      <RiverControls />
      
      <Application background={"#1099bb"} resizeTo={window}>
        <AgentScene />
      </Application>
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
