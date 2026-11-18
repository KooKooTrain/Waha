import { RainfallOpportunity } from '../types';

export const mockRainfallOpportunities: RainfallOpportunity[] = [
  {
    id: 'R-012',
    latitude: 24.4200,
    longitude: 54.4500,
    areaName: 'Khalifa City Storm Runoff Catchment',
    rainfallEvent: 'Moderate Winter Downpour (18.4 mm)',
    rainfallMm: 18.4,
    catchmentAreaM2: 2500,
    runoffCoefficient: 0.8,
    estimatedRunoffLitres: 36800,
    opportunityLevel: 'High',
    confidence: 'Medium',
    status: 'Investigation Pending',
    createdAt: new Date('2026-09-10T12:00:00Z').toISOString()
  },
  {
    id: 'R-025',
    latitude: 24.4300,
    longitude: 54.6150,
    areaName: 'Masdar Eco Plaza Catchment Basin',
    rainfallEvent: 'Flash Storm Event (25.0 mm)',
    rainfallMm: 25.0,
    catchmentAreaM2: 4000,
    runoffCoefficient: 0.85,
    estimatedRunoffLitres: 85000,
    opportunityLevel: 'High',
    confidence: 'High',
    status: 'Permeable Storage Ready',
    createdAt: new Date('2026-09-12T15:30:00Z').toISOString()
  },
  {
    id: 'R-038',
    latitude: 24.5200,
    longitude: 54.3700,
    areaName: 'Zayed Port Pervious Apron Zone',
    rainfallEvent: 'Light Rain Event (10.0 mm)',
    rainfallMm: 10.0,
    catchmentAreaM2: 6000,
    runoffCoefficient: 0.75,
    estimatedRunoffLitres: 45000,
    opportunityLevel: 'High',
    confidence: 'Medium',
    status: 'Under Assessment',
    createdAt: new Date('2026-09-14T09:10:00Z').toISOString()
  },
  {
    id: 'R-044',
    latitude: 24.5300,
    longitude: 54.4300,
    areaName: 'Saadiyat Promenade Catchment',
    rainfallEvent: 'Seasonal Shower (12.5 mm)',
    rainfallMm: 12.5,
    catchmentAreaM2: 1800,
    runoffCoefficient: 0.70,
    estimatedRunoffLitres: 15750,
    opportunityLevel: 'Medium',
    confidence: 'Medium',
    status: 'Conceptual',
    createdAt: new Date('2026-09-19T14:20:00Z').toISOString()
  },
  {
    id: 'R-051',
    latitude: 24.4600,
    longitude: 54.3800,
    areaName: 'Al Mushrif Park Retention Zone',
    rainfallEvent: 'Heavy Convective Rain (32.0 mm)',
    rainfallMm: 32.0,
    catchmentAreaM2: 5000,
    runoffCoefficient: 0.90,
    estimatedRunoffLitres: 144000,
    opportunityLevel: 'High',
    confidence: 'High',
    status: 'High Priority Diverter',
    createdAt: new Date('2026-09-24T16:45:00Z').toISOString()
  }
];
