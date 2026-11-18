import { Router, Request, Response } from 'express';
import { mockBuildings } from '../data/buildings';
import { mockRainfallOpportunities } from '../data/rainfall';
import { mockCommunityReports } from '../data/community';
import { MapOpportunity } from '../types';

const router = Router();

/**
 * GET /api/map/opportunities
 * Query params: ?type=building|rainfall|community|all
 * Returns unified list of opportunities for Leaflet map integration.
 */
router.get('/opportunities', (req: Request, res: Response) => {
  const filterType = (req.query.type as string || 'all').toLowerCase();

  const buildingOpportunities: MapOpportunity[] = mockBuildings.map(b => ({
    id: b.id,
    type: 'building',
    latitude: b.latitude,
    longitude: b.longitude,
    title: b.name,
    estimatedWaterLitres: b.estimatedCondensateLitresPerDay,
    opportunityLevel: b.recoveryPotential,
    confidence: b.confidence,
    status: 'Condensate Active',
    description: `AC Condensate recovery potential: ${b.estimatedCondensateLitresPerDay.toLocaleString()} L/day`
  }));

  const rainfallOpportunities: MapOpportunity[] = mockRainfallOpportunities.map(r => ({
    id: r.id,
    type: 'rainfall',
    latitude: r.latitude,
    longitude: r.longitude,
    title: r.areaName,
    estimatedWaterLitres: r.estimatedRunoffLitres,
    opportunityLevel: r.opportunityLevel,
    confidence: r.confidence,
    status: r.status,
    description: `Rainfall runoff estimate: ${r.estimatedRunoffLitres.toLocaleString()} L from ${r.rainfallMm}mm rain event`
  }));

  const communityOpportunities: MapOpportunity[] = mockCommunityReports.map(c => ({
    id: c.id,
    type: 'community',
    latitude: c.latitude,
    longitude: c.longitude,
    title: `${c.type} Report`,
    status: c.status,
    description: c.description
  }));

  let result: MapOpportunity[] = [];

  switch (filterType) {
    case 'building':
    case 'buildings':
      result = buildingOpportunities;
      break;
    case 'rainfall':
      result = rainfallOpportunities;
      break;
    case 'community':
      result = communityOpportunities;
      break;
    case 'all':
    default:
      result = [...buildingOpportunities, ...rainfallOpportunities, ...communityOpportunities];
      break;
  }

  return res.status(200).json({
    filter: filterType,
    count: result.length,
    opportunities: result
  });
});

export default router;
