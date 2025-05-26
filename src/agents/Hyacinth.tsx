import { Assets, Sprite, Texture } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { useTick } from "@pixi/react";
import { useEnvironment } from "../environment/EnvironmentContext";
import { 
  calculateFlowReduction, 
  calculateGrowthModifier, 
  calculateReproductiveRateModifier 
} from "../environment/River";

// Constants for growth and behavior calculations
const MIN_TEMP = 15; // Minimum temperature for growth
const OPTIMAL_TEMP = 25; // Optimal temperature for growth
const HALF_SATURATION_CONSTANT = 0.5; // Half saturation constant for nutrient uptake
const MAT_DENSITY = 0.8; // Material density for flow resistance
const RESISTANCE_COEFFICIENT = 0.5; // Resistance coefficient for flow
const MAX_BIOMASS = 5.0; // kg
const MAX_AGE = 100; // days

export interface Hyacinth {
  id: number;
  x: number;
  y: number;
  rotationSpeed: number;
  resistance: number; // How much the hyacinth resists the river flow (0-1)
  size: number;      // Biomass in kg (0.1-5.0)
  growthRate: number; // Base growth rate
  reproductiveRate: number; // Reproductive Energy (0.0-1.0)
  age: number;       // Age in days
  stuck: boolean;    // Whether the hyacinth is currently stuck
  stuckTime: number | null; // Timestamp or duration for being stuck
  nutrientUptakeRate: number; // Nutrient Uptake Rate (0.01-0.05 kg/day)
  pollutantAbsorption: number; // Pollutant Absorption (0.005-0.02 kg/day)
  isDaughterPlant?: boolean; // Whether this is a daughter plant
  parentId?: number; // Reference to parent plant
  growthRateMultiplier?: number; // Growth Rate Multiplier for daughter plants (1.2-1.5)
  connected?: boolean; // Whether the daughter plant is connected to parent
}

interface HyacinthSpriteProps {
  hyacinth: Hyacinth;
  onPositionChange: (id: number, x: number, y: number) => void;
  onGrowth: (id: number, updates: Partial<Hyacinth>) => void;
  onReproduction: (id: number) => void;
  allHyacinths: Hyacinth[];
  onDeath: (id: number) => void;
}

// Create a global reference to the hyacinth size that can be used by other components
export const HYACINTH_SIZE = { width: 0, height: 0 };

// Set these to match your environment/container size in App.tsx
const ENV_WIDTH = 1200;
const ENV_HEIGHT = 900;

// Utility to get grid cell index (copied from AgentScene)
const GRID_SIZE = 50;
function getCellIndex(x: number, y: number) {
  return {
    col: Math.floor(x / GRID_SIZE),
    row: Math.floor(y / GRID_SIZE)
  };
}

