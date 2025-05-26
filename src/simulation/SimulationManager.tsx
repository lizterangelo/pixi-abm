import { useTick } from "@pixi/react";
import { useRef } from "react";
import { updateGlobalTime, isSimulationRunning } from "./SimulationControl";

interface SimulationManagerProps {
  onNutrientUpdate: () => void;
  onHyacinthUpdate: (deltaTime: number) => void;
  onFishUpdate: (deltaTime: number) => void;
}

export const SimulationManager = ({ onNutrientUpdate, onHyacinthUpdate, onFishUpdate }: SimulationManagerProps) => {
  const lastNutrientUpdateRef = useRef<number>(0);

  useTick((ticker) => {
    if (!isSimulationRunning()) return;

    const deltaTime = ticker.deltaTime;
    
    // Update global simulation time
    updateGlobalTime(deltaTime);
    
    // Handle nutrient consumption every second
    lastNutrientUpdateRef.current += deltaTime / 60; // Convert to seconds
    if (lastNutrientUpdateRef.current >= 1.0) {
      onNutrientUpdate();
      lastNutrientUpdateRef.current = 0;
    }
    
    // Update hyacinths and fish
    onHyacinthUpdate(deltaTime);
    onFishUpdate(deltaTime);
  });

  return null; // This component doesn't render anything
}; 