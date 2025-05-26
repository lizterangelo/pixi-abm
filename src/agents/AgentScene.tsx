import { useApplication } from "@pixi/react";
import { useEffect, useState, useRef } from "react";
import { Hyacinth, HyacinthSprite, HYACINTH_SIZE, INIT_BIOMASS, MAX_BIOMASS } from "./Hyacinth";
import { Fish, FishSprite } from "./Fish";
import { River } from "../environment/River";
import { useTick } from "@pixi/react";

// Calculate growth rate based on environmental factors
const calculateGrowthRate = (temperature: number, sunlight: number, nur: number): number => {
  // Temperature factor (optimal around 30°C)
  const tempFactor = temperature >= 25 && temperature <= 35 
    ? 1.0 - Math.abs(temperature - 30) / 10 // Peak at 30°C, decreases towards 25°C and 35°C
    : 0.1; // Very low growth outside optimal range
  
  // Sunlight factor (linear relationship)
  const sunlightFactor = sunlight;
  
  // Nutrient factor (higher NUR = better growth)
  const nutrientFactor = nur / 0.05; // Normalize to 0.05 max NUR
  
  // Combined growth rate (0.0 to 1.0 scale) with base growth rate
  return tempFactor * sunlightFactor * nutrientFactor * 0.1; // 0.1 is the base growth rate
};

