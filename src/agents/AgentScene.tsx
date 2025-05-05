import { useApplication } from "@pixi/react";
import { useEffect, useState, useRef } from "react";
import { Hyacinth, HyacinthSprite, HYACINTH_SIZE } from "./Hyacinth";
import { Fish, FishSprite } from "./Fish";

export const AgentScene = () => {
  const { app } = useApplication();
  const [hyacinths, setHyacinths] = useState<Hyacinth[]>([]);
  const [fish, setFish] = useState<Fish[]>([]);
  const [hyacinthIdCounter, setHyacinthIdCounter] = useState(0);
  const [fishIdCounter, setFishIdCounter] = useState(0);

  // Add the first hyacinth in the center when the app loads
  useEffect(() => {
    if (!app) return;
    
    setHyacinths([{ 
      id: 0, 
      x: app.screen.width / 2, 
      y: app.screen.height / 2,
      rotationSpeed: 0.1,
      resistance: 0.5 // Add resistance property
    }]);
    setHyacinthIdCounter(1);
  }, [app]);

  // Check if a position overlaps with existing hyacinths
  const checkOverlap = (x: number, y: number, minDistance: number): boolean => {
    return hyacinths.some(hyacinth => {
      const dx = hyacinth.x - x;
      const dy = hyacinth.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < minDistance;
    });
  };

  // Function to add a hyacinth
  const addHyacinth = () => {
    if (!app) return;
    
    // Get the current size from the shared constant
    const size = Math.max(HYACINTH_SIZE.width, HYACINTH_SIZE.height);
    
    // Allow for some overlap considering transparency
    // We can use a smaller distance factor since there's transparent space around the actual plant
    // 0.7 means we allow about 30% overlap between the images (mostly transparent areas)
    const overlapFactor = 0.7; 
    const minDistance = size > 0 ? size * overlapFactor : 20; // Fallback if size not initialized yet
    
    // Try to find a position that doesn't overlap too much (max 50 attempts)
    let x, y;
    let attempts = 0;
    let foundValidPosition = false;
    
    while (!foundValidPosition && attempts < 50) {
      x = Math.random() * app.screen.width;
      y = Math.random() * app.screen.height;
      
      // Keep hyacinths away from edges
      const edgePadding = size / 2 || 15; // Fallback if size not initialized yet
      x = Math.max(edgePadding, Math.min(app.screen.width - edgePadding, x));
      y = Math.max(edgePadding, Math.min(app.screen.height - edgePadding, y));
      
      if (!checkOverlap(x, y, minDistance)) {
        foundValidPosition = true;
      }
      
      attempts++;
    }
    
    // If we couldn't find a good position after max attempts, use the last attempted position
    // This ensures we can keep adding hyacinths even when the screen gets crowded
    if (!foundValidPosition && attempts >= 50) {
      foundValidPosition = true;
    }
    
    // Add the hyacinth
    if (foundValidPosition) {
      setHyacinths([...hyacinths, { 
        id: hyacinthIdCounter, 
        x: x!, 
        y: y!,
        rotationSpeed: 0.1,
        resistance: Math.random() * 0.5 + 0.5 // Random resistance between 0.5 and 1.0
      }]);
      setHyacinthIdCounter(hyacinthIdCounter + 1);
    }
  };

  // Function to add a fish
  const addFish = () => {
    if (!app) return;
    
    const x = Math.random() * app.screen.width;
    const y = Math.random() * app.screen.height;
    
    setFish([...fish, { 
      id: fishIdCounter, 
      x, 
      y,
      rotationSpeed: 0.1,
      resistance: Math.random() * 0.5 + 0.5 // Random resistance between 0.5 and 1.0
    }]);
    setFishIdCounter(fishIdCounter + 1);
  };

  // Function to reset all agents
  const resetAgents = () => {
    setHyacinths([]);
    setFish([]);
  };

  // Handle hyacinth position updates
  const handleHyacinthPositionChange = (id: number, x: number, y: number) => {
    setHyacinths(currentHyacinths => 
      currentHyacinths.map(hyacinth => 
        hyacinth.id === id ? { ...hyacinth, x, y } : hyacinth
      )
    );
  };

  // Handle fish position updates
  const handleFishPositionChange = (id: number, x: number, y: number) => {
    setFish(currentFish => 
      currentFish.map(fish => 
        fish.id === id ? { ...fish, x, y } : fish
      )
    );
  };

  // Make these functions available to the parent
  useEffect(() => {
    if (window) {
      // @ts-ignore
      window.addHyacinth = addHyacinth;
      // @ts-ignore
      window.addFish = addFish;
      // @ts-ignore
      window.resetAgents = resetAgents;
    }
  }, [app, hyacinths, fish, hyacinthIdCounter, fishIdCounter]);

  return (
    <>
      {hyacinths.map(hyacinth => (
        <HyacinthSprite 
          key={hyacinth.id} 
          hyacinth={hyacinth} 
          onPositionChange={handleHyacinthPositionChange}
        />
      ))}
      {fish.map(fish => (
        <FishSprite 
          key={fish.id} 
          fish={fish} 
          onPositionChange={handleFishPositionChange}
        />
      ))}
    </>
  );
}; 