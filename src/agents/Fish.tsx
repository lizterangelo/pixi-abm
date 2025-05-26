import { Assets, Sprite, Texture } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { useTick } from "@pixi/react";
import { useApplication } from "@pixi/react";
import { River } from "../environment/River";
import { Hyacinth } from "./Hyacinth";
import { isSimulationRunning, getSpeedMultiplier } from "../simulation/SimulationControl";

export interface Fish {
  id: string;
  reproduceRate: number;
  x: number;
  y: number;
  rotationSpeed: number;
  resistance: number; // How much the fish resists the river flow (0-1)
  vx?: number; // Velocity X
  vy?: number; // Velocity Y
  targetX?: number; // Target X position
  targetY?: number; // Target Y position
  movementTimer?: number; // Timer for movement changes
  touchingHyacinth?: boolean; // Whether the fish is currently touching a hyacinth
}

interface FishSpriteProps {
  fish: Fish;
  allHyacinths: Hyacinth[];
  river: River;
  onPositionChange: (id: string, x: number, y: number) => void;
  onTouchingHyacinthChange: (id: string, touching: boolean) => void;
  onReproduction: (parentId: string, x: number, y: number) => void;
  onDeath: (id: string) => void;
}

export const FishSprite = ({ fish, allHyacinths, river, onPositionChange, onTouchingHyacinthChange, onReproduction, onDeath }: FishSpriteProps) => {
  const spriteRef = useRef<Sprite>(null);
  const [texture, setTexture] = useState(Texture.EMPTY);
  const [spriteSize, setSpriteSize] = useState({ width: 0, height: 0 });
  const [fishState, setFishState] = useState<Fish>({...fish, vx: 0, vy: 0, movementTimer: 0});
  const { app } = useApplication();
  const floatingTimeRef = useRef<number>(0); // For floating animation
  const lastReproductionCheckRef = useRef<number>(0); // For reproduction timing
  const lastDeathCheckRef = useRef<number>(0); // For death rate timing

  // Sync local state with props when fish position changes from parent
  useEffect(() => {
    setFishState(prevState => ({
      ...prevState,
      x: fish.x,
      y: fish.y,
      id: fish.id,
      resistance: fish.resistance,
      reproduceRate: fish.reproduceRate,
      touchingHyacinth: fish.touchingHyacinth
    }));
  }, [fish.x, fish.y, fish.id, fish.resistance, fish.reproduceRate, fish.touchingHyacinth]);

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

  // Get a new random target within the screen bounds
  const getNewTarget = () => {
    if (!app) return { x: fishState.x, y: fishState.y };
    
    return {
      x: Math.random() * app.screen.width,
      y: Math.random() * app.screen.height
    };
  };

  // Listen for animate update
  useTick((ticker) => {
    if (!spriteRef.current || !app || !isSimulationRunning()) return;
    
    const baseDeltaTime = ticker.deltaTime;
    const speedMultiplier = getSpeedMultiplier();
    const deltaTime = baseDeltaTime * speedMultiplier;
    
    // Update floating animation time
    floatingTimeRef.current += deltaTime * 0.03; // Slightly faster floating for fish
    
    // Handle death check every second based on dissolved oxygen
    lastDeathCheckRef.current += deltaTime / 60; // Convert to seconds
    
    if (lastDeathCheckRef.current >= 1.0) {
      // Calculate death rate based on dissolved oxygen levels using a more realistic curve
      // Fish can survive well at higher DO levels, but mortality increases exponentially as DO drops
      const dissolvedOxygen = river.currentDissolvedOxygen;
      let deathRate = 0; // 0-1 scale (0% to 100%)
      
      if (dissolvedOxygen <= 0) {
        deathRate = 1.0; // 100% death rate - no oxygen = immediate death
      } else if (dissolvedOxygen >= 6.0) {
        deathRate = 0.0; // 0% death rate - optimal oxygen levels
      } else if (dissolvedOxygen >= 4.0) {
        // 4.0-6.0 mg/L: Very low death rate (0-2%)
        // Fish can survive well but with slight stress
        deathRate = 0.02 * (1 - (dissolvedOxygen - 4.0) / 2.0);
      } else if (dissolvedOxygen >= 2.0) {
        // 2.0-4.0 mg/L: Moderate death rate (2-15%)
        // Fish start experiencing significant stress
        const normalizedDO = (dissolvedOxygen - 2.0) / 2.0; // 0-1 scale
        deathRate = 0.15 * (1 - normalizedDO * normalizedDO) + 0.02; // Quadratic increase
      } else if (dissolvedOxygen >= 1.0) {
        // 1.0-2.0 mg/L: High death rate (15-50%)
        // Critical oxygen levels - exponential mortality increase
        const normalizedDO = (dissolvedOxygen - 1.0) / 1.0; // 0-1 scale
        deathRate = 0.5 * (1 - normalizedDO * normalizedDO * normalizedDO) + 0.15; // Cubic curve
      } else {
        // 0.0-1.0 mg/L: Very high death rate (50-100%)
        // Lethal oxygen levels - rapid exponential mortality
        const normalizedDO = dissolvedOxygen / 1.0; // 0-1 scale
        deathRate = 1.0 - 0.5 * normalizedDO * normalizedDO; // Quadratic approach to 100%
      }
      
      // Check for death based on deathRate
      const randomValue = Math.floor(Math.random() * 100) + 1; // 1 to 100
      
      if (randomValue <= deathRate * 100) { // Convert 0-1 to 1-100 for comparison
        // Fish dies! Remove from simulation
        console.log(`Fish ${fish.id} died! (DO: ${dissolvedOxygen.toFixed(2)} mg/L, Death Rate: ${(deathRate * 100).toFixed(1)}%, Roll: ${randomValue})`);
        onDeath(fish.id);
        return; // Exit early since fish is dead
      }
      
      lastDeathCheckRef.current = 0;
    }
    
    // Handle reproduction check every second
    lastReproductionCheckRef.current += deltaTime / 60; // Convert to seconds
    
    if (lastReproductionCheckRef.current >= 1.0) {
      // Check for reproduction based on reproduceRate (0-1 = 0%-100% chance per second)
      const reproductionChance = fish.reproduceRate; // Already in 0-1 scale
      const randomValue = Math.floor(Math.random() * 100) + 1; // 1 to 100
      
      if (randomValue <= reproductionChance * 100) { // Convert 0-1 to 1-100 for comparison
        // Reproduce! Spawn new fish at parent's location
        console.log(`Fish ${fish.id} reproducing! (Rate: ${(fish.reproduceRate * 100).toFixed(0)}%, Roll: ${randomValue})`);
        onReproduction(fish.id, fishState.x, fishState.y);
      }
      
      lastReproductionCheckRef.current = 0;
    }
    
    // Update movement timer and potentially change direction
    let updatedFish = { ...fishState };
    updatedFish.movementTimer = (fishState.movementTimer || 0) - deltaTime;

    // Choose a new target when the timer expires or we're close to the current target
    if ((updatedFish.movementTimer || 0) <= 0 || 
        (!updatedFish.targetX && !updatedFish.targetY)) {
      const { x, y } = getNewTarget();
      updatedFish.targetX = x;
      updatedFish.targetY = y;
      updatedFish.movementTimer = Math.random() * 300 + 200; // Random time between 200-500 frames
    }
    
    // Calculate direction vector to target using current fish state position
    const currentX = fishState.x;
    const currentY = fishState.y;
    const dx = (updatedFish.targetX || currentX) - currentX;
    const dy = (updatedFish.targetY || currentY) - currentY;
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
      
      // Update velocity gradually (acceleration) - speed affects this directly
      updatedFish.vx = (updatedFish.vx || 0) + normDx * speed * deltaTime * 0.1;
      updatedFish.vy = (updatedFish.vy || 0) + normDy * speed * deltaTime * 0.1;
      
      // Apply max speed limit
      const currentSpeed = Math.sqrt((updatedFish.vx || 0) ** 2 + (updatedFish.vy || 0) ** 2);
      if (currentSpeed > maxSpeed) {
        updatedFish.vx = (updatedFish.vx || 0) * (maxSpeed / currentSpeed);
        updatedFish.vy = (updatedFish.vy || 0) * (maxSpeed / currentSpeed);
      }
    }
    
    // Calculate river flow effect - speed affects this directly
    const riverFlowX = Math.cos(river.flowDirection) * river.flowRate * deltaTime * 0.05;
    const riverFlowY = Math.sin(river.flowDirection) * river.flowRate * deltaTime * 0.05;
    
    // Calculate new position with fish movement and river flow - speed affects movement
    let newX = currentX + (updatedFish.vx || 0) * deltaTime + riverFlowX * (1 - fish.resistance);
    let newY = currentY + (updatedFish.vy || 0) * deltaTime + riverFlowY * (1 - fish.resistance);
    
    // Apply smooth edge wrapping for continuous flow
    const halfWidth = spriteSize.width / 2;
    const halfHeight = spriteSize.height / 2;
    
    // Smooth horizontal wrapping using modulo
    if (newX > app.screen.width) {
      newX = newX - app.screen.width;
    } else if (newX < 0) {
      newX = newX + app.screen.width;
    }
    
    // Smooth vertical wrapping using modulo
    if (newY > app.screen.height) {
      newY = newY - app.screen.height;
    } else if (newY < 0) {
      newY = newY + app.screen.height;
    }
    
    // Update targets if they're outside the wrapped bounds
    if (updatedFish.targetX !== undefined) {
      if (updatedFish.targetX > app.screen.width) {
        updatedFish.targetX = updatedFish.targetX - app.screen.width;
      } else if (updatedFish.targetX < 0) {
        updatedFish.targetX = updatedFish.targetX + app.screen.width;
      }
    }
    
    if (updatedFish.targetY !== undefined) {
      if (updatedFish.targetY > app.screen.height) {
        updatedFish.targetY = updatedFish.targetY - app.screen.height;
      } else if (updatedFish.targetY < 0) {
        updatedFish.targetY = updatedFish.targetY + app.screen.height;
      }
    }
    
    // Update the fish state with new position
    updatedFish.x = newX;
    updatedFish.y = newY;
    
    // Calculate total velocity including river flow for rotation
    const totalVx = (updatedFish.vx || 0) + riverFlowX * (1 - fish.resistance);
    const totalVy = (updatedFish.vy || 0) + riverFlowY * (1 - fish.resistance);
    
    // Rotate the fish to face its direction of movement
    if (Math.abs(totalVx) > 0.1 || Math.abs(totalVy) > 0.1) {
      const angle = Math.atan2(totalVy, totalVx);
      spriteRef.current.rotation = angle + Math.PI; // Add 180 degrees (π radians)
    }
    
    // Update sprite position
    spriteRef.current.x = newX;
    spriteRef.current.y = newY;
    
    // Add floating effect - gentle bobbing motion
    const floatingOffset = Math.sin(floatingTimeRef.current + fish.id.length * 0.7) * 1.5; // Use ID length for phase offset
    spriteRef.current.y += floatingOffset;
    
    // Check collision with hyacinths
    let touchingHyacinth = false;
    const fishRadius = Math.max(spriteSize.width, spriteSize.height) / 2;
    
    for (const hyacinth of allHyacinths) {
      const dx = newX - hyacinth.x;
      const dy = newY - hyacinth.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate hyacinth radius based on biomass (similar to collision logic in Hyacinth.tsx)
      const baseScale = 0.06;
      const baseHyacinthSize = 100; // Approximate base texture size for hyacinth
      const hyacinthRadius = (baseHyacinthSize * baseScale * hyacinth.biomass / 2) * 0.9;
      
      if (distance < fishRadius + hyacinthRadius) {
        touchingHyacinth = true;
        break;
      }
    }
    
    // Update opacity based on collision state
    if (touchingHyacinth !== fish.touchingHyacinth) {
      onTouchingHyacinthChange(fish.id, touchingHyacinth);
    }
    
    // Set sprite opacity
    spriteRef.current.alpha = touchingHyacinth ? 0.5 : 1.0;
    
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
      x={fishState.x}
      y={fishState.y}
      width={spriteSize.width}
      height={spriteSize.height}
    />
  );
}; 