export const AgentScene = ({ river, onNutrientConsumption, onPollutionConsumption }: { 
  river: River, 
  onNutrientConsumption: (consumedAmount: number) => void,
  onPollutionConsumption: (consumedAmount: number) => void 
}) => {
  const { app } = useApplication();
  const [hyacinths, setHyacinths] = useState<Hyacinth[]>([]);
  const [fish, setFish] = useState<Fish[]>([]);
  const [hyacinthIdCounter, setHyacinthIdCounter] = useState(0);
  const [fishIdCounter, setFishIdCounter] = useState(0);
  const lastNutrientUpdateRef = useRef<number>(0);

  // Handle nutrient consumption by hyacinths using useTick for accuracy
  useTick((ticker) => {
    // Accumulate time in seconds
    lastNutrientUpdateRef.current += ticker.deltaTime / 60; // deltaTime is in frames, convert to seconds (assuming 60 FPS)
    
    // Check if a full second has passed
    if (lastNutrientUpdateRef.current >= 1.0) {
      if (hyacinths.length > 0 && river.totalNutrients > 0) {
        // Calculate total NUR from all hyacinths
        const totalNUR = hyacinths.reduce((sum, hyacinth) => sum + hyacinth.nur, 0);
        
        // Use NUR as raw consumption rate per second (kg/second)
        const consumptionPerSecond = totalNUR;
        
        // console.log(`Total Nutrients: ${river.totalNutrients.toFixed(2)} kg | Consuming: ${consumptionPerSecond.toFixed(4)} kg/s | Hyacinths: ${hyacinths.length}`);
        
        // Consume nutrients every second
        if (consumptionPerSecond > 0) {
          onNutrientConsumption(consumptionPerSecond);
        }
      }
      
      // Handle pollution consumption (hyacinths absorb pollution even if there's little left)
      if (hyacinths.length > 0 && river.pollutionLevel > 0) {
        // Calculate total POL from all hyacinths
        const totalPOL = hyacinths.reduce((sum, hyacinth) => sum + hyacinth.pol, 0);
        
        // Use POL as percentage reduction per second
        const pollutionReductionPerSecond = totalPOL;
        
        // Consume pollution every second
        if (pollutionReductionPerSecond > 0) {
          onPollutionConsumption(pollutionReductionPerSecond);
        }
      }
      
      // Reset the timer
      lastNutrientUpdateRef.current = 0;
    }
  });

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
    // We can use a smaller distance factor since there's transparent space around the actual plant
    // 0.7 means we allow about 30% overlap between the images (mostly transparent areas)
    const overlapFactor = 0.7; 
    const minDistance = size > 0 ? size * overlapFactor : 20; // Fallback if size not initialized yet
    
    // Try to find a position that doesn't overlap too much (max 50 attempts)
    let x, y;
    let attempts = 0;
    let foundValidPosition = false;
    
    while (!foundValidPosition && attempts < 50) {
      x = Math.random() * app.screen.width;
      y = Math.random() * app.screen.height;
      
      // Keep hyacinths away from edges
      const edgePadding = size / 2 || 15; // Fallback if size not initialized yet
      x = Math.max(edgePadding, Math.min(app.screen.width - edgePadding, x));
      y = Math.max(edgePadding, Math.min(app.screen.height - edgePadding, y));
      
      if (!checkOverlap(x, y, minDistance)) {
        foundValidPosition = true;
      }
      
      attempts++;
    }
    
    // If we couldn't find a good position after max attempts, use the last attempted position
    // This ensures we can keep adding hyacinths even when the screen gets crowded
    if (!foundValidPosition && attempts >= 50) {
      foundValidPosition = true;
    }
    
    // Add the hyacinth
    if (foundValidPosition) {
      const nur = 0.01 + Math.random() * 0.04; // Generate NUR once
      const pol = 0.1 + Math.random() * 0.4; // Generate POL (0.1-0.5% per second)
      const growthRate = calculateGrowthRate(river.temperature, river.sunlight, nur); // Calculate growth rate
      
      setHyacinths([...hyacinths, { 
        id: hyacinthIdCounter, 
        x: x!, 
        y: y!,
        rotationSpeed: 0.1,
        resistance: Math.random() * 0.5 + 0.5, // Random resistance between 0.5 and 1.0
        biomass: INIT_BIOMASS, // Start with initial biomass
        nur: nur, // Use the generated NUR
        pol: pol, // Use the generated POL
        growthRate: growthRate, // Use the calculated growth rate
        parent: null, // Original hyacinths have no parent
        daughters: [], // Start with no daughters
        currentDaughters: 0, // No daughters produced yet
        futureDaughters: Math.floor(Math.random() * 4) + 1, // Random 1-4 future daughters
        biomassGained: 0 // Start with no biomass gained
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
      resistance: Math.random() * 0.5 + 0.5 // Random resistance between 0.5 and 1.0
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

  // Handle hyacinth biomass updates
  const handleHyacinthBiomassChange = (id: number, newBiomass: number) => {
    setHyacinths(currentHyacinths => 
      currentHyacinths.map(hyacinth => {
        if (hyacinth.id === id) {
          return { 
            ...hyacinth, 
            biomass: newBiomass
          };
        }
        return hyacinth;
      })
    );
  };

  // Handle hyacinth biomass gained updates
  const handleHyacinthBiomassGainedChange = (id: number, newBiomassGained: number) => {
    setHyacinths(currentHyacinths => 
      currentHyacinths.map(hyacinth => 
        hyacinth.id === id ? { ...hyacinth, biomassGained: newBiomassGained } : hyacinth
      )
    );
  };

  // Handle hyacinth reproduction
  const handleHyacinthReproduction = (parentId: number, x: number, y: number) => {
    const parent = hyacinths.find(h => h.id === parentId);
    if (!parent) return;

    // Create daughter hyacinth with unique ID
    const daughterId = hyacinthIdCounter;
    const nur = 0.01 + Math.random() * 0.04; // Generate NUR for daughter
    const pol = 0.1 + Math.random() * 0.4; // Generate POL (0.1-0.5% per second)
    const growthRate = calculateGrowthRate(river.temperature, river.sunlight, nur);
    
    const daughter: Hyacinth = {
      id: daughterId,
      x,
      y,
      rotationSpeed: 0.1,
      resistance: parent.resistance + (Math.random() - 0.5) * 0.1, // Slight variation from parent
      biomass: INIT_BIOMASS,
      nur: nur,
      pol: pol,
      growthRate: growthRate,
      parent: parentId, // Set parent ID
      daughters: [],
      currentDaughters: 0,
      futureDaughters: Math.floor(Math.random() * 4) + 1, // Random 1-4 future daughters
      biomassGained: 0
    };

    // Update parent and add daughter
    setHyacinths(currentHyacinths => 
      currentHyacinths.map(hyacinth => {
        if (hyacinth.id === parentId) {
          return {
            ...hyacinth,
            daughters: [...hyacinth.daughters, daughterId],
            currentDaughters: hyacinth.currentDaughters + 1,
            biomassGained: 0 // Reset biomass gained after reproduction
          };
        }
        return hyacinth;
      }).concat(daughter)
    );
    
    setHyacinthIdCounter(hyacinthIdCounter + 1);
  };

  // Handle fish position updates
  const handleFishPositionChange = (id: number, x: number, y: number) => {
    setFish(currentFish => 
      currentFish.map(fish => 
        fish.id === id ? { ...fish, x, y } : fish
      )
    );
  };

  // Handle fish touching hyacinth state changes
  const handleFishTouchingHyacinthChange = (id: number, touching: boolean) => {
    setFish(currentFish => 
      currentFish.map(fish => 
        fish.id === id ? { ...fish, touchingHyacinth: touching } : fish
      )
    );
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
      {hyacinths.map(hyacinth => (
        <HyacinthSprite 
          key={hyacinth.id} 
          hyacinth={hyacinth} 
          allHyacinths={hyacinths}
          river={river}
          onPositionChange={handleHyacinthPositionChange}
          onBiomassChange={handleHyacinthBiomassChange}
          onBiomassGainedChange={handleHyacinthBiomassGainedChange}
          onReproduction={handleHyacinthReproduction}
        />
      ))}
      {fish.map(fish => (
        <FishSprite 
          key={fish.id} 
          fish={fish} 
          allHyacinths={hyacinths}
          river={river}
          onPositionChange={handleFishPositionChange}
          onTouchingHyacinthChange={handleFishTouchingHyacinthChange}
        />
      ))}
    </>
  );
}; 