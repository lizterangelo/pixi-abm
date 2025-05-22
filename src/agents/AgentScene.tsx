import { useApplication } from "@pixi/react";
import { useEffect, useState, useRef } from "react";
import { Hyacinth, HyacinthSprite, HYACINTH_SIZE } from "./Hyacinth";
import { Fish, FishSprite } from "./Fish";

// Grid parameters
const GRID_SIZE = 50; // pixels
const ENV_WIDTH = 1200;
const ENV_HEIGHT = 900;
const GRID_COLS = Math.ceil(ENV_WIDTH / GRID_SIZE);
const GRID_ROWS = Math.ceil(ENV_HEIGHT / GRID_SIZE);

// Utility to get grid cell index
function getCellIndex(x: number, y: number) {
  return {
    col: Math.floor(x / GRID_SIZE),
    row: Math.floor(y / GRID_SIZE)
  };
}

// Declare getMatDensity on Window
declare global {
  interface Window {
    getMatDensity: (x: number, y: number) => number;
  }
}

export const AgentScene = ({ onCountsChange }: { onCountsChange?: (counts: { hyacinths: number, fish: number }) => void }) => {
  const { app } = useApplication();
  const [hyacinths, setHyacinths] = useState<Hyacinth[]>([]);
  const [fish, setFish] = useState<Fish[]>([]);
  const [hyacinthIdCounter, setHyacinthIdCounter] = useState(0);
  const [fishIdCounter, setFishIdCounter] = useState(0);

  // Mat density grid (2D array)
  const matDensityGrid = useRef(Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0)));

  // Update mat density grid on each hyacinth update
  useEffect(() => {
    // Reset grid
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        matDensityGrid.current[r][c] = 0;
      }
    }
    // Sum biomass in each cell
    hyacinths.forEach(h => {
      const { col, row } = getCellIndex(h.x, h.y);
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        matDensityGrid.current[row][col] += h.size;
      }
    });
    // Expose a function to get local mat density
    window.getMatDensity = (x: number, y: number) => {
      const { col, row } = getCellIndex(x, y);
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        return matDensityGrid.current[row][col];
      }
      return 0;
    };
  }, [hyacinths]);

  // Report counts whenever hyacinths or fish change
  useEffect(() => {
    if (onCountsChange) {
      onCountsChange({ hyacinths: hyacinths.length, fish: fish.length });
    }
  }, [hyacinths, fish, onCountsChange]);

  // Add the first hyacinth in the center when the app loads
  useEffect(() => {
    if (!app) return;
    
    setHyacinths([{ 
      id: 0, 
      x: app.screen.width / 2, 
      y: app.screen.height / 2,
      rotationSpeed: 0.1,
      resistance: 0.5,
      size: 0.1,
      growthRate: 0.1,
      reproductiveRate: 0.5,
      age: 0,
      stuck: Math.random() < 0.35,
      stuckTime: null,
      nutrientUptakeRate: 0.01 + Math.random() * 0.04,
      pollutantAbsorption: 0.005 + Math.random() * 0.015,
      isDaughterPlant: false
    }]);
    setHyacinthIdCounter(1);
  }, [app]);

  // Check if a position overlaps with existing hyacinths
  const checkOverlap = (x: number, y: number, minDistance: number): boolean => {
    return hyacinths.some(hyacinth => {
      const dx = hyacinth.x - x;
      const dy = hyacinth.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < minDistance;
    });
  };

  // Function to add a hyacinth
  const addHyacinth = () => {
    if (!app) return;
    
    // Get the current size from the shared constant
    const size = Math.max(HYACINTH_SIZE.width, HYACINTH_SIZE.height);
    
    // Allow for some overlap considering transparency
    const overlapFactor = 0.7; 
    const minDistance = size > 0 ? size * overlapFactor : 20;
    
    // Try to find a position that doesn't overlap too much (max 50 attempts)
    let x, y;
    let attempts = 0;
    let foundValidPosition = false;
    
    while (!foundValidPosition && attempts < 50) {
      x = Math.random() * app.screen.width;
      y = Math.random() * app.screen.height;
      
      const edgePadding = size / 2 || 15;
      x = Math.max(edgePadding, Math.min(app.screen.width - edgePadding, x));
      y = Math.max(edgePadding, Math.min(app.screen.height - edgePadding, y));
      
      if (!checkOverlap(x, y, minDistance)) {
        foundValidPosition = true;
      }
      
      attempts++;
    }
    
    if (!foundValidPosition && attempts >= 50) {
      foundValidPosition = true;
    }
    
    if (foundValidPosition) {
      setHyacinths([...hyacinths, { 
        id: hyacinthIdCounter, 
        x: x!, 
        y: y!,
        rotationSpeed: 0.1,
        resistance: Math.random() * 0.5 + 0.5,
        size: 0.1,
        growthRate: 0.1,
        reproductiveRate: 0.5,
        age: 0,
        stuck: Math.random() < 0.8,
        stuckTime: null,
        nutrientUptakeRate: 0.01 + Math.random() * 0.04,
        pollutantAbsorption: 0.005 + Math.random() * 0.015,
        isDaughterPlant: false
      }]);
      setHyacinthIdCounter(hyacinthIdCounter + 1);
    }
  };

  // Handle hyacinth growth
  const handleHyacinthGrowth = (id: number, updates: Partial<Hyacinth>) => {
    setHyacinths(currentHyacinths =>
      currentHyacinths.map(hyacinth =>
        hyacinth.id === id ? { ...hyacinth, ...updates } : hyacinth
      )
    );
  };

  // Handle hyacinth reproduction
  const handleHyacinthReproduction = (parentId: number) => {
    const parent = hyacinths.find(h => h.id === parentId);
    if (!parent || !app) return;

    // Create a new hyacinth near the parent
    const angle = Math.random() * Math.PI * 2;
    const distance = HYACINTH_SIZE.width * 1.5;
    const x = parent.x + Math.cos(angle) * distance;
    const y = parent.y + Math.sin(angle) * distance;

    // Check if the new position is valid
    if (x < 0 || x > app.screen.width || y < 0 || y > app.screen.height) {
      return;
    }

    if (!checkOverlap(x, y, HYACINTH_SIZE.width)) {
      setHyacinths([...hyacinths, {
        id: hyacinthIdCounter,
        x,
        y,
        rotationSpeed: 0.1,
        resistance: Math.random() * 0.5 + 0.5,
        size: 0.05 + Math.random() * 0.15,
        growthRate: 0.1,
        reproductiveRate: 0.5,
        age: 0,
        stuck: Math.random() < 0.8,
        stuckTime: null,
        nutrientUptakeRate: 0.01 + Math.random() * 0.04,
        pollutantAbsorption: 0.005 + Math.random() * 0.015,
        isDaughterPlant: true,
        parentId: parentId,
        growthRateMultiplier: 1.2 + Math.random() * 0.3,
        connected: true
      }]);
      setHyacinthIdCounter(hyacinthIdCounter + 1);
    }
  };

  // Function to add a fish
  const addFish = () => {
    if (!app) return;
    
    const x = Math.random() * app.screen.width;
    const y = Math.random() * app.screen.height;
    
    setFish([...fish, { 
      id: fishIdCounter, 
      x, 
      y,
      rotationSpeed: 0.1,
      resistance: Math.random() * 0.5 + 0.5
    }]);
    setFishIdCounter(fishIdCounter + 1);
  };

  // Function to reset all agents
  const resetAgents = () => {
    setHyacinths([]);
    setFish([]);
  };

  // Handle hyacinth position updates
  const handleHyacinthPositionChange = (id: number, x: number, y: number) => {
    setHyacinths(currentHyacinths => 
      currentHyacinths.map(hyacinth => 
        hyacinth.id === id ? { ...hyacinth, x, y } : hyacinth
      )
    );
  };

  // Handle fish position updates
  const handleFishPositionChange = (id: number, x: number, y: number) => {
    setFish(currentFish => 
      currentFish.map(fish => 
        fish.id === id ? { ...fish, x, y } : fish
      )
    );
  };

  // Handle hyacinth death
  const handleHyacinthDeath = (id: number) => {
    setHyacinths(currentHyacinths => currentHyacinths.filter(h => h.id !== id));
  };

  // Handle fish death
  const handleFishDeath = (id: number) => {
    setFish(currentFish => currentFish.filter(f => f.id !== id));
  };

  // Make these functions available to the parent
  useEffect(() => {
    if (window) {
      // @ts-ignore
      window.addHyacinth = addHyacinth;
      // @ts-ignore
      window.addFish = addFish;
      // @ts-ignore
      window.resetAgents = resetAgents;
    }
  }, [app, hyacinths, fish, hyacinthIdCounter, fishIdCounter]);

  return (
    <>
      {fish.map(fish => (
        <FishSprite 
          key={fish.id} 
          fish={fish} 
          onPositionChange={handleFishPositionChange}
          removeFish={() => handleFishDeath(fish.id)}
        />
      ))}
      {hyacinths.map(hyacinth => (
        <HyacinthSprite 
          key={hyacinth.id} 
          hyacinth={hyacinth} 
          onPositionChange={handleHyacinthPositionChange}
          onGrowth={handleHyacinthGrowth}
          onReproduction={handleHyacinthReproduction}
          allHyacinths={hyacinths}
          onDeath={handleHyacinthDeath}
        />
      ))}
    </>
  );
}; 