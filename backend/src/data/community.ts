import { CommunityReport } from '../types';

export const mockCommunityReports: CommunityReport[] = [
  {
    id: 'CR-001',
    latitude: 24.4700,
    longitude: 54.3900,
    type: 'Water accumulation',
    description: 'Significant rainwater pooling in depressed roadway lot near Sultan Bin Zayed St after rainfall',
    photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=600&q=80',
    timestamp: new Date('2026-09-26T07:30:00Z').toISOString(),
    status: 'Under Investigation'
  },
  {
    id: 'CR-002',
    latitude: 24.4680,
    longitude: 54.3520,
    type: 'AC Condensate Waste',
    description: 'Commercial cooling units discharging clear condensate onto pavement near Al Khalidiyah shopping center',
    photoUrl: null,
    timestamp: new Date('2026-09-27T11:15:00Z').toISOString(),
    status: 'New'
  },
  {
    id: 'CR-003',
    latitude: 24.4450,
    longitude: 54.5200,
    type: 'Unutilized Runoff Zone',
    description: 'Large surface parking area collecting major rainwater runoff without drainage collection inlet',
    photoUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80',
    timestamp: new Date('2026-09-28T14:00:00Z').toISOString(),
    status: 'Validated'
  },
  {
    id: 'CR-004',
    latitude: 24.4900,
    longitude: 54.3600,
    type: 'Storm Drain Overflow',
    description: 'Excess surface runoff bypassing storm drain and overflowing into landscaped median',
    photoUrl: null,
    timestamp: new Date('2026-09-29T16:20:00Z').toISOString(),
    status: 'Already Covered'
  },
  {
    id: 'CR-005',
    latitude: 24.4100,
    longitude: 54.5500,
    type: 'Irrigation Runoff',
    description: 'Continuous water seepage near residential park perimeter',
    photoUrl: null,
    timestamp: new Date('2026-09-30T09:45:00Z').toISOString(),
    status: 'Insufficient Data'
  }
];
