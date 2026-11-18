import { Router, Request, Response } from 'express';
import { mockBuildings } from '../data/buildings';
import { mockRainfallOpportunities } from '../data/rainfall';
import { mockCommunityReports } from '../data/community';
import { DashboardSummary } from '../types';

const router = Router();

/**
 * GET /api/dashboard
 * Aggregates high-level prototype statistics and breakdown metrics.
 */
router.get('/', (_req: Request, res: Response) => {
  const buildingDailyLitres = mockBuildings.reduce(
    (sum, b) => sum + b.estimatedCondensateLitresPerDay, 
    0
  );

  const rainfallTotalLitres = mockRainfallOpportunities.reduce(
    (sum, r) => sum + r.estimatedRunoffLitres, 
    0
  );

  const totalEstimatedDailyRecoveryLitres = buildingDailyLitres;

  // Count high priority opportunities (High potential buildings + High potential rainfall + New/Under Investigation community reports)
  const highPriorityBuildings = mockBuildings.filter(b => b.recoveryPotential === 'High');
  const highPriorityRainfall = mockRainfallOpportunities.filter(r => r.opportunityLevel === 'High');
  const activeCommunityReports = mockCommunityReports.filter(c => c.status === 'New' || c.status === 'Under Investigation');

  const highPriorityCount = highPriorityBuildings.length + highPriorityRainfall.length + activeCommunityReports.length;

  const priorityOpportunitiesList = [
    ...highPriorityBuildings.map(b => ({
      id: b.id,
      type: 'building' as const,
      title: b.name,
      estimatedWaterLitres: b.estimatedCondensateLitresPerDay,
      opportunityLevel: b.recoveryPotential
    })),
    ...highPriorityRainfall.map(r => ({
      id: r.id,
      type: 'rainfall' as const,
      title: r.areaName,
      estimatedWaterLitres: r.estimatedRunoffLitres,
      opportunityLevel: r.opportunityLevel
    }))
  ];

  const dashboardData: DashboardSummary = {
    isPrototypeData: true,
    disclaimer: 'Prototype / Demonstration Data for WAHA Water Resource Intelligence Platform',
    buildingsAnalyzed: mockBuildings.length,
    estimatedDailyRecoveryLitres: totalEstimatedDailyRecoveryLitres,
    rainfallOpportunityZones: mockRainfallOpportunities.length,
    communityReports: mockCommunityReports.length,
    totalOpportunities: mockBuildings.length + mockRainfallOpportunities.length + mockCommunityReports.length,
    highPriorityOpportunities: highPriorityCount,
    byType: {
      buildings: mockBuildings.length,
      rainfall: mockRainfallOpportunities.length,
      community: mockCommunityReports.length
    },
    priorityOpportunities: priorityOpportunitiesList
  };

  return res.status(200).json(dashboardData);
});

export default router;
