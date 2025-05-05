import { Assets, Sprite, Texture } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { useTick } from "@pixi/react";
import { useEnvironment } from "../environment/EnvironmentContext";

export interface Hyacinth {
  id: number;
  x: number;
  y: number;
  rotationSpeed: number;
  resistance: number; // How much the hyacinth resists the river flow (0-1)
}

interface HyacinthSpriteProps {
  hyacinth: Hyacinth;
  onPositionChange: (id: number, x: number, y: number) => void;
}

export const HyacinthSprite = ({ hyacinth, onPositionChange }: HyacinthSpriteProps) => {
  const spriteRef = useRef<Sprite>(null);
  const [texture, setTexture] = useState(Texture.EMPTY);
  const { river } = useEnvironment();
  const [spriteSize, setSpriteSize] = useState({ width: 0, height: 0 });

  // Preload the sprite if it hasn't been loaded yet
  useEffect(() => {
    if (texture === Texture.EMPTY) {
      Assets.load("/assets/waterhyacinth.png").then((result: Texture) => {
        setTexture(result);
        // Store original dimensions
        setSpriteSize({
          width: result.width * 0.1, // Scaled down size
          height: result.height * 0.1, // Scaled down size
        });
      });
    }
  }, [texture]);

  // Listen for animate update
  useTick((ticker) => {
    if (!spriteRef.current) return;
    
    // Calculate river flow effect
    const riverFlowX = Math.cos(river.flowDirection) * river.flowRate * ticker.deltaTime;
    const riverFlowY = Math.sin(river.flowDirection) * river.flowRate * ticker.deltaTime;
    
    // Hyacinth doesn't rotate
    
    // Calculate new position with river flow
    const newX = hyacinth.x + riverFlowX * (1 - hyacinth.resistance);
    const newY = hyacinth.y + riverFlowY * (1 - hyacinth.resistance);
    
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