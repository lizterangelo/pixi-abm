import { useApplication } from "@pixi/react";
import { useEffect, useState } from "react";
import { Bunny, BunnySprite } from "./Bunny";
import { Fish, FishSprite } from "./Fish";

export const AgentScene = () => {
  const { app } = useApplication();
  const [bunnies, setBunnies] = useState<Bunny[]>([]);
  const [fish, setFish] = useState<Fish[]>([]);
  const [bunnyIdCounter, setBunnyIdCounter] = useState(0);
  const [fishIdCounter, setFishIdCounter] = useState(0);

  // Add the first bunny in the center when the app loads
  useEffect(() => {
    if (!app) return;
    
    setBunnies([{ 
      id: 0, 
      x: app.screen.width / 2, 
      y: app.screen.height / 2,
      rotationSpeed: 0.1,
      resistance: 0.5 // Add resistance property
    }]);
    setBunnyIdCounter(1);
  }, [app]);

  // Function to add a bunny
  const addBunny = () => {
    if (!app) return;
    
    const x = Math.random() * app.screen.width;
    const y = Math.random() * app.screen.height;
    
    setBunnies([...bunnies, { 
      id: bunnyIdCounter, 
      x, 
      y,
      rotationSpeed: 0.1,
      resistance: Math.random() * 0.5 + 0.5 // Random resistance between 0.5 and 1.0
    }]);
    setBunnyIdCounter(bunnyIdCounter + 1);
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
    setBunnies([]);
    setFish([]);
  };

  // Handle bunny position updates
  const handleBunnyPositionChange = (id: number, x: number, y: number) => {
    setBunnies(currentBunnies => 
      currentBunnies.map(bunny => 
        bunny.id === id ? { ...bunny, x, y } : bunny
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
      window.addBunny = addBunny;
      // @ts-ignore
      window.addFish = addFish;
      // @ts-ignore
      window.resetAgents = resetAgents;
    }
  }, [app, bunnies, fish, bunnyIdCounter, fishIdCounter]);

  return (
    <>
      {bunnies.map(bunny => (
        <BunnySprite 
          key={bunny.id} 
          bunny={bunny} 
          onPositionChange={handleBunnyPositionChange}
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