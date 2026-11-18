import { OpportunityLevel, ConfidenceLevel } from '../types';

/**
 * Calculates simplified opportunity level based on water volume in litres.
 */
export function calculateOpportunityLevel(litres: number): OpportunityLevel {
  if (litres >= 10000) {
    return 'High';
  } else if (litres >= 2000) {
    return 'Medium';
  } else {
    return 'Low';
  }
}

/**
 * Determines confidence level based on input completeness and standard prototype parameters.
 */
export function calculateConfidence(inputs: Record<string, unknown>): ConfidenceLevel {
  const hasValues = Object.values(inputs).every(v => v !== undefined && v !== null);
  return hasValues ? 'Medium' : 'Low';
}
