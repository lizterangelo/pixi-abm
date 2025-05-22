// Plant-Plant Interactions
export function calculateMatDensity(totalBiomass: number, areaOfCell: number): number {
  return totalBiomass / areaOfCell;
}

export function calculateMatCohesion(matDensity: number, cohesionFactor: number): number {
  return 1 - Math.exp(-cohesionFactor * matDensity);
}

export function calculateAvailableResources(totalResources: number, numberOfPlants: number): number {
  return totalResources / Math.max(1, numberOfPlants);
}

export function calculateLightAvailable(baseLightLevel: number, lightExtinctionCoefficient: number, cumulativeBiomassAbove: number): number {
  return baseLightLevel * Math.exp(-lightExtinctionCoefficient * cumulativeBiomassAbove);
}

// Plant-Environment Interactions
export function calculateOxygenReduction(oxygenDepletionRate: number, matDensity: number, temperatureFactor: number): number {
  return oxygenDepletionRate * Math.pow(matDensity, 2) * temperatureFactor;
}

export function calculateFlowReduction(baseFlowRate: number, flowResistance: number, matDensity: number): number {
  return baseFlowRate * (1 - Math.min(1, flowResistance * matDensity));
}

export function calculateLightReduction(baseLightLevel: number, lightBlockageFactor: number, matDensity: number): number {
  return baseLightLevel * Math.exp(-lightBlockageFactor * matDensity);
}

export function calculateGrowthModifier(nutrientFactor: number, temperatureFactor: number, lightFactor: number): number {
  return nutrientFactor * temperatureFactor * lightFactor;
}

export function calculateReproductiveRateModifier(seasonalFactor: number, temperatureFactor: number, nutrientFactor: number): number {
  return seasonalFactor * temperatureFactor * nutrientFactor;
}

// Plant-Fish Interactions
export function calculateAvailableOxygen(baseOxygenLevel: number, oxygenReduction: number): number {
  return baseOxygenLevel - oxygenReduction;
}

export function calculateFishHealthImpact(availableOxygen: number, fishOxygenRequirement: number): number {
  return Math.max(0, Math.min(1, availableOxygen / fishOxygenRequirement));
}

export function calculateShelterBenefit(maxShelterBenefit: number, hyacinthDensity: number, optimalDensity: number, variance: number): number {
  return maxShelterBenefit * (hyacinthDensity / optimalDensity) * Math.exp(-Math.pow(hyacinthDensity - optimalDensity, 2) / (2 * variance));
} 