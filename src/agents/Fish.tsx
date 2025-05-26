import { Assets, Sprite, Texture } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { useTick } from "@pixi/react";
import { useEnvironment } from "../environment/EnvironmentContext";
import { useApplication } from "@pixi/react";

export interface Fish {
  id: number;
  x: number;
  y: number;
  rotationSpeed: number;
  resistance: number; // How much the fish resists the river flow (0-1)
  vx?: number; // Velocity X
  vy?: number; // Velocity Y
  targetX?: number; // Target X position
  targetY?: number; // Target Y position
  movementTimer?: number; // Timer for movement changes
  health?: number; // Fish health (0-1)
  oxygenRequirement?: number; // mg/L, species-specific
}

interface FishSpriteProps {
  fish: Fish;
  onPositionChange: (id: number, x: number, y: number) => void;
  removeFish: () => void;
}

// Shelter Gaussian parameters
const OPTIMAL_MAT_DENSITY = 1.0; // kg/cell
const SHELTER_VARIANCE = 0.3; // controls width of benefit curve
const SHELTER_MAX = 1.0;

export const FishSprite = ({ fish, onPositionChange, removeFish }: FishSpriteProps) => {
  const spriteRef = useRef<Sprite>(null);
  const [texture, setTexture] = useState(Texture.EMPTY);
  const { river } = useEnvironment();
  const [spriteSize, setSpriteSize] = useState({ width: 0, height: 0 });
  const [fishState, setFishState] = useState<Fish>({
    ...fish,
    vx: 0,
    vy: 0,
    movementTimer: 0,
    health: fish.health ?? 1.0,
    oxygenRequirement: fish.oxygenRequirement ?? 4.0,
  });
  const { app } = useApplication();

  // Preload the sprite if it hasn't been loaded yet
  useEffect(() => {
    if (texture === Texture.EMPTY) {
      Assets.load("/assets/fish.png").then((result: Texture) => {
        setTexture(result);
        // Store dimensions with reduced size
        setSpriteSize({
          width: result.width * 0.05, // Scaled down size
          height: result.height * 0.05, // Scaled down size
        });
      });
    }
  }, [texture]);

  // Helper: get local mat density
  const getLocalMatDensity = (x: number, y: number) => {
    if (typeof window !== 'undefined' && window.getMatDensity) {
      return window.getMatDensity(x, y);
    }
    return 0;
  };

  // Helper: get local oxygen (reduced by mat density)
  const getLocalOxygen = (x: number, y: number) => {
    const matDensity = getLocalMatDensity(x, y);
    // Each kg of mat reduces DO by 1 mg/L (tunable)
    return Math.max(0, (river.dissolvedOxygen || 8.0) - matDensity * 1.0);
  };

  // Helper: calculate shelter value (Gaussian curve)
  const getShelterValue = (matDensity: number) => {
    return SHELTER_MAX * Math.exp(-((matDensity - OPTIMAL_MAT_DENSITY) ** 2) / (2 * SHELTER_VARIANCE));
  };

  // Helper: calculate utility score for movement
  const getUtility = (x: number, y: number) => {
    const localDO = getLocalOxygen(x, y);
    const matDensity = getLocalMatDensity(x, y);
    const shelter = getShelterValue(matDensity);
    // Weight oxygen and shelter equally (tunable)
    return localDO + shelter;
  };

  // Get a new random target within the screen bounds
  const getNewTarget = () => {
    if (!app) return { x: fish.x, y: fish.y };
    
    // Add some padding from the edges
    const padding = Math.max(spriteSize.width, spriteSize.height) / 2;
    
    return {
      x: Math.random() * (app.screen.width - padding * 2) + padding,
      y: Math.random() * (app.screen.height - padding * 2) + padding
    };
  };

  // Listen for animate update
  useTick((ticker) => {
    if (!spriteRef.current || !app) return;
    
    const deltaTime = ticker.deltaTime;
    
    let updatedFish = { ...fishState };
    updatedFish.movementTimer = (fishState.movementTimer || 0) - deltaTime;

    // --- FISH DEATH CONDITIONS ---
    const localDO = getLocalOxygen(fish.x, fish.y);
    const OR = fishState.oxygenRequirement ?? 4.0;
    const PL = river.pollutionLevel || 0.0;
    const TEMP = river.temperature || 30.0;
    // Health update: decrease if DO < OR or PL high, recover if good
    let health = fishState.health ?? 1.0;
    if (localDO < OR) health -= 0.01 * (OR - localDO) * deltaTime * 0.1;
    if (PL >= 2.5) health -= 0.01 * (PL - 2.5) * deltaTime * 0.1;
    if (localDO >= OR && PL < 2.5) health += 0.005 * deltaTime * 0.1;
    health = Math.max(0, Math.min(1, health));
    updatedFish.health = health;
    // Oxygen deprivation
    if (localDO < OR) {
      if (health <= 0.01) { removeFish && removeFish(); return; }
    }
    // Pollution toxicity
    if (PL >= 5.0) {
      removeFish && removeFish();
      return;
    }
    // Temperature stress
    if (TEMP < 25.0 || TEMP > 35.0) {
      removeFish && removeFish();
      return;
    }
    // Poor health
    if (health <= 0.01) {
      removeFish && removeFish();
      return;
    }
    // --- END FISH DEATH CONDITIONS ---

    // Utility-based movement decision (use local DO and shelter)
    const currentUtility = getUtility(fish.x, fish.y);
    const directions = [
      { dx: 0, dy: 0 },
      { dx: 30, dy: 0 },
      { dx: -30, dy: 0 },
      { dx: 0, dy: 30 },
      { dx: 0, dy: -30 },
      { dx: 21, dy: 21 },
      { dx: -21, dy: 21 },
      { dx: 21, dy: -21 },
      { dx: -21, dy: -21 },
    ];
    let best = { utility: currentUtility, x: fish.x, y: fish.y };
    for (const dir of directions) {
      const nx = Math.max(0, Math.min(app.screen.width, fish.x + dir.dx));
      const ny = Math.max(0, Math.min(app.screen.height, fish.y + dir.dy));
      const util = getUtility(nx, ny);
      if (util > best.utility) {
        best = { utility: util, x: nx, y: ny };
      }
    }
    if (best.utility > currentUtility + 0.1) {
      updatedFish.targetX = best.x;
      updatedFish.targetY = best.y;
    }
    
    // Calculate direction vector to target
    const dx = (updatedFish.targetX || fish.x) - fish.x;
    const dy = (updatedFish.targetY || fish.y) - fish.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If we're close to the target, slow down
    if (distance < 10) {
      updatedFish.vx = 0;
      updatedFish.vy = 0;
      
      // Pick a new target if we've arrived
      if (distance < 5) {
        const { x, y } = getNewTarget();
        updatedFish.targetX = x;
        updatedFish.targetY = y;
      }
    } else {
      // Gradually steer towards the target
      const speed = 0.5 + Math.random() * 0.5; // Random speed between 0.5-1
      const maxSpeed = 2;
      
      // Calculate desired velocity (normalized direction * speed)
      const normDx = dx / distance;
      const normDy = dy / distance;
      
      // Update velocity gradually (acceleration)
      updatedFish.vx = (updatedFish.vx || 0) + normDx * speed * deltaTime * 0.1;
      updatedFish.vy = (updatedFish.vy || 0) + normDy * speed * deltaTime * 0.1;
      
      // Apply max speed limit
      const currentSpeed = Math.sqrt((updatedFish.vx || 0) ** 2 + (updatedFish.vy || 0) ** 2);
      if (currentSpeed > maxSpeed) {
        updatedFish.vx = (updatedFish.vx || 0) * (maxSpeed / currentSpeed);
        updatedFish.vy = (updatedFish.vy || 0) * (maxSpeed / currentSpeed);
      }
    }
    
    // Calculate river flow effect
    const riverFlowX = Math.cos(river.flowDirection) * river.baseFlowRate * deltaTime * 0.05;
    const riverFlowY = Math.sin(river.flowDirection) * river.baseFlowRate * deltaTime * 0.05;
    
    // Calculate new position with fish movement and river flow
    let newX = fish.x + (updatedFish.vx || 0) + riverFlowX * (1 - fish.resistance);
    let newY = fish.y + (updatedFish.vy || 0) + riverFlowY * (1 - fish.resistance);
    
    // Apply bounds checking to keep fish within the screen
    const halfWidth = spriteSize.width / 2;
    const halfHeight = spriteSize.height / 2;
    
    // Bounce off the edges
    if (newX < halfWidth) {
      newX = halfWidth;
      updatedFish.vx = Math.abs(updatedFish.vx || 0) * 0.8; // Reverse direction with some damping
    } else if (newX > app.screen.width - halfWidth) {
      newX = app.screen.width - halfWidth;
      updatedFish.vx = -Math.abs(updatedFish.vx || 0) * 0.8; // Reverse direction with some damping
    }
    
    if (newY < halfHeight) {
      newY = halfHeight;
      updatedFish.vy = Math.abs(updatedFish.vy || 0) * 0.8; // Reverse direction with some damping
    } else if (newY > app.screen.height - halfHeight) {
      newY = app.screen.height - halfHeight;
      updatedFish.vy = -Math.abs(updatedFish.vy || 0) * 0.8; // Reverse direction with some damping
    }
    
    // Rotate the fish to face its direction of movement
    if (updatedFish.vx !== 0 || updatedFish.vy !== 0) {
      const angle = Math.atan2(updatedFish.vy || 0, updatedFish.vx || 0);
      // Add a small offset to make it visually match the fish sprite
      const rotationOffset = Math.PI / 2;
      spriteRef.current.rotation = angle + rotationOffset;
    }
    
    // Update sprite position
    spriteRef.current.x = newX;
    spriteRef.current.y = newY;
    
    // Update fish position in state
    onPositionChange(fish.id, newX, newY);
    
    // Update the local fish state
    setFishState(updatedFish);
  });

  return (
    <pixiSprite
      ref={spriteRef}
      texture={texture}
      anchor={0.5}
      x={fish.x}
      y={fish.y}
      width={spriteSize.width}
      height={spriteSize.height}
    />
  );
}; 