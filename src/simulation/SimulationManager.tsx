import { useTick } from "@pixi/react";
import { useRef } from "react";
import {
  updateGlobalTime,
  isSimulationRunning,
  getSpeedMultiplier,
} from "./SimulationControl";

interface SimulationManagerProps {
  onNutrientUpdate: () => void;
  onHyacinthUpdate: (deltaTime: number) => void;
  onFishUpdate: (deltaTime: number) => void;
}

export const SimulationManager = ({
  onNutrientUpdate,
  onHyacinthUpdate,
  onFishUpdate,
}: SimulationManagerProps) => {
  const lastNutrientUpdateRef = useRef<number>(0);

  useTick((ticker) => {
    if (!isSimulationRunning()) return;

    const baseDeltaTime = ticker.deltaTime;
    const speedMultiplier = getSpeedMultiplier();
    const deltaTime = baseDeltaTime * speedMultiplier;

    // Update global simulation time
    updateGlobalTime(baseDeltaTime); // Pass base deltaTime since updateGlobalTime applies speed internally

    // Handle nutrient consumption every second (adjusted for speed)
    lastNutrientUpdateRef.current += deltaTime / 60; // Convert to seconds
    if (lastNutrientUpdateRef.current >= 1.0) {
      onNutrientUpdate();
      lastNutrientUpdateRef.current = 0;
    }

    // Update hyacinths and fish with base deltaTime (they handle speed internally now)
    onHyacinthUpdate(baseDeltaTime);
    onFishUpdate(baseDeltaTime);
  });

  return null; // This component doesn't render anything
};