export const HyacinthSprite = ({ 
  hyacinth, 
  onPositionChange,
  onGrowth,
  onReproduction,
  allHyacinths,
  onDeath
}: HyacinthSpriteProps) => {
  const spriteRef = useRef<Sprite>(null);
  const [texture, setTexture] = useState(Texture.EMPTY);
  const { river } = useEnvironment();
  const [spriteSize, setSpriteSize] = useState({ width: 0, height: 0 });
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // Preload the sprite if it hasn't been loaded yet
  useEffect(() => {
    if (texture === Texture.EMPTY) {
      Assets.load("/assets/waterhyacinth.png").then((result: Texture) => {
        setTexture(result);
        
        // Calculate and store dimensions
        const width = result.width * 0.3; // Scaled down size
        const height = result.height * 0.3; // Scaled down size
        
        setSpriteSize({
          width,
          height,
        });
        
        // Update the global reference for other components to use
        HYACINTH_SIZE.width = width;
        HYACINTH_SIZE.height = height;
      });
    }
  }, [texture]);

  // Calculate temperature factor
  const calculateTemperatureFactor = (temperature: number): number => {
    return Math.max(0, Math.min(1, (temperature - MIN_TEMP) / (OPTIMAL_TEMP - MIN_TEMP)));
  };

  // Calculate nutrient factor
  const calculateNutrientFactor = (nutrientConcentration: number): number => {
    return nutrientConcentration / (nutrientConcentration + HALF_SATURATION_CONSTANT);
  };

  // Calculate flow resistance factor
  const calculateFlowResistanceFactor = (resistance: number): number => {
    return 1 / (1 + MAT_DENSITY * resistance * RESISTANCE_COEFFICIENT);
  };

  // Listen for animate update
  useTick((ticker) => {
    if (!spriteRef.current) return;
    
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastUpdateTime) / 1000; // Convert to seconds
    setLastUpdateTime(currentTime);
    
    // Get environmental factors from river context
    const temperature = river.temperature || OPTIMAL_TEMP;
    const nutrientConcentration = river.nutrientConcentration || 1.0;
    const pollutionLevel = river.pollutionLevel || 0.0;
    
    // --- SPATIAL LIGHT COMPETITION ---
    // Sum biomass of hyacinths above (lower y, within 1 grid cell in x)
    let cumulativeBiomassAbove = 0;
    const myCell = getCellIndex(hyacinth.x, hyacinth.y);
    allHyacinths.forEach(h => {
      if (h.id !== hyacinth.id && Math.abs(h.x - hyacinth.x) < 50 && h.y < hyacinth.y) {
        cumulativeBiomassAbove += h.size;
      }
    });
    // Exponential decay of sunlight with cumulative biomass above
    const k = 0.7; // attenuation coefficient (tunable)
    const effectiveSunlight = (river.sunlight || 1) * Math.exp(-k * cumulativeBiomassAbove);
    // --- END SPATIAL LIGHT COMPETITION ---

    // Calculate growth factors (use effectiveSunlight)
    const temperatureFactor = calculateTemperatureFactor(temperature);
    const nutrientFactor = calculateNutrientFactor(nutrientConcentration);

    // Daughter plant connection logic
    let connected = hyacinth.connected;
    let parentPlant = undefined;
    if (hyacinth.isDaughterPlant && hyacinth.parentId !== undefined) {
      parentPlant = allHyacinths.find(h => h.id === hyacinth.parentId);
      if (parentPlant) {
        const dx = hyacinth.x - parentPlant.x;
        const dy = hyacinth.y - parentPlant.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 50) { // 0.5m = 50px
          connected = false;
        } else {
          connected = true;
        }
      } else {
        connected = false;
      }
    }

    // Crowding factor: if more than 3 hyacinths within 100px, apply crowding
    let crowdingFactor = 0;
    const crowdingNeighbors = allHyacinths.filter(h => h.id !== hyacinth.id && Math.sqrt((h.x - hyacinth.x) ** 2 + (h.y - hyacinth.y) ** 2) < 100);
    if (crowdingNeighbors.length > 3) crowdingFactor = 0.2;

    // --- MAT COHESION & CROWDING (SPATIAL) ---
    let localMatDensity = 0;
    if (typeof window !== 'undefined' && window.getMatDensity) {
      localMatDensity = window.getMatDensity(hyacinth.x, hyacinth.y);
    }
    // Mat cohesion: if density < 0.1, increase death probability
    let matCohesionDeathBonus = 1.0;
    if (localMatDensity < 0.1) matCohesionDeathBonus = 3.0; // 3x more likely to die if isolated
    // Crowding: if density > 2.0, increase crowding penalty and death probability
    let crowdingPenalty = 0;
    let crowdingDeathBonus = 1.0;
    if (localMatDensity > 2.0) {
      crowdingPenalty = 0.3;
      crowdingDeathBonus = 2.0;
    }
    // --- END MAT COHESION & CROWDING ---

    // Growth calculation (add crowdingPenalty)
    let newSize = hyacinth.size;
    if (hyacinth.isDaughterPlant && hyacinth.growthRateMultiplier) {
      if (connected && parentPlant) {
        const resourceSharingFactor = 0.8;
        const growth = parentPlant.growthRate * hyacinth.growthRateMultiplier * resourceSharingFactor * deltaTime;
        newSize = hyacinth.size * (1 + growth);
      } else {
        const growth = hyacinth.growthRate * hyacinth.growthRateMultiplier * nutrientFactor * temperatureFactor * (1 - crowdingFactor - crowdingPenalty) * deltaTime;
        newSize = hyacinth.size * (1 + growth);
      }
    } else {
      const growthRate = hyacinth.growthRate * nutrientFactor * temperatureFactor;
      const effectiveGrowthRate = growthRate * (1 - crowdingFactor - crowdingPenalty);
      newSize = hyacinth.size * (1 + effectiveGrowthRate * deltaTime);
    }
    if (newSize !== hyacinth.size || hyacinth.connected !== connected) {
      onGrowth(hyacinth.id, { size: newSize, connected });
    }
    
    // Check for reproduction based on biomass and reproductive energy
    if (!hyacinth.isDaughterPlant && hyacinth.size > 2.0 && hyacinth.reproductiveRate > 0.8) {
      onReproduction(hyacinth.id);
      // Reduce reproductive energy after reproduction
      onGrowth(hyacinth.id, { reproductiveRate: hyacinth.reproductiveRate - 0.7 });
    }
    
    // Calculate nutrient uptake and pollutant absorption
    const nutrientUptake = hyacinth.nutrientUptakeRate * hyacinth.size * nutrientFactor * deltaTime;
    const pollutantAbsorption = hyacinth.pollutantAbsorption * hyacinth.size * 
      (pollutionLevel / (pollutionLevel + HALF_SATURATION_CONSTANT)) * deltaTime;
    
    // Calculate flow resistance factor
    const flowResistanceFactor = calculateFlowResistanceFactor(hyacinth.resistance);
    
    // Calculate movement due to water flow
    const riverFlowX = Math.cos(river.flowDirection) * river.baseFlowRate * flowResistanceFactor * ticker.deltaTime;
    const riverFlowY = Math.sin(river.flowDirection) * river.baseFlowRate * flowResistanceFactor * ticker.deltaTime;
    
    // Calculate new position with river flow
    let newX = hyacinth.x + riverFlowX;
    let newY = hyacinth.y + riverFlowY;

    // --- Overlap resolution: gently push apart if overlapping ---
    const myRadius = (spriteSize.width * hyacinth.size) / 2;
    allHyacinths.forEach(other => {
      if (other.id !== hyacinth.id) {
        const otherRadius = (spriteSize.width * other.size) / 2;
        const dx = newX - other.x;
        const dy = newY - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = myRadius + otherRadius;
        if (dist < minDist && dist > 0.01) {
          // Calculate gentle push vector
          const push = (minDist - dist) * 0.5; // 0.5 = gentle
          const nx = dx / dist;
          const ny = dy / dist;
          newX += nx * push;
          newY += ny * push;
        }
      }
    });
    // ----------------------------------------------------------

    spriteRef.current.x = newX;
    spriteRef.current.y = newY;
    onPositionChange(hyacinth.id, newX, newY);

    // Increment age
    const newAge = hyacinth.age + (deltaTime / 86400) * 86400; // 1 day per 86400 seconds, but here just increment by deltaTime in days
    // Cap growth at MAX_BIOMASS
    let cappedSize = Math.min(newSize, MAX_BIOMASS);
    // Remove if exceeds max biomass or age
    if (cappedSize >= MAX_BIOMASS || newAge >= MAX_AGE) {
      onDeath(hyacinth.id);
      return;
    }

    // --- PLANT DEATH CONDITIONS ---
    // 1. Biomass below threshold
    if ((hyacinth.isDaughterPlant && hyacinth.size < 0.05) || (!hyacinth.isDaughterPlant && hyacinth.size < 0.05)) {
      onDeath(hyacinth.id);
      return;
    }
    // 2. Nutrient deficiency
    if (hyacinth.nutrientUptakeRate <= 0.01 && (river.nutrientConcentration || 0) < 0.5) {
      onDeath(hyacinth.id);
      return;
    }
    // 3. Pollution toxicity
    if ((river.pollutionLevel || 0) >= 5.0) {
      onDeath(hyacinth.id);
      return;
    }
    // 4. Insufficient sunlight
    if ((river.sunlight || 0) <= 0.0) {
      onDeath(hyacinth.id);
      return;
    }
    // 5. Physical dislodgement by flow
    if ((river.baseFlowRate || 0) >= 3.0) {
      onDeath(hyacinth.id);
      return;
    }
    // 6. Aging/senescence (low reproductive energy)
    if (hyacinth.reproductiveRate <= 0.0) {
      onDeath(hyacinth.id);
      return;
    }
    // --- END PLANT DEATH CONDITIONS ---

    // --- PROBABILISTIC DEATH RATE (with mat bonuses) ---
    const BASE_DEATH_RATE = 0.02; // 2% per day
    let stressMultiplier = 1.0;
    if (hyacinth.nutrientUptakeRate <= 0.01) stressMultiplier *= 2;
    if ((river.sunlight || 1) <= 0.2) stressMultiplier *= 2;
    if ((river.pollutionLevel || 0) >= 2.5) stressMultiplier *= 2;
    if ((river.baseFlowRate || 0) >= 1.5) stressMultiplier *= 2;
    stressMultiplier *= matCohesionDeathBonus * crowdingDeathBonus;
    const deathProb = (BASE_DEATH_RATE * stressMultiplier) * (deltaTime / 86400);
    if (Math.random() < deathProb) {
      onDeath(hyacinth.id);
      return;
    }
    // --- END PROBABILISTIC DEATH RATE ---

    // When calling onGrowth, use cappedSize and newAge
    if (cappedSize !== hyacinth.size || hyacinth.connected !== connected || newAge !== hyacinth.age) {
      onGrowth(hyacinth.id, { size: cappedSize, connected, age: newAge });
    }
  });

  return (
    <pixiSprite
      ref={spriteRef}
      texture={texture}
      anchor={0.5}
      x={hyacinth.x}
      y={hyacinth.y}
      width={spriteSize.width * hyacinth.size}
      height={spriteSize.height * hyacinth.size}
    />
  );
}; 