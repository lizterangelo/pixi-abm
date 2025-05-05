import { useApplication } from "@pixi/react";
import { useEffect, useState } from "react";
import { Hyacinth, HyacinthSprite } from "./Hyacinth";
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

  // Function to add a hyacinth
  const addHyacinth = () => {
    if (!app) return;
    
    const x = Math.random() * app.screen.width;
    const y = Math.random() * app.screen.height;
    
    setHyacinths([...hyacinths, { 
      id: hyacinthIdCounter, 
      x, 
      y,
      rotationSpeed: 0.1,
      resistance: Math.random() * 0.5 + 0.5 // Random resistance between 0.5 and 1.0
    }]);
    setHyacinthIdCounter(hyacinthIdCounter + 1);
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