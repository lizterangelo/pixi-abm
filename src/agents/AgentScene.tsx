import { useApplication } from "@pixi/react";
import { useEffect, useState } from "react";
import {
  Hyacinth,
  HyacinthSprite,
  HYACINTH_SIZE,
  INIT_BIOMASS,
  calculateGrowthRate,
} from "./Hyacinth";
import { Fish, FishSprite } from "./Fish";
import { River } from "../environment/River";
import { SimulationManager } from "../simulation/SimulationManager";
import { v4 as uuidv4 } from "uuid";

export const AgentScene = ({
  river,
  onNutrientConsumption,
  onPollutionConsumption,
  onCurrentDOChange,
  onCountsChange,
}: {
  river: River;
  onNutrientConsumption: (consumedAmount: number) => void;
  onPollutionConsumption: (consumedAmount: number) => void;
  onCurrentDOChange: (newDO: number) => void;
  onCountsChange: (fishCount: number, hyacinthCount: number) => void;
}) => {
  const { app } = useApplication();
  const [hyacinths, setHyacinths] = useState<Hyacinth[]>([]);
  const [fish, setFish] = useState<Fish[]>([]);

  // Effect to update counts whenever fish or hyacinth arrays change
  useEffect(() => {
    onCountsChange(fish.length, hyacinths.length);
  }, [fish.length, hyacinths.length, onCountsChange]);

  // Effect to update currentDissolvedOxygen based on hyacinth count and pollution
  useEffect(() => {
    const totalHyacinthOxygenImpact = hyacinths.reduce(
      (sum, hyacinth) => sum + hyacinth.dissolvedOxygenImpact,
      0,
    );
    const pollutionDOImpact = (river.pollutionLevel / 100) * 6.0; // 100% pollution = -6.0 DO

    // Ensure pollutionDOImpact doesn't exceed initialDissolvedOxygen on its own if initialDO is less than 6
    // Or, more simply, ensure the subtracted value is capped.
    // The Math.max(0, ...) below will handle the final floor.

    const newCurrentDO = Math.max(
      0,
      river.initialDissolvedOxygen -
        totalHyacinthOxygenImpact -
        pollutionDOImpact,
    );
    onCurrentDOChange(newCurrentDO);
  }, [
    hyacinths,
    river.initialDissolvedOxygen,
    river.pollutionLevel,
    onCurrentDOChange,
  ]); // Added river.pollutionLevel to dependencies

  // Handle nutrient and pollution consumption
  const handleNutrientUpdate = () => {
    if (hyacinths.length > 0 && river.totalNutrients > 0) {
      // Calculate total NUR from all hyacinths
      const totalNUR = hyacinths.reduce(
        (sum, hyacinth) => sum + hyacinth.nur,
        0,
      );

      // Use NUR as raw consumption rate per second (kg/second)
      const consumptionPerSecond = totalNUR;

      // Consume nutrients every second
      if (consumptionPerSecond > 0) {
        onNutrientConsumption(consumptionPerSecond);
      }
    }

    // Handle pollution consumption (hyacinths absorb pollution even if there's little left)
    if (hyacinths.length > 0 && river.pollutionLevel > 0) {
      // Calculate total POL from all hyacinths
      const totalPOL = hyacinths.reduce(
        (sum, hyacinth) => sum + hyacinth.pol,
        0,
      );

      // Use POL as percentage reduction per second
      const pollutionReductionPerSecond = totalPOL;

      // Consume pollution every second
      if (pollutionReductionPerSecond > 0) {
        onPollutionConsumption(pollutionReductionPerSecond);
      }
    }
  };

  // Handle hyacinth updates
  const handleHyacinthUpdate = () => {
    // This will be handled by individual hyacinth components
    // We just need to pass the deltaTime to them
  };

  // Handle fish updates
  const handleFishUpdate = () => {
    // This will be handled by individual fish components
    // We just need to pass the deltaTime to them
  };

  // Check if a position overlaps with existing hyacinths
  const checkHyacinthOverlap = (
    x: number,
    y: number,
    minDistance: number,
  ): boolean => {
    return hyacinths.some((hyacinth) => {
      const dx = hyacinth.x - x;
      const dy = hyacinth.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < minDistance;
    });
  };

  // Check if a position overlaps with existing fish
  const checkFishOverlap = (
    x: number,
    y: number,
    minDistance: number,
  ): boolean => {
    return fish.some((fishAgent) => {
      const dx = fishAgent.x - x;
      const dy = fishAgent.y - y;
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

      if (!checkHyacinthOverlap(x, y, minDistance)) {
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
      const nur = 0.01 + Math.random() * 0.04; // Generate NUR once
      const pol = 0.05 + Math.random() * 0.04; // Generate POL (0.05-0.09% per second)
      const growthRate = calculateGrowthRate(
        river.temperature,
        river.sunlight,
        nur,
      );
      const dissolvedOxygenImpact = 0.03 + Math.random() * 0.03; // Random DO impact 0.03-0.06

      setHyacinths([
        ...hyacinths,
        {
          id: uuidv4(),
          reproduceRate: 1, // Default reproduce rate (5% chance per second)
          x: x!,
          y: y!,
          rotationSpeed: 0.1,
          resistance: Math.random() * 0.2 + 0.5, // Random resistance between 0.5 and 0.7
          biomass: INIT_BIOMASS, // Start with initial biomass
          nur: nur, // Use the generated NUR
          pol: pol, // Use the generated POL
          growthRate: growthRate, // Use the calculated growth rate
          parent: null, // Original hyacinths have no parent
          daughters: [], // Start with no daughters
          currentDaughters: 0, // No daughters produced yet
          futureDaughters: Math.floor(Math.random() * 3) + 1, // Random 1-3 future daughters
          biomassGained: 0, // Start with no biomass gained
          dissolvedOxygenImpact: dissolvedOxygenImpact, // Set DO impact
          age: 0, // Start with age 0
        },
      ]);
    }
  };

  // Function to add a fish
  const addFish = () => {
    if (!app) return;

    const fishSize = 50; // Approximate fish size for spacing
    const minDistance = fishSize * 0.8; // Minimum distance between fish

    // Try to find a position that doesn't overlap with other fish (max 50 attempts)
    let x, y;
    let attempts = 0;
    let foundValidPosition = false;

    while (!foundValidPosition && attempts < 50) {
      x = Math.random() * app.screen.width;
      y = Math.random() * app.screen.height;

      if (!checkFishOverlap(x, y, minDistance)) {
        foundValidPosition = true;
      }

      attempts++;
    }

    // If we couldn't find a good position after max attempts, use the last attempted position
    if (!foundValidPosition && attempts >= 50) {
      foundValidPosition = true;
    }

    // Add the fish
    if (foundValidPosition) {
      setFish([
        ...fish,
        {
          id: uuidv4(),
          reproduceRate: 0.05, // Default reproduce rate (5% chance per second)
          x: x!,
          y: y!,
          rotationSpeed: 0.1,
          resistance: Math.random() * 0.5 + 0.5, // Random resistance between 0.5 and 1.0
        },
      ]);
    }
  };

  // Function to reset all agents
  const resetAgents = () => {
    setHyacinths([]);
    setFish([]);
  };

  // Function to setup multiple hyacinths
  const setupHyacinths = (count: number, reproduceRate: number = 0.05) => {
    if (!app || count <= 0) return;

    const newHyacinths: Hyacinth[] = [];
    const size = Math.max(HYACINTH_SIZE.width, HYACINTH_SIZE.height);
    const overlapFactor = 0.7;
    const minDistance = size > 0 ? size * overlapFactor : 20;

    for (let i = 0; i < count; i++) {
      let x: number = 0,
        y: number = 0;
      let attempts = 0;
      let foundValidPosition = false;

      while (!foundValidPosition && attempts < 100) {
        x = Math.random() * app.screen.width;
        y = Math.random() * app.screen.height;

        // Check against existing hyacinths and new hyacinths being placed
        const overlapsExisting = hyacinths.some((hyacinth) => {
          const dx = hyacinth.x - x;
          const dy = hyacinth.y - y;
          return Math.sqrt(dx * dx + dy * dy) < minDistance;
        });

        const overlapsNew = newHyacinths.some((hyacinth) => {
          const dx = hyacinth.x - x;
          const dy = hyacinth.y - y;
          return Math.sqrt(dx * dx + dy * dy) < minDistance;
        });

        if (!overlapsExisting && !overlapsNew) {
          foundValidPosition = true;
        }

        attempts++;
      }

      if (!foundValidPosition && attempts >= 100) {
        // Use a fallback position if we can't find a good spot
        x = Math.random() * app.screen.width;
        y = Math.random() * app.screen.height;
      }

      const nur = 0.01 + Math.random() * 0.04;
      const pol = 0.05 + Math.random() * 0.04;
      const growthRate = calculateGrowthRate(
        river.temperature,
        river.sunlight,
        nur,
      );
      const dissolvedOxygenImpact = 0.03 + Math.random() * 0.03; // Random DO impact 0.03-0.06

      newHyacinths.push({
        id: uuidv4(),
        reproduceRate: reproduceRate, // Use the provided reproduce rate
        x: x,
        y: y,
        rotationSpeed: 0.1,
        resistance: Math.random() * 0.2 + 0.5,
        biomass: INIT_BIOMASS,
        nur: nur,
        pol: pol,
        growthRate: growthRate,
        parent: null,
        daughters: [],
        currentDaughters: 0,
        futureDaughters: Math.floor(Math.random() * 3) + 1,
        biomassGained: 0,
        dissolvedOxygenImpact: dissolvedOxygenImpact, // Set DO impact
        age: 0, // Start with age 0
      });
    }

    setHyacinths((prevHyacinths) => [...prevHyacinths, ...newHyacinths]);
  };

  // Function to setup multiple fish
  const setupFish = (count: number, reproduceRate: number = 0.05) => {
    if (!app || count <= 0) return;

    const newFish: Fish[] = [];
    const fishSize = 50;
    const minDistance = fishSize * 0.8;

    for (let i = 0; i < count; i++) {
      let x: number = 0,
        y: number = 0;
      let attempts = 0;
      let foundValidPosition = false;

      while (!foundValidPosition && attempts < 100) {
        x = Math.random() * app.screen.width;
        y = Math.random() * app.screen.height;

        // Check against existing fish and new fish being placed
        const overlapsExisting = fish.some((fishAgent) => {
          const dx = fishAgent.x - x;
          const dy = fishAgent.y - y;
          return Math.sqrt(dx * dx + dy * dy) < minDistance;
        });

        const overlapsNew = newFish.some((fishAgent) => {
          const dx = fishAgent.x - x;
          const dy = fishAgent.y - y;
          return Math.sqrt(dx * dx + dy * dy) < minDistance;
        });

        if (!overlapsExisting && !overlapsNew) {
          foundValidPosition = true;
        }

        attempts++;
      }

      if (!foundValidPosition && attempts >= 100) {
        // Use a fallback position if we can't find a good spot
        x = Math.random() * app.screen.width;
        y = Math.random() * app.screen.height;
      }

      newFish.push({
        id: uuidv4(),
        reproduceRate: reproduceRate, // Use the provided reproduce rate
        x: x,
        y: y,
        rotationSpeed: 0.1,
        resistance: Math.random() * 0.5 + 0.5,
      });
    }

    setFish([...fish, ...newFish]);
  };

  // Function to update reproduce rate for all fish
  const updateAllFishReproduceRate = (newReproduceRate: number) => {
    setFish((currentFish) =>
      currentFish.map((fish) => ({ ...fish, reproduceRate: newReproduceRate })),
    );
  };

  // Handle hyacinth position updates
  const handleHyacinthPositionChange = (id: string, x: number, y: number) => {
    setHyacinths((currentHyacinths) =>
      currentHyacinths.map((hyacinth) =>
        hyacinth.id === id ? { ...hyacinth, x, y } : hyacinth,
      ),
    );
  };

  // Handle hyacinth biomass updates
  const handleHyacinthBiomassChange = (id: string, newBiomass: number) => {
    setHyacinths((currentHyacinths) =>
      currentHyacinths.map((hyacinth) => {
        if (hyacinth.id === id) {
          return {
            ...hyacinth,
            biomass: newBiomass,
          };
        }
        return hyacinth;
      }),
    );
  };

  // Handle hyacinth biomass gained updates
  const handleHyacinthBiomassGainedChange = (
    id: string,
    newBiomassGained: number,
  ) => {
    setHyacinths((currentHyacinths) =>
      currentHyacinths.map((hyacinth) =>
        hyacinth.id === id
          ? { ...hyacinth, biomassGained: newBiomassGained }
          : hyacinth,
      ),
    );
  };

  // Handle hyacinth age updates
  const handleHyacinthAgeChange = (id: string, newAge: number) => {
    setHyacinths((currentHyacinths) =>
      currentHyacinths.map((hyacinth) =>
        hyacinth.id === id ? { ...hyacinth, age: newAge } : hyacinth,
      ),
    );
  };

  // Handle hyacinth death
  const handleHyacinthDeath = (hyacinthId: string) => {
    setHyacinths((currentHyacinths) => {
      const dyingHyacinth = currentHyacinths.find((h) => h.id === hyacinthId);
      if (!dyingHyacinth) return currentHyacinths;

      // Remove the dying hyacinth and unlink it from its daughters
      return currentHyacinths
        .filter((hyacinth) => hyacinth.id !== hyacinthId) // Remove the dying hyacinth
        .map((hyacinth) => {
          // If this hyacinth has the dying hyacinth as parent, remove the parent link
          if (hyacinth.parent === hyacinthId) {
            return { ...hyacinth, parent: null };
          }
          // If this hyacinth has the dying hyacinth as a daughter, remove it from daughters array
          if (hyacinth.daughters.includes(hyacinthId)) {
            return {
              ...hyacinth,
              daughters: hyacinth.daughters.filter(
                (daughterId) => daughterId !== hyacinthId,
              ),
              currentDaughters: Math.max(0, hyacinth.currentDaughters - 1),
            };
          }
          return hyacinth;
        });
    });
  };

  // Handle hyacinth reproduction
  const handleHyacinthReproduction = (
    parentId: string,
    x: number,
    y: number,
  ) => {
    setHyacinths((currentHyacinths) => {
      const parent = currentHyacinths.find((h) => h.id === parentId);
      if (!parent) return currentHyacinths;

      const nur = 0.01 + Math.random() * 0.04; // Generate NUR for daughter
      const pol = 0.05 + Math.random() * 0.04; // Generate POL (0.05-0.09% per second) for daughter
      const growthRate = calculateGrowthRate(
        river.temperature,
        river.sunlight,
        nur,
      );
      const dissolvedOxygenImpact = 0.03 + Math.random() * 0.03; // Random DO impact 0.03-0.06 for daughter

      const daughter: Hyacinth = {
        id: uuidv4(),
        reproduceRate: parent.reproduceRate, // Inherit reproduce rate from parent
        x,
        y,
        rotationSpeed: 0.1,
        resistance: parent.resistance, // Inherit exact resistance from parent
        biomass: INIT_BIOMASS,
        nur: nur,
        pol: pol,
        growthRate: growthRate,
        parent: parentId, // Set parent ID
        daughters: [],
        currentDaughters: 0,
        futureDaughters: Math.floor(Math.random() * 3) + 1, // Random 1-3 future daughters
        biomassGained: 0,
        dissolvedOxygenImpact: dissolvedOxygenImpact, // Set DO impact for daughter
        age: 0, // Start with age 0
      };

      // Update parent and add daughter
      const updatedHyacinths = currentHyacinths
        .map((hyacinth) => {
          if (hyacinth.id === parentId) {
            return {
              ...hyacinth,
              daughters: [...hyacinth.daughters, daughter.id],
              currentDaughters: hyacinth.currentDaughters + 1,
              biomassGained: 0, // Reset biomass gained after reproduction
            };
          }
          return hyacinth;
        })
        .concat(daughter);

      return updatedHyacinths;
    });
  };

  // Handle fish position updates
  const handleFishPositionChange = (id: string, x: number, y: number) => {
    setFish((currentFish) =>
      currentFish.map((fish) => (fish.id === id ? { ...fish, x, y } : fish)),
    );
  };

  // Handle fish touching hyacinth state changes
  const handleFishTouchingHyacinthChange = (id: string, touching: boolean) => {
    setFish((currentFish) =>
      currentFish.map((fish) =>
        fish.id === id ? { ...fish, touchingHyacinth: touching } : fish,
      ),
    );
  };

  // Handle fish reproduction
  const handleFishReproduction = (parentId: string, x: number, y: number) => {
    const parent = fish.find((f) => f.id === parentId);
    if (!parent) return;

    // Create new fish at parent's location with same properties
    const newFish: Fish = {
      id: uuidv4(),
      reproduceRate: parent.reproduceRate, // Inherit reproduce rate from parent
      x: x,
      y: y,
      rotationSpeed: 0.1,
      resistance: parent.resistance, // Inherit resistance from parent
    };

    // console.log(
    //   `Fish ${parentId} reproduced! New fish ${newFish.id} created at (${x.toFixed(1)}, ${y.toFixed(1)})`,
    // );

    setFish((currentFish) => [...currentFish, newFish]);
  };

  // Handle fish death
  const handleFishDeath = (fishId: string) => {
    setFish((currentFish) => currentFish.filter((fish) => fish.id !== fishId));
  };

  // Function to update reproduce rate for all hyacinths
  const updateAllHyacinthReproduceRate = (newReproduceRate: number) => {
    setHyacinths((currentHyacinths) =>
      currentHyacinths.map((hyacinth) => ({
        ...hyacinth,
        reproduceRate: newReproduceRate,
      })),
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
      // @ts-ignore
      window.setupHyacinths = setupHyacinths;
      // @ts-ignore
      window.setupFish = setupFish;
      // @ts-ignore
      window.updateAllFishReproduceRate = updateAllFishReproduceRate;
      // @ts-ignore
      window.updateAllHyacinthReproduceRate = updateAllHyacinthReproduceRate;
    }
  }, [app, hyacinths, fish]);

  return (
    <>
      <SimulationManager
        onNutrientUpdate={handleNutrientUpdate}
        onHyacinthUpdate={handleHyacinthUpdate}
        onFishUpdate={handleFishUpdate}
      />
      {hyacinths.map((hyacinth) => (
        <HyacinthSprite
          key={hyacinth.id}
          hyacinth={hyacinth}
          allHyacinths={hyacinths}
          river={river}
          onPositionChange={handleHyacinthPositionChange}
          onBiomassChange={handleHyacinthBiomassChange}
          onBiomassGainedChange={handleHyacinthBiomassGainedChange}
          onAgeChange={handleHyacinthAgeChange}
          onReproduction={handleHyacinthReproduction}
          onDeath={handleHyacinthDeath}
        />
      ))}
      {fish.map((fish) => (
        <FishSprite
          key={fish.id}
          fish={fish}
          allHyacinths={hyacinths}
          river={river}
          onPositionChange={handleFishPositionChange}
          onTouchingHyacinthChange={handleFishTouchingHyacinthChange}
          onReproduction={handleFishReproduction}
          onDeath={handleFishDeath}
        />
      ))}
    </>
  );
};
