import { Router, Request, Response } from 'express';
import { mockBuildings } from '../data/buildings';
import { estimateCondensate } from '../services/waterCalculations';
import { validateBuildingInput } from '../utils/validation';
import { BuildingOpportunity } from '../types';

const router = Router();

/**
 * POST /api/buildings/analyze
 * Analyzes potential AC condensate recovery for a building and stores the opportunity.
 */
router.post('/analyze', (req: Request, res: Response) => {
  const validation = validateBuildingInput(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Invalid building analysis input',
      details: validation.errors
    });
  }

  const { name, latitude, longitude, buildingType, acUnits, averageOperatingHours, existingCondensateDrainage, landscaping } = req.body;

  const result = estimateCondensate({
    name,
    latitude,
    longitude,
    buildingType: buildingType || 'Commercial',
    acUnits: Number(acUnits),
    averageOperatingHours: Number(averageOperatingHours),
    existingCondensateDrainage: Boolean(existingCondensateDrainage),
    landscaping: Boolean(landscaping)
  });

  // Save opportunity into in-memory data store for map/dashboard visibility
  const newId = `B-${String(mockBuildings.length + 1).padStart(3, '0')}`;
  const newOpportunity: BuildingOpportunity = {
    id: newId,
    name,
    latitude,
    longitude,
    buildingType: buildingType || 'Commercial',
    acUnits: Number(acUnits),
    averageOperatingHours: Number(averageOperatingHours),
    existingCondensateDrainage: Boolean(existingCondensateDrainage),
    landscaping: Boolean(landscaping),
    estimatedCondensateLitresPerDay: result.estimatedCondensateLitresPerDay,
    estimatedAnnualLitres: result.estimatedAnnualLitres,
    potentialUses: result.potentialUses,
    recoveryPotential: result.recoveryPotential,
    confidence: result.confidence,
    assumptions: result.assumptions,
    createdAt: new Date().toISOString()
  };

  mockBuildings.unshift(newOpportunity);

  return res.status(200).json({
    id: newId,
    ...result
  });
});

/**
 * GET /api/buildings/opportunities
 * Returns all analyzed building condensate opportunities.
 */
router.get('/opportunities', (_req: Request, res: Response) => {
  return res.status(200).json({
    count: mockBuildings.length,
    opportunities: mockBuildings
  });
});

export default router;
