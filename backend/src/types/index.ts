export type OpportunityLevel = 'High' | 'Medium' | 'Low';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export type CommunityReportStatus = 
  | 'New'
  | 'Under Investigation'
  | 'Validated'
  | 'Already Covered'
  | 'Insufficient Data';

export type MapOpportunityType = 'building' | 'rainfall' | 'community';

export interface BuildingOpportunity {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  buildingType: string;
  acUnits: number;
  averageOperatingHours: number;
  existingCondensateDrainage: boolean;
  landscaping: boolean;
  estimatedCondensateLitresPerDay: number;
  estimatedAnnualLitres: number;
  potentialUses: string[];
  recoveryPotential: OpportunityLevel;
  confidence: ConfidenceLevel;
  assumptions: string[];
  createdAt: string;
}

export interface BuildingAnalysisInput {
  name: string;
  latitude: number;
  longitude: number;
  buildingType?: string;
  acUnits: number;
  averageOperatingHours: number;
  existingCondensateDrainage?: boolean;
  landscaping?: boolean;
}

export interface BuildingAnalysisResult {
  building: {
    name: string;
    latitude: number;
    longitude: number;
  };
  estimatedCondensateLitresPerDay: number;
  estimatedAnnualLitres: number;
  potentialUses: string[];
  recoveryPotential: OpportunityLevel;
  confidence: ConfidenceLevel;
  assumptions: string[];
}

export interface RainfallOpportunity {
  id: string;
  latitude: number;
  longitude: number;
  areaName: string;
  rainfallEvent: string;
  rainfallMm: number;
  catchmentAreaM2: number;
  runoffCoefficient: number;
  estimatedRunoffLitres: number;
  opportunityLevel: OpportunityLevel;
  confidence: ConfidenceLevel;
  status: string;
  createdAt: string;
}

export interface RainfallAnalysisInput {
  latitude: number;
  longitude: number;
  rainfallMm: number;
  catchmentAreaM2: number;
  runoffCoefficient: number;
}

export interface RainfallAnalysisResult {
  estimatedRunoffLitres: number;
  opportunityLevel: OpportunityLevel;
  confidence: ConfidenceLevel;
  notes: string[];
}

export interface CommunityReport {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  description: string;
  photoUrl: string | null;
  timestamp: string;
  status: CommunityReportStatus;
}

export interface CommunityReportInput {
  latitude: number;
  longitude: number;
  type: string;
  description: string;
  photoUrl?: string | null;
}

export interface MapOpportunity {
  id: string;
  type: MapOpportunityType;
  latitude: number;
  longitude: number;
  title: string;
  estimatedWaterLitres?: number;
  opportunityLevel?: OpportunityLevel;
  confidence?: ConfidenceLevel;
  status?: string;
  description?: string;
}

export interface DashboardSummary {
  isPrototypeData: boolean;
  disclaimer: string;
  buildingsAnalyzed: number;
  estimatedDailyRecoveryLitres: number;
  rainfallOpportunityZones: number;
  communityReports: number;
  totalOpportunities: number;
  highPriorityOpportunities: number;
  byType: {
    buildings: number;
    rainfall: number;
    community: number;
  };
  priorityOpportunities: Array<{
    id: string;
    type: MapOpportunityType;
    title: string;
    estimatedWaterLitres?: number;
    opportunityLevel?: OpportunityLevel;
  }>;
}

export interface ApiErrorResponse {
  error: string;
  details?: string[];
}
