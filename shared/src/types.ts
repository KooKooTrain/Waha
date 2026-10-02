export type Range = { low: number; mid: number; high: number };

export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type Confidence = { level: ConfidenceLevel; score: number; reasons: string[] };

export type Source = { label: string; url: string };

export const BUILDING_TYPES = [
  'office', 'residential', 'hotel', 'mall', 'mosque', 'hospital', 'school', 'industrial', 'civic',
] as const;
export type BuildingType = (typeof BUILDING_TYPES)[number];

export type District = 'Abu Dhabi City' | 'Mussafah & MBZ';

/** Where a floor area figure came from. Documented beats estimated, and confidence knows it. */
export type AreaSource = 'documented' | 'estimated';

export type Building = {
  id: string;
  name: string;
  type: BuildingType;
  district: District;
  lat: number;
  lng: number;
  /** Footprint from OpenStreetMap, measured with turf.area. Doubles as the rain catchment. */
  roofAreaM2: number;
  floors?: number;
  floorAreaM2: number;
  floorAreaSource: AreaSource;
  floorAreaNote: string;
  sources: Source[];
};

/** The minimum the engine needs, so a user can run their own building through it too. */
export type BuildingInput = Pick<Building, 'type' | 'floorAreaM2' | 'floorAreaSource'>;

export type Role = 'citizen' | 'owner' | 'authority';

export const REPORT_STATUSES = [
  'submitted', 'review', 'investigating', 'verified', 'resolved', 'rejected',
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type ReportKind = 'condensate' | 'rainfall' | 'leak';

export type StatusEvent = { status: ReportStatus; at: string; by: Role; note?: string };

export type Report = {
  id: string;
  kind: ReportKind;
  title: string;
  description: string;
  lat: number;
  lng: number;
  buildingId?: string;
  status: ReportStatus;
  createdAt: string;
  reporter: Role;
  history: StatusEvent[];
  /** Seeded demo data, not a real submission. */
  sample?: boolean;
};

export type MonthlyRange = Range & { month: string };

export type CondensateMethod = 'quick' | 'engineering';

export type CondensateEstimate = {
  method: CondensateMethod;
  formula: string;
  annualL: Range;
  dailyL: Range;
  monthlyL: MonthlyRange[];
  confidence: Confidence;
};

export type Surface = 'roofConcrete' | 'roofMetal' | 'paved' | 'landscape';
export type CatchmentSource = 'mapped' | 'drawn' | 'documented';

export type RainfallEstimate = {
  formula: string;
  annualL: Range;
  monthlyL: MonthlyRange[];
  confidence: Confidence;
};

export type Community = {
  id: string;
  name: string;
  centroid: { lat: number; lng: number };
  /** Convex hull ring as [lng, lat] pairs, or null when the cluster is too thin for one. */
  hull: [number, number][] | null;
  buildingIds: string[];
  reportIds: string[];
  condensateL: Range;
  rainfallL: Range;
  openReports: number;
  confidence: Confidence;
};

export type ScorePart = { key: string; label: string; weight: number; value: Range };

export type OpportunityScore = {
  score: Range;
  parts: ScorePart[];
  confidence: Confidence;
};
