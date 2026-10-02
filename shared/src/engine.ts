import * as turf from '@turf/turf';
import { DEFAULT_ASSUMPTIONS, LITRES_PER_US_GALLON, rangeOf, type Assumptions } from './assumptions';
import { ABU_DHABI_CLIMATE, type Climate } from './climate';
import { isOpen } from './reports';
import type {
  Building, BuildingInput, CatchmentSource, Community, CondensateEstimate, CondensateMethod, Confidence,
  ConfidenceLevel, Impact, OpportunityScore, RainfallEstimate, Range, Report, ReportKind, ReportStatus, RunoffEstimate,
  ScorePart, Surface,
} from './types';

/* ---------------------------------------------------------------- ranges + confidence */

/**
 * Nudge each uncertain input to its low and high while holding the rest at mid, then add the
 * swings in quadrature (root-sum-square). Stacking every worst case at once would give silly ranges.
 */
export function rangeFromSensitivity<K extends string>(model: (v: Record<K, number>) => number, inputs: Record<K, Range>): Range {
  const keys = Object.keys(inputs) as K[];
  const mids = Object.fromEntries(keys.map((k) => [k, inputs[k].mid])) as Record<K, number>;
  const mid = model(mids);
  let down = 0;
  let up = 0;
  for (const k of keys) {
    const a = model({ ...mids, [k]: inputs[k].low }) - mid;
    const b = model({ ...mids, [k]: inputs[k].high }) - mid;
    down += Math.min(a, b, 0) ** 2;
    up += Math.max(a, b, 0) ** 2;
  }
  return { low: Math.max(0, mid - Math.sqrt(down)), mid, high: mid + Math.sqrt(up) };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const scaleRange = (r: Range, k: number): Range => ({ low: r.low * k, mid: r.mid * k, high: r.high * k });
const sumRanges = (rs: Range[]): Range =>
  rs.reduce((s, r) => ({ low: s.low + r.low, mid: s.mid + r.mid, high: s.high + r.high }), { low: 0, mid: 0, high: 0 });

type Factor = { score: number; reason: string };

/** Confidence is the plain average of its factors, so every reason pulls its weight visibly. */
export function toConfidence(factors: Factor[], a: Assumptions = DEFAULT_ASSUMPTIONS): Confidence {
  const score = factors.length ? factors.reduce((s, f) => s + clamp01(f.score), 0) / factors.length : 0;
  const level: ConfidenceLevel =
    score >= a['confidence.highAt'].value ? 'high' : score >= a['confidence.mediumAt'].value ? 'medium' : 'low';
  return { level, score: Math.round(score * 100) / 100, reasons: factors.map((f) => f.reason) };
}

function spreadFactor(r: Range): Factor {
  const width = r.mid > 0 ? (r.high - r.low) / r.mid : 2;
  return { score: 1 - width / 2, reason: `Low to high spans ${Math.round(width * 100)}% of the likely value` };
}

/* ---------------------------------------------------------------- psychrometrics */

/** Saturation vapour pressure over water, kPa. Magnus form, Alduchov & Eskridge (1996): within 0.4% from -40 to 50 °C. */
export const satPressureKPa = (tC: number) => 0.61094 * Math.exp((17.625 * tC) / (tC + 243.04));

/** Humidity ratio W, kg of water per kg of dry air. ASHRAE Fundamentals ch. 1, eq. 20 and 22. */
export function humidityRatio(tC: number, rhPct: number, pressureKPa: number): number {
  const pv = (rhPct / 100) * satPressureKPa(tC);
  return (0.621945 * pv) / (pressureKPa - pv);
}

/** Dew point from temperature and RH, by inverting the same Magnus form. */
export function dewPointC(tC: number, rhPct: number): number {
  const g = Math.log(rhPct / 100) + (17.625 * tC) / (243.04 + tC);
  return (243.04 * g) / (17.625 - g);
}

/* ---------------------------------------------------------------- condensate */

type QuickKey = 'hours' | 'days' | 'm2PerTon' | 'rate' | 'loadFactor' | 'balance';
type EngKey = 'hours' | 'days' | 'oa' | 'oaDelivered' | 'coilDp' | 'density' | 'pressure';

function quickInputs(b: BuildingInput, a: Assumptions): Record<QuickKey, Range> {
  return {
    hours: rangeOf(a[`profile.${b.type}.hours`]),
    days: rangeOf(a[`profile.${b.type}.days`]),
    m2PerTon: rangeOf(a[`profile.${b.type}.m2PerTon`]),
    rate: rangeOf(a['condensate.galPerTonHour']),
    loadFactor: rangeOf(a['condensate.peakLoadFactor']),
    balance: rangeOf(a['condensate.balancePointC']),
  };
}

function engInputs(b: BuildingInput, a: Assumptions): Record<EngKey, Range> {
  return {
    hours: rangeOf(a[`profile.${b.type}.hours`]),
    days: rangeOf(a[`profile.${b.type}.days`]),
    oa: rangeOf(a[`profile.${b.type}.oa`]),
    oaDelivered: rangeOf(a['condensate.oaDelivered']),
    coilDp: rangeOf(a['condensate.coilDewPointC']),
    density: rangeOf(a['psychro.airDensity']),
    pressure: rangeOf(a['psychro.pressureKPa']),
  };
}

/** Guz (2005): litres = tons × gal per ton-hour × load factor × hours. Load eases off in cooler months. */
function quickMonth(v: Record<QuickKey, number>, b: BuildingInput, c: Climate, i: number): number {
  const mo = c.months[i];
  const tPeak = Math.max(...c.months.map((x) => x.tMean));
  const seasonal = clamp01((mo.tMean - v.balance) / (tPeak - v.balance));
  const tons = b.floorAreaM2 / v.m2PerTon;
  return tons * v.rate * LITRES_PER_US_GALLON * v.loadFactor * seasonal * v.hours * mo.days * (v.days / 7);
}

/**
 * Psychrometric method: the water a coil pulls out of fresh air is the drop in humidity ratio
 * between outdoor air and coil-leaving air, times the mass of air. 1 kg of water is about 1 L.
 */
function engMonth(v: Record<EngKey, number>, b: BuildingInput, c: Climate, i: number): number {
  const mo = c.months[i];
  const wOut = humidityRatio(mo.tMean, mo.rh, v.pressure);
  const wCoil = humidityRatio(v.coilDp, 100, v.pressure);
  const airKgPerS = v.density * ((b.floorAreaM2 * v.oa) / 1000) * v.oaDelivered;
  return airKgPerS * Math.max(0, wOut - wCoil) * 3600 * v.hours * mo.days * (v.days / 7);
}

const FORMULAS: Record<CondensateMethod, string> = {
  quick: 'Litres = (floor area ÷ m² per ton) × gal per ton-hour × 3.785 × load factor × hours running',
  engineering: 'Litres = air density × fresh air flow × (outdoor humidity ratio − coil humidity ratio) × seconds running',
};

function condensateCore(b: BuildingInput, method: CondensateMethod, a: Assumptions, c: Climate) {
  const months = c.months.map((_, i) => i);
  if (method === 'quick') {
    const inputs = quickInputs(b, a);
    return {
      monthly: months.map((i) => rangeFromSensitivity((v) => quickMonth(v, b, c, i), inputs)),
      annual: rangeFromSensitivity((v) => months.reduce((s, i) => s + quickMonth(v, b, c, i), 0), inputs),
    };
  }
  const inputs = engInputs(b, a);
  return {
    monthly: months.map((i) => rangeFromSensitivity((v) => engMonth(v, b, c, i), inputs)),
    annual: rangeFromSensitivity((v) => months.reduce((s, i) => s + engMonth(v, b, c, i), 0), inputs),
  };
}

export function estimateCondensate(
  b: BuildingInput,
  method: CondensateMethod,
  a: Assumptions = DEFAULT_ASSUMPTIONS,
  c: Climate = ABU_DHABI_CLIMATE,
): CondensateEstimate {
  const { monthly, annual } = condensateCore(b, method, a, c);
  const other = condensateCore(b, method === 'quick' ? 'engineering' : 'quick', a, c).annual.mid;

  const ratio = Math.max(annual.mid, other) / Math.max(1e-9, Math.min(annual.mid, other));
  const agree = a['confidence.agreeWithin'].value;
  const factors: Factor[] = [
    b.floorAreaSource === 'documented'
      ? { score: 1, reason: 'Floor area is a known figure, not an estimate' }
      : { score: a['confidence.estimatedArea'].value, reason: 'Floor area is estimated from footprint × floors' },
    method === 'engineering'
      ? { score: a['confidence.engineeringMethod'].value, reason: 'Psychrometric method, built on Abu Dhabi humidity normals' }
      : { score: a['confidence.quickMethod'].value, reason: 'Rule-of-thumb method (Guz 2005)' },
    spreadFactor(annual),
    {
      score: ratio <= agree ? 1 : agree / ratio,
      reason: `The two methods ${ratio <= agree ? 'agree' : 'differ'}: ${ratio.toFixed(1)}× apart`,
    },
  ];
  if (b.type === 'industrial') {
    factors.push({ score: a['confidence.maybeUnconditioned'].value, reason: 'Industrial units are often only partly air-conditioned' });
  }

  return {
    method,
    formula: FORMULAS[method],
    annualL: annual,
    dailyL: scaleRange(annual, 1 / 365),
    monthlyL: monthly.map((r, i) => ({ month: c.months[i].month, ...r })),
    confidence: toConfidence(factors, a),
  };
}

/* ---------------------------------------------------------------- rainfall */

export type CatchmentInput = { areaM2: number; surface: Surface; areaSource: CatchmentSource };

/** V = P × A × C. 1 mm of rain on 1 m² is exactly 1 litre. */
export function estimateRainfall(
  { areaM2, surface, areaSource }: CatchmentInput,
  a: Assumptions = DEFAULT_ASSUMPTIONS,
  c: Climate = ABU_DHABI_CLIMATE,
): RainfallEstimate {
  const inputs = { year: rangeOf(a['rain.yearFactor']), runoff: rangeOf(a[`rain.c.${surface}`]) };
  const month = (v: Record<'year' | 'runoff', number>, i: number) => c.months[i].rainMm * v.year * areaM2 * v.runoff;
  const annual = rangeFromSensitivity((v) => c.months.reduce((s, _, i) => s + month(v, i), 0), inputs);
  const total = c.months.reduce((s, m) => s + m.rainMm, 0);
  const capturable = rangeFromSensitivity(
    (v) => total * v.year * areaM2 * v.runoff * v.capture,
    { ...inputs, capture: rangeOf(a['rain.captureEfficiency']) },
  );

  return {
    formula: 'Litres = rainfall (mm) × catchment area (m²) × runoff coefficient',
    annualL: annual,
    capturableL: capturable,
    monthlyL: c.months.map((mo, i) => ({ month: mo.month, ...rangeFromSensitivity((v) => month(v, i), inputs) })),
    confidence: toConfidence([areaFactor(areaSource, a), spreadFactor(annual)], a),
  };
}

function areaFactor(areaSource: CatchmentSource, a: Assumptions): Factor {
  return areaSource === 'documented'
    ? { score: 1, reason: 'Catchment area is a known figure' }
    : { score: a['confidence.mappedArea'].value, reason: areaSource === 'drawn' ? 'Catchment drawn on the map' : 'Outline traced from OpenStreetMap' };
}

/** One storm or one year of rain on a catchment: V = P × A × C, then the share you could keep. */
export function estimateRunoff(
  { areaM2, surface, areaSource }: CatchmentInput,
  depthMm: number,
  a: Assumptions = DEFAULT_ASSUMPTIONS,
): RunoffEstimate {
  const runoff = rangeOf(a[`rain.c.${surface}`]);
  const capture = rangeOf(a['rain.captureEfficiency']);
  const runoffL = rangeFromSensitivity((v) => depthMm * areaM2 * v.runoff, { runoff });
  const capturableL = rangeFromSensitivity((v) => depthMm * areaM2 * v.runoff * v.capture, { runoff, capture });
  return {
    formula: 'Litres = rain depth (mm) × area (m²) × runoff coefficient × capture share',
    depthMm,
    runoffL,
    capturableL,
    confidence: toConfidence([areaFactor(areaSource, a), spreadFactor(capturableL)], a),
  };
}

/* ---------------------------------------------------------------- opportunity score */

/** Where x sits between floor and ref on a log scale, 0 to 1. */
const logNorm = (x: number, floor: number, ref: number) =>
  clamp01((Math.log10(Math.max(x, floor)) - Math.log10(floor)) / (Math.log10(ref) - Math.log10(floor)));
const flat = (x: number): Range => ({ low: x, mid: x, high: x });

export function reportsNear(lat: number, lng: number, reports: Report[], radiusKm: number): Report[] {
  const here = turf.point([lng, lat]);
  return reports.filter((r) => isOpen(r.status) && turf.distance(here, turf.point([r.lng, r.lat])) <= radiusKm);
}

export type ScoreInput = { condensateL: Range; rainfallL: Range; openReportsNearby: number; confidence: Confidence };

/** 0-100. Volumes are log-scaled so a bakery still registers next to a mega-mall. */
export function scoreOpportunity(input: ScoreInput, a: Assumptions = DEFAULT_ASSUMPTIONS): OpportunityScore {
  const cRef = a['score.condensateRefL'].value;
  const rRef = a['score.rainRefL'].value;
  const floor = a['score.floorL'].value;
  const parts: ScorePart[] = [
    {
      key: 'condensate', label: 'Condensate volume', weight: a['score.wCondensate'].value,
      value: { low: logNorm(input.condensateL.low, floor, cRef), mid: logNorm(input.condensateL.mid, floor, cRef), high: logNorm(input.condensateL.high, floor, cRef) },
    },
    {
      key: 'rain', label: 'Rainfall volume', weight: a['score.wRain'].value,
      value: { low: logNorm(input.rainfallL.low, floor, rRef), mid: logNorm(input.rainfallL.mid, floor, rRef), high: logNorm(input.rainfallL.high, floor, rRef) },
    },
    {
      key: 'demand', label: 'Open reports nearby', weight: a['score.wDemand'].value,
      value: flat(clamp01(input.openReportsNearby / a['score.demandRef'].value)),
    },
    { key: 'confidence', label: 'Data confidence', weight: a['score.wConfidence'].value, value: flat(input.confidence.score) },
  ];
  const total = parts.reduce((s, p) => s + p.weight, 0) || 1;
  const at = (k: keyof Range) => Math.round((100 * parts.reduce((s, p) => s + p.weight * p.value[k], 0)) / total);
  return { score: { low: at('low'), mid: at('mid'), high: at('high') }, parts, confidence: input.confidence };
}

/* ---------------------------------------------------------------- one building, everything */

export type BuildingAnalysis = {
  building: Building;
  quick: CondensateEstimate;
  engineering: CondensateEstimate;
  rainfall: RainfallEstimate;
  openReportsNearby: number;
  score: OpportunityScore;
};

export function analyzeBuilding(
  b: Building,
  reports: Report[] = [],
  a: Assumptions = DEFAULT_ASSUMPTIONS,
  c: Climate = ABU_DHABI_CLIMATE,
): BuildingAnalysis {
  const quick = estimateCondensate(b, 'quick', a, c);
  const engineering = estimateCondensate(b, 'engineering', a, c);
  const rainfall = estimateRainfall({ areaM2: b.roofAreaM2, surface: 'roofConcrete', areaSource: 'mapped' }, a, c);
  const openReportsNearby = reportsNear(b.lat, b.lng, reports, a['community.radiusKm'].value).length;
  const score = scoreOpportunity(
    { condensateL: engineering.annualL, rainfallL: rainfall.annualL, openReportsNearby, confidence: engineering.confidence },
    a,
  );
  return { building: b, quick, engineering, rainfall, openReportsNearby, score };
}

/* ---------------------------------------------------------------- communities */

/**
 * Groups buildings and open reports that sit close together, using DBSCAN (turf.clustersDbscan).
 * Rejected reports are left out. Points with no neighbours are noise and don't form a community.
 */
export function findCommunities(
  buildings: Building[],
  reports: Report[],
  a: Assumptions = DEFAULT_ASSUMPTIONS,
  c: Climate = ABU_DHABI_CLIMATE,
): Community[] {
  type Props = { kind: 'building' | 'report'; id: string };
  const points = turf.featureCollection<GeoJSON.Point, Props>([
    ...buildings.map((b) => turf.point<Props>([b.lng, b.lat], { kind: 'building', id: b.id })),
    ...reports.filter((r) => r.status !== 'rejected').map((r) => turf.point<Props>([r.lng, r.lat], { kind: 'report', id: r.id })),
  ]);
  const clustered = turf.clustersDbscan(points, a['community.radiusKm'].value, {
    units: 'kilometers',
    minPoints: a['community.minPoints'].value,
  });

  const groups = new Map<number, typeof clustered.features>();
  for (const f of clustered.features) {
    if (f.properties.cluster === undefined) continue;
    groups.set(f.properties.cluster, [...(groups.get(f.properties.cluster) ?? []), f]);
  }

  const byId = new Map(buildings.map((b) => [b.id, b]));
  const reportById = new Map(reports.map((r) => [r.id, r]));

  return [...groups.entries()].map(([cluster, features]) => {
    const fc = turf.featureCollection(features);
    const [lng, lat] = turf.centroid(fc).geometry.coordinates;
    const hull = features.length >= 3 ? turf.convex(fc) : null;
    const members = features.filter((f) => f.properties.kind === 'building').map((f) => byId.get(f.properties.id)!);
    const reportIds = features.filter((f) => f.properties.kind === 'report').map((f) => f.properties.id);

    const engs = members.map((b) => estimateCondensate(b, 'engineering', a, c));
    const rains = members.map((b) => estimateRainfall({ areaM2: b.roofAreaM2, surface: 'roofConcrete', areaSource: 'mapped' }, a, c));

    const here = turf.point([lng, lat]);
    const anchor = [...members].sort(
      (x, y) => turf.distance(here, turf.point([x.lng, x.lat])) - turf.distance(here, turf.point([y.lng, y.lat])),
    )[0];

    const confidence = toConfidence(
      engs.length
        ? [{
            score: engs.reduce((s, e) => s + e.confidence.score, 0) / engs.length,
            reason: `Average of ${engs.length} building estimate${engs.length > 1 ? 's' : ''}`,
          }]
        : [{ score: 0, reason: 'Reports only, no mapped buildings in this group yet' }],
      a,
    );

    return {
      id: `community-${cluster}`,
      name: anchor ? `Around ${anchor.name}` : 'Report hotspot',
      centroid: { lat, lng },
      hull: (hull?.geometry.coordinates[0] as [number, number][] | undefined) ?? null,
      buildingIds: members.map((b) => b.id),
      reportIds,
      condensateL: sumRanges(engs.map((e) => e.annualL)),
      rainfallL: sumRanges(rains.map((r) => r.annualL)),
      openReports: reportIds.filter((id) => isOpen(reportById.get(id)!.status)).length,
      confidence,
    };
  });
}

/* ---------------------------------------------------------------- impact */

/** Water you don't have to desalinate is electricity you don't burn, and CO₂ you don't emit. */
export function impactOf(litresPerYear: Range, a: Assumptions = DEFAULT_ASSUMPTIONS): Impact {
  const inputs = { litres: litresPerYear, kwh: rangeOf(a['impact.desalKWhPerM3']), grid: rangeOf(a['impact.gridKgCO2PerKWh']) };
  return {
    energyKWh: rangeFromSensitivity((v) => (v.litres / 1000) * v.kwh, { litres: inputs.litres, kwh: inputs.kwh }),
    co2Kg: rangeFromSensitivity((v) => (v.litres / 1000) * v.kwh * v.grid, inputs),
  };
}

/* ---------------------------------------------------------------- totals */

export type CityTotals = {
  buildings: number;
  condensateL: Range;
  rainCapturableL: Range;
  totalL: Range;
  monthly: { month: string; condensateL: number; rainL: number }[];
  impact: Impact;
};

/**
 * Adds up building analyses. Summing low with low and high with high is deliberately cautious:
 * it assumes every building errs the same way, so the band is wider than it strictly needs to be.
 */
export function cityTotals(analyses: BuildingAnalysis[], a: Assumptions = DEFAULT_ASSUMPTIONS, c: Climate = ABU_DHABI_CLIMATE): CityTotals {
  const condensateL = sumRanges(analyses.map((x) => x.engineering.annualL));
  const rainCapturableL = sumRanges(analyses.map((x) => x.rainfall.capturableL));
  const totalL = sumRanges([condensateL, rainCapturableL]);
  const keep = a['rain.captureEfficiency'].value;
  return {
    buildings: analyses.length,
    condensateL,
    rainCapturableL,
    totalL,
    monthly: c.months.map((m, i) => ({
      month: m.month,
      condensateL: analyses.reduce((s, x) => s + x.engineering.monthlyL[i].mid, 0),
      rainL: analyses.reduce((s, x) => s + x.rainfall.monthlyL[i].mid * keep, 0),
    })),
    impact: impactOf(totalL, a),
  };
}

export type ReportStats = {
  total: number;
  open: number;
  byStatus: Record<ReportStatus, number>;
  byKind: Record<ReportKind, number>;
  last30Days: number;
};

export function reportStats(reports: Report[], now: Date = new Date()): ReportStats {
  const byStatus = { submitted: 0, review: 0, investigating: 0, verified: 0, resolved: 0, rejected: 0 };
  const byKind = { condensate: 0, rainfall: 0, leak: 0 };
  const cutoff = now.getTime() - 30 * 86_400_000;
  for (const r of reports) {
    byStatus[r.status]++;
    byKind[r.kind]++;
  }
  return {
    total: reports.length,
    open: reports.filter((r) => isOpen(r.status)).length,
    byStatus,
    byKind,
    last30Days: reports.filter((r) => Date.parse(r.createdAt) >= cutoff).length,
  };
}

/** The closest building within `maxKm`, so a new report can be tied to it. */
export function nearestBuilding(lat: number, lng: number, buildings: Building[], maxKm: number): Building | undefined {
  const here = turf.point([lng, lat]);
  let best: Building | undefined;
  let bestKm = maxKm;
  for (const b of buildings) {
    const km = turf.distance(here, turf.point([b.lng, b.lat]));
    if (km <= bestKm) {
      best = b;
      bestKm = km;
    }
  }
  return best;
}

/* ---------------------------------------------------------------- geometry helpers */

export { sumRanges };

/** Area of a [lng, lat] ring in m², via turf. */
export function polygonAreaM2(ring: [number, number][]): number {
  const closed = ring[0][0] === ring.at(-1)![0] && ring[0][1] === ring.at(-1)![1] ? ring : [...ring, ring[0]];
  return turf.area(turf.polygon([closed]));
}

/** Rain reports tied to a zone: linked to its building, or dropped inside its outline. */
export function rainReportsIn(zone: { ring: [number, number][]; buildingId?: string }, reports: Report[]): Report[] {
  const poly = turf.polygon([zone.ring]);
  return reports.filter((r) => r.kind === 'rainfall' && r.status !== 'rejected'
    && ((zone.buildingId && r.buildingId === zone.buildingId) || turf.booleanPointInPolygon(turf.point([r.lng, r.lat]), poly)));
}
