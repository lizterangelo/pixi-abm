import { Assets, Sprite, Texture } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { useTick } from "@pixi/react";
import { useApplication } from "@pixi/react";
import { River } from "../environment/River";
import { isSimulationRunning, getSpeedMultiplier } from "../simulation/SimulationControl";

// Biomass constants
export const INIT_BIOMASS = 0.5;
export const MAX_BIOMASS = 2.5;

export interface Hyacinth {
  id: string;
  x: number;
  y: number;
  rotationSpeed: number;
  resistance: number; // How much the hyacinth resists the river flow (0-1)
  biomass: number; // Current biomass of the hyacinth (starts at initial value, grows over time)
  nur: number; // Nutrient Uptake Rate in kg/day (0.01-0.05)
  pol: number; // Pollution absorbed per second (0.1-0.5% per second)
  growthRate: number; // Current growth rate (calculated from environmental factors)
  parent: string | null; // ID of parent hyacinth (null if original)
  daughters: string[]; // Array of daughter hyacinth IDs
  currentDaughters: number; // Current number of daughters produced
  futureDaughters: number; // Maximum daughters this hyacinth will produce (1-4)
  biomassGained: number; // Biomass gained since last reproduction
}

interface HyacinthSpriteProps {
  hyacinth: Hyacinth;
  allHyacinths: Hyacinth[];
  river: River;
  onPositionChange: (id: string, x: number, y: number) => void;
  onBiomassChange: (id: string, newBiomass: number) => void;
  onBiomassGainedChange: (id: string, newBiomassGained: number) => void;
  onReproduction: (parentId: string, x: number, y: number) => void;
}

// Create a global reference to the hyacinth size that can be used by other components
export const HYACINTH_SIZE = { width: 0, height: 0 };

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
  
  // Combined growth rate with reduced base multiplier for slower growth
  return tempFactor * sunlightFactor * nutrientFactor * 0.1; // 0.01 base rate for much slower growth
};

// Find available space around a hyacinth for reproduction
const findReproductionSpace = (parent: Hyacinth, allHyacinths: Hyacinth[], spriteSize: { width: number, height: number }): { x: number, y: number } | null => {
  const radius = Math.max(spriteSize.width, spriteSize.height) * 2; // Distance from parent (reduced from 1.2 to 0.8)
  const minDistance = Math.max(spriteSize.width, spriteSize.height) * 0.7; // Minimum distance from other hyacinths (reduced from 0.9 to 0.7)
  
  // Try 8 positions around the parent (cardinal and diagonal directions)
  const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
  
  for (const angle of angles) {
    let x = parent.x + Math.cos(angle) * radius;
    let y = parent.y + Math.sin(angle) * radius;
    
    // Apply smooth wrapping to the reproduction position
    if (x > window.innerWidth) {
      x = x - window.innerWidth;
    } else if (x < 0) {
      x = x + window.innerWidth;
    }
    
    if (y > window.innerHeight) {
      y = y - window.innerHeight;
    } else if (y < 0) {
      y = y + window.innerHeight;
    }
    
    // Check if position is valid (not overlapping with other hyacinths)
    let validPosition = true;
    for (const other of allHyacinths) {
      if (other.id === parent.id) continue;
      
      const dx = x - other.x;
      const dy = y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        validPosition = false;
        break;
      }
    }
    
    if (validPosition) {
      return { x, y };
    }
  }
  
  return null; // No space found
};

