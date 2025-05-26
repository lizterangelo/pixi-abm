export interface River {
  flowDirection: number; // in radians (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
  flowRate: number;     // pixels per second
  totalNutrients: number; // total nutrients in kg
  temperature: number; // temperature in °C (25-35°C)
  sunlight: number; // sunlight scale (0.0-1.0)
  pollutionLevel: number; // pollution level as percentage (0-100%)
}

// Singleton river instance
let riverInstance: River | null = null;

export const createRiver = (): River => {
  if (!riverInstance) {
    riverInstance = {
      flowDirection: 0,
      flowRate: 0,
      totalNutrients: 100.0, // Starting with 100 kg of nutrients
      temperature: 30, // Default temperature 30°C
      sunlight: 0.8, // Default sunlight 0.8 (80%)
      pollutionLevel: 0 // Default pollution level 0%
    };
  }
  return riverInstance;
};

export const getRiver = (): River => {
  if (!riverInstance) {
    riverInstance = createRiver();
  }
  return riverInstance;
};

export const updateRiver = (updates: Partial<River>): River => {
  if (!riverInstance) {
    riverInstance = createRiver();
  }
  riverInstance = { ...riverInstance, ...updates };
  return riverInstance;
};

export const resetRiver = (): River => {
  riverInstance = {
    flowDirection: 0,
    flowRate: 0,
    totalNutrients: 100.0, // Reset to starting nutrients
    temperature: 30, // Reset temperature
    sunlight: 0.8, // Reset sunlight
    pollutionLevel: 0 // Reset pollution level
  };
  return riverInstance;
};

// River controls functionality
export const createRiverControls = (river: River, setRiver: (river: River) => void) => {
  const handleFlowDirectionChange = (direction: number) => {
    const updatedRiver = updateRiver({ flowDirection: direction });
    setRiver(updatedRiver);
  };

  const handleFlowRateChange = (rate: number) => {
    const updatedRiver = updateRiver({ flowRate: rate });
    setRiver(updatedRiver);
  };

  const handleNutrientsChange = (nutrients: number) => {
    const updatedRiver = updateRiver({ totalNutrients: nutrients });
    setRiver(updatedRiver);
  };

  const handleTemperatureChange = (temperature: number) => {
    const updatedRiver = updateRiver({ temperature: temperature });
    setRiver(updatedRiver);
  };

  const handleSunlightChange = (sunlight: number) => {
    const updatedRiver = updateRiver({ sunlight: sunlight });
    setRiver(updatedRiver);
  };

  const handlePollutionChange = (pollution: number) => {
    const updatedRiver = updateRiver({ pollutionLevel: pollution });
    setRiver(updatedRiver);
  };

  return {
    handleFlowDirectionChange,
    handleFlowRateChange,
    handleNutrientsChange,
    handleTemperatureChange,
    handleSunlightChange,
    handlePollutionChange
  };
}; 