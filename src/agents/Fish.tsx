import { Assets, Sprite, Texture } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { useTick } from "@pixi/react";
import { useApplication } from "@pixi/react";
import { River } from "../environment/River";
import { Hyacinth } from "./Hyacinth";

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
  touchingHyacinth?: boolean; // Whether the fish is currently touching a hyacinth
}

interface FishSpriteProps {
  fish: Fish;
  allHyacinths: Hyacinth[];
  river: River;
  onPositionChange: (id: number, x: number, y: number) => void;
  onTouchingHyacinthChange: (id: number, touching: boolean) => void;
}

export const FishSprite = ({ fish, allHyacinths, river, onPositionChange, onTouchingHyacinthChange }: FishSpriteProps) => {
  const spriteRef = useRef<Sprite>(null);
  const [texture, setTexture] = useState(Texture.EMPTY);
  const [spriteSize, setSpriteSize] = useState({ width: 0, height: 0 });
  const [fishState, setFishState] = useState<Fish>({...fish, vx: 0, vy: 0, movementTimer: 0});
  const { app } = useApplication();
  const floatingTimeRef = useRef<number>(0); // For floating animation

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
    
    // Update floating animation time
    floatingTimeRef.current += deltaTime * 0.03; // Slightly faster floating for fish
    
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
    const riverFlowX = Math.cos(river.flowDirection) * river.flowRate * deltaTime * 0.05;
    const riverFlowY = Math.sin(river.flowDirection) * river.flowRate * deltaTime * 0.05;
    
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
    const floatingOffset = Math.sin(floatingTimeRef.current + fish.id * 0.7) * 1.5; // 1.5 pixel amplitude, different phase offset
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
      x={fish.x}
      y={fish.y}
      width={spriteSize.width}
      height={spriteSize.height}
    />
  );
}; 