import { Assets, Sprite, Texture } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { useTick } from "@pixi/react";
import { useEnvironment } from "../environment/EnvironmentContext";

export interface Fish {
  id: number;
  x: number;
  y: number;
  rotationSpeed: number;
  resistance: number; // How much the fish resists the river flow (0-1)
}

interface FishSpriteProps {
  fish: Fish;
  onPositionChange: (id: number, x: number, y: number) => void;
}

export const FishSprite = ({ fish, onPositionChange }: FishSpriteProps) => {
  const spriteRef = useRef<Sprite>(null);
  const [texture, setTexture] = useState(Texture.EMPTY);
  const { river } = useEnvironment();

  // Preload the sprite if it hasn't been loaded yet
  useEffect(() => {
    if (texture === Texture.EMPTY) {
      Assets.load("/assets/fish.png").then((result: Texture) => {
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
    
    // Fish rotates at its own speed
    spriteRef.current.rotation += fish.rotationSpeed * ticker.deltaTime;
    
    // Calculate new position with river flow
    const newX = fish.x + riverFlowX * (1 - fish.resistance);
    const newY = fish.y + riverFlowY * (1 - fish.resistance);
    
    // Update sprite position
    spriteRef.current.x = newX;
    spriteRef.current.y = newY;
    
    // Update fish position in state
    onPositionChange(fish.id, newX, newY);
  });

  return (
    <pixiSprite
      ref={spriteRef}
      texture={texture}
      anchor={0.5}
      x={fish.x}
      y={fish.y}
    />
  );
}; 