export const HyacinthSprite = ({ hyacinth, allHyacinths, river, onPositionChange, onBiomassChange, onBiomassGainedChange, onReproduction }: HyacinthSpriteProps) => {
  const spriteRef = useRef<Sprite>(null);
  const [texture, setTexture] = useState(Texture.EMPTY);
  const [spriteSize, setSpriteSize] = useState({ width: 0, height: 0 });
  const { app } = useApplication();
  const lastGrowthUpdateRef = useRef<number>(0);
  const floatingTimeRef = useRef<number>(0); // For floating animation
  
  // Add velocity state for smooth movement
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const positionRef = useRef({ x: hyacinth.x, y: hyacinth.y });

  // Sync position when hyacinth prop changes
  useEffect(() => {
    positionRef.current.x = hyacinth.x;
    positionRef.current.y = hyacinth.y;
  }, [hyacinth.x, hyacinth.y]);

  // Preload the sprite and update size when biomass changes
  useEffect(() => {
    if (texture === Texture.EMPTY) {
      Assets.load("/assets/waterhyacinth.png").then((result: Texture) => {
        setTexture(result);
      });
    }
    
    // Update size whenever biomass changes (and texture is loaded)
    if (texture !== Texture.EMPTY) {
      // Calculate and store dimensions based on biomass
      // Base size is 0.1 of original texture, then scaled by biomass
      const baseScale = 0.06;
      const size = texture.width * baseScale * hyacinth.biomass; // width and height are always the same
      
      setSpriteSize({
        width: size,
        height: size,
      });
      
      // Update the global reference for other components to use (use average biomass or a standard size)
      // For global reference, we'll use a standard biomass of 1.0
      HYACINTH_SIZE.width = texture.width * baseScale * 0.1;
      HYACINTH_SIZE.height = texture.width * baseScale * 0.1;
    }
  }, [texture, hyacinth.biomass]);

  // Listen for animate update
  useTick((ticker) => {
    if (!spriteRef.current || !app || !isSimulationRunning()) return;
    
    const baseDeltaTime = ticker.deltaTime;
    const speedMultiplier = getSpeedMultiplier();
    const deltaTime = baseDeltaTime * speedMultiplier;
    
    // Update floating animation time
    floatingTimeRef.current += deltaTime * 0.02; // Slow floating speed
    
    // Handle biomass growth every second
    lastGrowthUpdateRef.current += deltaTime / 60; // Convert to seconds
    
    if (lastGrowthUpdateRef.current >= 1.0) {
      // Apply biomass growth using dynamically calculated growth rate
      if (hyacinth.biomass < MAX_BIOMASS && river.totalNutrients > 0) {
        // Calculate current growth rate based on current environmental factors
        const currentGrowthRate = calculateGrowthRate(river.temperature, river.sunlight, hyacinth.nur);
        
        const biomassIncrease = currentGrowthRate; // Use the dynamically calculated growth rate per second
        const newBiomass = Math.min(hyacinth.biomass + biomassIncrease, MAX_BIOMASS);
        const newBiomassGained = hyacinth.biomassGained + biomassIncrease;
        
        console.log(`Hyacinth ${hyacinth.id}: Biomass ${hyacinth.biomass.toFixed(3)} → ${newBiomass.toFixed(3)} (Growth Rate: ${currentGrowthRate.toFixed(4)}) (Biomass Gained: ${newBiomassGained.toFixed(3)})`);
        
        // Update hyacinth biomass
        onBiomassChange(hyacinth.id, newBiomass);
        onBiomassGainedChange(hyacinth.id, newBiomassGained);
        
        // Check for reproduction conditions
        const reproductionThreshold = 0.6 + Math.random() * 0.4; // Random between 0.6-1.0
        if (newBiomassGained >= reproductionThreshold && 
            hyacinth.currentDaughters < hyacinth.futureDaughters &&
            hyacinth.biomass < MAX_BIOMASS) { // Cannot reproduce if at max biomass
          
          // Check if there's space around the hyacinth for reproduction
          const reproductionPosition = findReproductionSpace(hyacinth, allHyacinths, spriteSize);
          if (reproductionPosition) {
            console.log(`Hyacinth ${hyacinth.id} reproducing at (${reproductionPosition.x.toFixed(1)}, ${reproductionPosition.y.toFixed(1)})`);
            onReproduction(hyacinth.id, reproductionPosition.x, reproductionPosition.y);
          }
        }
      }
      
      lastGrowthUpdateRef.current = 0;
    }
    
    // Calculate river flow effect
    const riverFlowX = Math.cos(river.flowDirection) * river.flowRate * deltaTime;
    const riverFlowY = Math.sin(river.flowDirection) * river.flowRate * deltaTime;
    
    // Start with current position
    let newX = positionRef.current.x;
    let newY = positionRef.current.y;
    
    // Apply river flow to velocity
    velocityRef.current.vx += riverFlowX * (1 - hyacinth.resistance) * 0.1;
    velocityRef.current.vy += riverFlowY * (1 - hyacinth.resistance) * 0.1;
    
    // Apply soft collision forces to velocity
    let totalForceX = 0;
    let totalForceY = 0;
    
    for (const otherHyacinth of allHyacinths) {
      if (otherHyacinth.id === hyacinth.id) continue; // Skip self
      
      // Calculate minimum distance based on both hyacinths' biomass
      const baseScale = 0.06;
      const baseSize = texture.width * baseScale;
      
      const thisRadius = (baseSize * hyacinth.biomass / 2) * 0.9;
      const otherRadius = (baseSize * otherHyacinth.biomass / 2) * 0.9;
      const comfortDistance = thisRadius + otherRadius + 10; // Add comfort zone
      
      const dx = newX - otherHyacinth.x;
      const dy = newY - otherHyacinth.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < comfortDistance && distance > 0) {
        // Calculate repulsion force (stronger when closer)
        const repulsionStrength = (comfortDistance - distance) / comfortDistance;
        const forceMultiplier = repulsionStrength * repulsionStrength * 0.3; // Quadratic falloff
        
        // Calculate unit vector pointing away from other hyacinth
        const unitX = dx / distance;
        const unitY = dy / distance;
        
        // Add repulsion force to total
        totalForceX += unitX * forceMultiplier;
        totalForceY += unitY * forceMultiplier;
      }
    }
    
    // Apply repulsion forces to velocity
    velocityRef.current.vx += totalForceX * deltaTime;
    velocityRef.current.vy += totalForceY * deltaTime;
    
    // Apply velocity damping for stability
    const damping = 0.85;
    velocityRef.current.vx *= damping;
    velocityRef.current.vy *= damping;
    
    // Limit maximum velocity to prevent excessive movement
    const maxVelocity = 3.0;
    const currentSpeed = Math.sqrt(velocityRef.current.vx ** 2 + velocityRef.current.vy ** 2);
    if (currentSpeed > maxVelocity) {
      velocityRef.current.vx = (velocityRef.current.vx / currentSpeed) * maxVelocity;
      velocityRef.current.vy = (velocityRef.current.vy / currentSpeed) * maxVelocity;
    }
    
    // Apply velocity to position
    newX += velocityRef.current.vx * deltaTime;
    newY += velocityRef.current.vy * deltaTime;
    
    // Handle parent-daughter connections with velocity-based forces
    if (hyacinth.parent !== null) {
      // Find parent hyacinth
      const parent = allHyacinths.find(h => h.id === hyacinth.parent);
      if (parent) {
        // Calculate desired connection distance
        const connectionDistance = Math.max(spriteSize.width, spriteSize.height) * 3;
        
        // Calculate wrapped distance (shortest path considering screen wrapping)
        let dx = newX - parent.x;
        let dy = newY - parent.y;
        
        // Handle horizontal wrapping - find shortest distance
        if (Math.abs(dx) > app.screen.width / 2) {
          if (dx > 0) {
            dx = dx - app.screen.width;
          } else {
            dx = dx + app.screen.width;
          }
        }
        
        // Handle vertical wrapping - find shortest distance
        if (Math.abs(dy) > app.screen.height / 2) {
          if (dy > 0) {
            dy = dy - app.screen.height;
          } else {
            dy = dy + app.screen.height;
          }
        }
        
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        
        // If too far from parent, apply pull force to velocity
        if (currentDistance > connectionDistance) {
          const pullStrength = 0.05; // Gentle pull force
          const unitX = dx / currentDistance;
          const unitY = dy / currentDistance;
          
          // Apply pull force to velocity instead of direct position change
          velocityRef.current.vx -= unitX * pullStrength * deltaTime;
          velocityRef.current.vy -= unitY * pullStrength * deltaTime;
        }
      }
    }
    
    // Apply smooth edge wrapping for continuous flow (for all hyacinths)
    if (newX > app.screen.width) {
      newX = newX - app.screen.width;
    } else if (newX < 0) {
      newX = newX + app.screen.width;
    }
    
    if (newY > app.screen.height) {
      newY = newY - app.screen.height;
    } else if (newY < 0) {
      newY = newY + app.screen.height;
    }
    
    // Update position references
    positionRef.current.x = newX;
    positionRef.current.y = newY;
    
    // Update sprite position
    spriteRef.current.x = newX;
    spriteRef.current.y = newY;
    
    // Add floating effect - gentle bobbing motion
    const floatingOffset = Math.sin(floatingTimeRef.current + hyacinth.id.length * 0.5) * 2; // Use ID length for phase offset
    spriteRef.current.y += floatingOffset;
    
    // Update hyacinth position in state
    onPositionChange(hyacinth.id, newX, newY);
  });

  return (
    <pixiSprite
      ref={spriteRef}
      texture={texture}
      anchor={0.5}
      x={hyacinth.x}
      y={hyacinth.y}
      width={spriteSize.width}
      height={spriteSize.height}
    />
  );
}; 