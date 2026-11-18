import { Router, Request, Response } from 'express';
import { mockCommunityReports } from '../data/community';
import { validateCommunityInput } from '../utils/validation';
import { CommunityReport } from '../types';

const router = Router();

/**
 * POST /api/community/reports
 * Submits a new community water observation report.
 */
router.post('/reports', (req: Request, res: Response) => {
  const validation = validateCommunityInput(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Invalid community report input',
      details: validation.errors
    });
  }

  const { latitude, longitude, type, description, photoUrl } = req.body;

  const newId = `CR-${String(mockCommunityReports.length + 1).padStart(3, '0')}`;
  const newReport: CommunityReport = {
    id: newId,
    latitude: Number(latitude),
    longitude: Number(longitude),
    type: type.trim(),
    description: description.trim(),
    photoUrl: photoUrl || null,
    timestamp: new Date().toISOString(),
    status: 'New'
  };

  mockCommunityReports.unshift(newReport);

  return res.status(201).json({
    id: newReport.id,
    status: newReport.status,
    message: 'Community observation submitted successfully.',
    report: newReport
  });
});

/**
 * GET /api/community/reports
 * Returns all submitted and mock community reports.
 */
router.get('/reports', (_req: Request, res: Response) => {
  return res.status(200).json({
    count: mockCommunityReports.length,
    reports: mockCommunityReports
  });
});

export default router;
