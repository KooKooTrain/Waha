import { BuildingAnalysisInput, BuildingAnalysisResult, RainfallAnalysisInput, RainfallAnalysisResult } from '../types';
import { calculateOpportunityLevel, calculateConfidence } from './opportunityScoring';

/**
 * Transparent constant for AC Condensate Estimation
 * UAE ambient humidity and cooling load estimate: ~1.533 litres per AC unit per operating hour.
 */
export const CONDENSATE_LITRES_PER_AC_UNIT_PER_HOUR = 1.5333;

/**
 * Estimates potential AC condensate water recovery for a building.
 */
export function estimateCondensate(input: BuildingAnalysisInput): BuildingAnalysisResult {
  const dailyLitres = Math.round(
    input.acUnits * input.averageOperatingHours * CONDENSATE_LITRES_PER_AC_UNIT_PER_HOUR
  );
  const annualLitres = dailyLitres * 365;

  const potentialUses = [
    'Landscape irrigation',
    'District cooling makeup water',
    'Non-potable facility applications (flushing, cleaning)'
  ];

  if (input.landscaping) {
    potentialUses.unshift('On-site landscape irrigation & greenery');
  }

  const recoveryPotential = calculateOpportunityLevel(dailyLitres);
  const confidence = calculateConfidence({ acUnits: input.acUnits, hours: input.averageOperatingHours });

  const assumptions = [
    `Assumed ${CONDENSATE_LITRES_PER_AC_UNIT_PER_HOUR.toFixed(2)} litres condensate generation per AC unit per operating hour (UAE climate model)`,
    `Estimated using AC unit count (${input.acUnits}) and operating hours (${input.averageOperatingHours} hours/day)`,
    'Actual condensate generation varies dynamically with seasonal humidity, ambient temperature, and HVAC load'
  ];

  return {
    building: {
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude
    },
    estimatedCondensateLitresPerDay: dailyLitres,
    estimatedAnnualLitres: annualLitres,
    potentialUses,
    recoveryPotential,
    confidence,
    assumptions
  };
}

/**
 * Estimates rainfall runoff volume based on rainfall depth, catchment area, and runoff coefficient.
 * Formula: Runoff (Litres) = Rainfall (mm) * Catchment Area (m²) * Runoff Coefficient
 * (since 1 mm on 1 m² = 1 Litre).
 */
export function estimateRunoff(input: RainfallAnalysisInput): RainfallAnalysisResult {
  // Convert mm to metres: rainfallMetres = rainfallMm / 1000
  // Volume in m3 = rainfallMetres * catchmentAreaM2 * runoffCoefficient
  // Volume in litres = Volume in m3 * 1000 = rainfallMm * catchmentAreaM2 * runoffCoefficient
  const estimatedRunoffLitres = Math.round(
    input.rainfallMm * input.catchmentAreaM2 * input.runoffCoefficient
  );

  const opportunityLevel = calculateOpportunityLevel(estimatedRunoffLitres);
  const confidence = calculateConfidence({ rainfallMm: input.rainfallMm, area: input.catchmentAreaM2 });

  const notes = [
    `Estimate based on rainfall depth (${input.rainfallMm} mm), catchment area (${input.catchmentAreaM2} m²), and runoff coefficient (${input.runoffCoefficient})`,
    'Converted rainfall millimetres into metres (1 mm = 0.001 m; 1 m³ = 1,000 litres)',
    'Actual capture potential requires site-specific engineering assessment, slope analysis, and storage infrastructure'
  ];

  return {
    estimatedRunoffLitres,
    opportunityLevel,
    confidence,
    notes
  };
}
