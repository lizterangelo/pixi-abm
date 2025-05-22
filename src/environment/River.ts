export interface River {
  // Spatial properties
  width: number;        // meters (20-500m)
  depth: number;        // meters (1-15m)
  flowDirection: number; // radians (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
  
  // Flow properties
  baseFlowRate: number;  // m/s (0.1-3.0)
  seasonalFactor: number; // for flow variation
  phaseShift: number;    // for seasonal timing
  
  // Environmental parameters
  temperature: number;   // °C (25-35)
  nutrientConcentration: number; // mg/L (0.5-10.0)
  pollutionLevel: number; // mg/L (0.0-5.0)
  dissolvedOxygen: number; // mg/L (0-12)
  sunlight: number;      // scale (0.0-1.0)
  
  // Plant interaction parameters
  oxygenDepletionRate: number;
  flowResistance: number;
  lightBlockageFactor: number;
  baseLightLevel: number;
  
  // Model parameters
  oxygenDiffusionRate: number;
  biologicalOxygenDemand: number;
  hyacinthDensity: number;
  hyacinthBlockageCoefficient: number;
  
  // Nutrient model parameters
  inflowNutrient: number;
  outflowNutrient: number;
  pointSourceAddition: number;
  plantUptake: number;
}

export const createRiver = (
  direction: number = 0,
  baseFlow: number = 1.0,
  seasonalFactor: number = 0.3,
  phaseShift: number = 0
): River => {
  return {
    // Spatial properties
    width: 100, // default middle value
    depth: 5,   // default middle value
    flowDirection: direction,
    
    // Flow properties
    baseFlowRate: baseFlow,
    seasonalFactor: seasonalFactor,
    phaseShift: phaseShift,
    
    // Environmental parameters
    temperature: 30, // default middle value
    nutrientConcentration: 5.0, // default middle value
    pollutionLevel: 0.0,
    dissolvedOxygen: 8.0, // default middle value
    sunlight: 0.5, // default middle value
    
    // Plant interaction parameters
    oxygenDepletionRate: 0.1,
    flowResistance: 0.2,
    lightBlockageFactor: 0.3,
    baseLightLevel: 1.0,
    
    // Model parameters
    oxygenDiffusionRate: 0.1,
    biologicalOxygenDemand: 0.05,
    hyacinthDensity: 0.0,
    hyacinthBlockageCoefficient: 0.1,
    
    // Nutrient model parameters
    inflowNutrient: 0.0,
    outflowNutrient: 0.0,
    pointSourceAddition: 0.0,
    plantUptake: 0.0
  };
};

// Helper functions for environmental dynamics
export const calculateSeasonalFlowRate = (river: River, dayOfYear: number): number => {
  return river.baseFlowRate * (1 + river.seasonalFactor * Math.sin(2 * Math.PI * dayOfYear / 365 + river.phaseShift));
};

export const calculateHyacinthBlockageEffect = (river: River): number => {
  return river.hyacinthBlockageCoefficient * Math.pow(river.hyacinthDensity, 2);
};

export const calculateOxygenChange = (river: River, saturationDO: number): number => {
  const hyacinthEffect = calculateHyacinthBlockageEffect(river);
  return river.oxygenDiffusionRate * (saturationDO - river.dissolvedOxygen) - 
         river.biologicalOxygenDemand - 
         hyacinthEffect;
};

export const calculateNutrientChange = (river: River): number => {
  return river.inflowNutrient - river.outflowNutrient + 
         river.pointSourceAddition - river.plantUptake;
};

// New plant-environment interaction functions
export const calculateOxygenReduction = (river: River, matDensity: number): number => {
  const temperatureFactor = (river.temperature - 25) / 10; // Normalized temperature factor
  return river.oxygenDepletionRate * Math.pow(matDensity, 2) * temperatureFactor;
};

export const calculateFlowReduction = (river: River, matDensity: number): number => {
  return river.baseFlowRate * (1 - Math.min(1, river.flowResistance * matDensity));
};

export const calculateLightReduction = (river: River, matDensity: number): number => {
  return river.baseLightLevel * Math.exp(-river.lightBlockageFactor * matDensity);
};

export const calculateGrowthModifier = (river: River): number => {
  const nutrientFactor = river.nutrientConcentration / 10.0; // Normalized to 0-1
  const temperatureFactor = (river.temperature - 25) / 10; // Normalized to 0-1
  const lightFactor = river.sunlight;
  return nutrientFactor * temperatureFactor * lightFactor;
};

export const calculateReproductiveRateModifier = (river: River, dayOfYear: number): number => {
  const seasonalFactor = (1 + Math.sin(2 * Math.PI * dayOfYear / 365)) / 2; // 0-1 range
  const temperatureFactor = (river.temperature - 25) / 10; // Normalized to 0-1
  const nutrientFactor = river.nutrientConcentration / 10.0; // Normalized to 0-1
  return seasonalFactor * temperatureFactor * nutrientFactor;
}; 