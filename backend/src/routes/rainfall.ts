import { Router, Request, Response } from 'express';
import { mockRainfallOpportunities } from '../data/rainfall';
import { estimateRunoff } from '../services/waterCalculations';
import { validateRainfallInput } from '../utils/validation';
import { RainfallOpportunity } from '../types';

const router = Router();

/**
 * POST /api/rainfall/analyze
 * Analyzes rainfall runoff potential for a specified coordinate, catchment area, and rainfall event.
 */
router.post('/analyze', (req: Request, res: Response) => {
  const validation = validateRainfallInput(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Invalid rainfall analysis input',
      details: validation.errors
    });
  }

  const { latitude, longitude, rainfallMm, catchmentAreaM2, runoffCoefficient, areaName } = req.body;

  const result = estimateRunoff({
    latitude: Number(latitude),
    longitude: Number(longitude),
    rainfallMm: Number(rainfallMm),
    catchmentAreaM2: Number(catchmentAreaM2),
    runoffCoefficient: Number(runoffCoefficient)
  });

  const newId = `R-${String(mockRainfallOpportunities.length + 1).padStart(3, '0')}`;
  const newOpportunity: RainfallOpportunity = {
    id: newId,
    latitude: Number(latitude),
    longitude: Number(longitude),
    areaName: areaName || `Rainfall Catchment ${newId}`,
    rainfallEvent: `Analyzed Rain Event (${rainfallMm} mm)`,
    rainfallMm: Number(rainfallMm),
    catchmentAreaM2: Number(catchmentAreaM2),
    runoffCoefficient: Number(runoffCoefficient),
    estimatedRunoffLitres: result.estimatedRunoffLitres,
    opportunityLevel: result.opportunityLevel,
    confidence: result.confidence,
    status: 'Analyzed',
    createdAt: new Date().toISOString()
  };

  mockRainfallOpportunities.unshift(newOpportunity);

  return res.status(200).json({
    id: newId,
    ...result
  });
});

/**
 * GET /api/rainfall/opportunities
 * Returns all rainfall runoff opportunity locations.
 */
router.get('/opportunities', (_req: Request, res: Response) => {
  return res.status(200).json({
    count: mockRainfallOpportunities.length,
    opportunities: mockRainfallOpportunities
  });
});

export default router;
