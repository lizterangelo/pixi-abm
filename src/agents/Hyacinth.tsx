import { Assets, Sprite, Texture } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { useTick } from "@pixi/react";
import { useApplication } from "@pixi/react";
import { River } from "../environment/River";

// Biomass constants
export const INIT_BIOMASS = 0.5;
export const MAX_BIOMASS = 2.5;

export interface Hyacinth {
  id: number;
  x: number;
  y: number;
  rotationSpeed: number;
  resistance: number; // How much the hyacinth resists the river flow (0-1)
  biomass: number; // Current biomass of the hyacinth (starts at initial value, grows over time)
  nur: number; // Nutrient Uptake Rate in kg/day (0.01-0.05)
  growthRate: number; // Current growth rate (calculated from environmental factors)
  parent: number | null; // ID of parent hyacinth (null if original)
  daughters: number[]; // Array of daughter hyacinth IDs
  currentDaughters: number; // Current number of daughters produced
  futureDaughters: number; // Maximum daughters this hyacinth will produce (1-4)
  biomassGained: number; // Biomass gained since last reproduction
}

interface HyacinthSpriteProps {
  hyacinth: Hyacinth;
  allHyacinths: Hyacinth[];
  river: River;
  onPositionChange: (id: number, x: number, y: number) => void;
  onBiomassChange: (id: number, newBiomass: number) => void;
  onBiomassGainedChange: (id: number, newBiomassGained: number) => void;
  onReproduction: (parentId: number, x: number, y: number) => void;
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
  const radius = Math.max(spriteSize.width, spriteSize.height) * 1.2; // Distance from parent
  const minDistance = Math.max(spriteSize.width, spriteSize.height) * 0.9; // Minimum distance from other hyacinths
  
  // Try 8 positions around the parent (cardinal and diagonal directions)
  const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
  
  for (const angle of angles) {
    const x = parent.x + Math.cos(angle) * radius;
    const y = parent.y + Math.sin(angle) * radius;
    
    // Check screen boundaries
    const halfWidth = spriteSize.width / 2;
    const halfHeight = spriteSize.height / 2;
    if (x < halfWidth || x > window.innerWidth - halfWidth || 
        y < halfHeight || y > window.innerHeight - halfHeight) {
      continue; // Skip positions outside screen
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
    if (!spriteRef.current || !app) return;
    
    // Handle biomass growth every second
    lastGrowthUpdateRef.current += ticker.deltaTime / 60; // Convert to seconds
    
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
    const riverFlowX = Math.cos(river.flowDirection) * river.flowRate * ticker.deltaTime;
    const riverFlowY = Math.sin(river.flowDirection) * river.flowRate * ticker.deltaTime;
    
    // Calculate new position with river flow
    let newX = hyacinth.x + riverFlowX * (1 - hyacinth.resistance);
    let newY = hyacinth.y + riverFlowY * (1 - hyacinth.resistance);
    
    // Handle parent-daughter connections
    if (hyacinth.parent !== null) {
      // Find parent hyacinth
      const parent = allHyacinths.find(h => h.id === hyacinth.parent);
      if (parent) {
        // Calculate desired connection distance
        const connectionDistance = Math.max(spriteSize.width, spriteSize.height) * 1.1;
        
        const dx = newX - parent.x;
        const dy = newY - parent.y;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        
        // If too far from parent, pull towards parent
        if (currentDistance > connectionDistance) {
          const pullStrength = 0.8; // How strongly daughters are pulled to parent
          const unitX = dx / currentDistance;
          const unitY = dy / currentDistance;
          
          // Move towards parent to maintain connection
          newX = parent.x + unitX * connectionDistance;
          newY = parent.y + unitY * connectionDistance;
        }
      }
    }
    
    // Apply bounds checking to keep hyacinth within the screen
    const halfWidth = spriteSize.width / 2;
    const halfHeight = spriteSize.height / 2;
    
    // Clamp position to screen boundaries
    if (newX < halfWidth) {
      newX = halfWidth;
    } else if (newX > app.screen.width - halfWidth) {
      newX = app.screen.width - halfWidth;
    }
    
    if (newY < halfHeight) {
      newY = halfHeight;
    } else if (newY > app.screen.height - halfHeight) {
      newY = app.screen.height - halfHeight;
    }
    
    // Check for collisions with other hyacinths and resolve them
    let collisionCount = 0;
    const maxCollisionsPerFrame = 3; // Limit collision checks to prevent excessive pushing
    
    for (const otherHyacinth of allHyacinths) {
      if (otherHyacinth.id === hyacinth.id) continue; // Skip self
      if (collisionCount >= maxCollisionsPerFrame) break; // Limit collisions per frame
      
      // Calculate minimum distance based on both hyacinths' biomass
      const baseScale = 0.06; // Use the same scale as in size calculation
      const baseSize = texture.width * baseScale; // Base size from texture
      
      const thisRadius = (baseSize * hyacinth.biomass / 2) * 0.8; // Slightly smaller collision radius
      const otherRadius = (baseSize * otherHyacinth.biomass / 2) * 0.8; // Slightly smaller collision radius
      const minDistance = thisRadius + otherRadius;
      
      const dx = newX - otherHyacinth.x;
      const dy = newY - otherHyacinth.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance && distance > 0) {
        // Calculate overlap amount
        const overlap = minDistance - distance;
        
        // Calculate unit vector pointing away from other hyacinth
        const unitX = dx / distance;
        const unitY = dy / distance;
        
        // Apply gentler collision resolution with damping
        const pushForce = Math.min(overlap * 0.05, 1.0); // Much gentler push force
        const damping = 0.15; // Much stronger damping for softer movements
        
        // Move this hyacinth away with reduced force
        newX += unitX * pushForce * damping;
        newY += unitY * pushForce * damping;
        
        collisionCount++;
        
        // Apply bounds checking again after collision resolution
        if (newX < halfWidth) {
          newX = halfWidth;
        } else if (newX > app.screen.width - halfWidth) {
          newX = app.screen.width - halfWidth;
        }
        
        if (newY < halfHeight) {
          newY = halfHeight;
        } else if (newY > app.screen.height - halfHeight) {
          newY = app.screen.height - halfHeight;
        }
      }
    }
    
    // Update sprite position
    spriteRef.current.x = newX;
    spriteRef.current.y = newY;
    
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