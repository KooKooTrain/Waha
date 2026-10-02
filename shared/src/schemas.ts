import { z } from 'zod';
import { DEFAULT_ASSUMPTIONS, type AssumptionOverrides } from './assumptions';
import { BUILDING_TYPES, REPORT_STATUSES } from './types';

/** Validation for everything that crosses into the server. The client uses the same rules on its forms. */

const ROLES = ['citizen', 'owner', 'authority'] as const;

/** Abu Dhabi City, Mussafah and MBZ, with a margin. Reports outside this box are out of scope. */
export const AREA_BOUNDS = { south: 24.2, north: 24.65, west: 54.2, east: 54.8 };

const lat = z.number().min(AREA_BOUNDS.south).max(AREA_BOUNDS.north);
const lng = z.number().min(AREA_BOUNDS.west).max(AREA_BOUNDS.east);

export const ReportInputSchema = z.object({
  kind: z.enum(['condensate', 'rainfall', 'leak']),
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().min(10).max(280),
  lat,
  lng,
  reporter: z.enum(ROLES),
});

export const StatusChangeSchema = z.object({
  to: z.enum(REPORT_STATUSES),
  note: z.string().trim().max(280).optional(),
  by: z.enum(ROLES),
});

const edit = z.object({
  value: z.number().finite().nonnegative(),
  low: z.number().finite().nonnegative().optional(),
  high: z.number().finite().nonnegative().optional(),
});

/** Only known assumption keys get through; anything else is dropped. */
export const OverridesSchema = z
  .record(z.string(), edit)
  .default({})
  .transform((o) => Object.fromEntries(Object.entries(o).filter(([k]) => k in DEFAULT_ASSUMPTIONS)) as AssumptionOverrides);

export const BuildingSchema = z.object({
  id: z.string().max(80),
  name: z.string().trim().max(120),
  type: z.enum(BUILDING_TYPES),
  district: z.enum(['Abu Dhabi City', 'Mussafah & MBZ']),
  lat,
  lng,
  roofAreaM2: z.number().finite().nonnegative().max(5_000_000),
  floors: z.number().int().positive().max(200).optional(),
  floorAreaM2: z.number().finite().positive().max(5_000_000),
  floorAreaSource: z.enum(['documented', 'estimated']),
  floorAreaNote: z.string().max(300),
  sources: z.array(z.object({ label: z.string().max(80), url: z.string().url().max(300) })).max(10),
});

export const CatchmentSchema = z.object({
  areaM2: z.number().finite().positive().max(50_000_000),
  surface: z.enum(['roofConcrete', 'roofMetal', 'paved', 'landscape']),
  areaSource: z.enum(['mapped', 'drawn', 'documented']),
});

/** Mussafah and MBZ sit south of about 24.40° N; the island and the rest of the city sit north of it. */
export const districtOf = (lat: number) => (lat < 24.4 ? 'Mussafah & MBZ' : 'Abu Dhabi City') as 'Mussafah & MBZ' | 'Abu Dhabi City';
