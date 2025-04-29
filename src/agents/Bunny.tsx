import { Assets, Sprite, Texture } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { useTick } from "@pixi/react";
import { useEnvironment } from "../environment/EnvironmentContext";

export interface Bunny {
  id: number;
  x: number;
  y: number;
  rotationSpeed: number;
  resistance: number; // How much the bunny resists the river flow (0-1)
}

interface BunnySpriteProps {
  bunny: Bunny;
  onPositionChange: (id: number, x: number, y: number) => void;
}

export const BunnySprite = ({ bunny, onPositionChange }: BunnySpriteProps) => {
  const spriteRef = useRef<Sprite>(null);
  const [texture, setTexture] = useState(Texture.EMPTY);
  const { river } = useEnvironment();

  // Preload the sprite if it hasn't been loaded yet
  useEffect(() => {
    if (texture === Texture.EMPTY) {
      Assets.load("/assets/bunny.png").then((result: Texture) => {
        setTexture(result);
      });
    }
  }, [texture]);

  // Listen for animate update
  useTick((ticker) => {
    if (!spriteRef.current) return;
    
    // Calculate river flow effect
    const riverFlowX = Math.cos(river.flowDirection) * river.flowRate * ticker.deltaTime;
    const riverFlowY = Math.sin(river.flowDirection) * river.flowRate * ticker.deltaTime;
    
    // Bunny rotates at its own speed
    spriteRef.current.rotation += bunny.rotationSpeed * ticker.deltaTime;
    
    // Calculate new position with river flow
    const newX = bunny.x + riverFlowX * (1 - bunny.resistance);
    const newY = bunny.y + riverFlowY * (1 - bunny.resistance);
    
    // Update sprite position
    spriteRef.current.x = newX;
    spriteRef.current.y = newY;
    
    // Update bunny position in state
    onPositionChange(bunny.id, newX, newY);
  });

  return (
    <pixiSprite
      ref={spriteRef}
      texture={texture}
      anchor={0.5}
      x={bunny.x}
      y={bunny.y}
    />
  );
}; 