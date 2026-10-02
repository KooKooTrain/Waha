import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSUMPTIONS as A, LITRES_PER_US_GALLON, withOverrides } from './assumptions';
import { ABU_DHABI_CLIMATE as C } from './climate';
import {
  analyzeBuilding, cityTotals, dewPointC, estimateCondensate, estimateRainfall, estimateRunoff, findCommunities, humidityRatio,
  impactOf, rangeFromSensitivity, reportStats, satPressureKPa, scoreOpportunity, toConfidence,
} from './engine';
import { changeStatus, createReport, mergeReports, nextStatuses } from './reports';
import { OverridesSchema, ReportInputSchema } from './schemas';
import { BUILDINGS, CAPTURE_ZONES, SAMPLE_REPORTS } from './seed';
import type { Building, BuildingInput, Range } from './types';

const ordered = (r: Range) => r.low >= 0 && r.low <= r.mid && r.mid <= r.high;
const within = (x: number, target: number, pct: number) => Math.abs(x / target - 1) <= pct / 100;
const AUG = 7; // hottest month by mean temperature
const office: BuildingInput = { type: 'office', floorAreaM2: 10_000, floorAreaSource: 'documented' };

describe('psychrometrics', () => {
  it('saturation pressure matches ASHRAE steam tables within 0.5%', () => {
    expect(within(satPressureKPa(20), 2.3392, 0.5)).toBe(true);
    expect(within(satPressureKPa(30), 4.2467, 0.5)).toBe(true);
  });

  it('humidity ratio at 25 °C and 50% RH is about 0.0099 kg/kg', () => {
    expect(within(humidityRatio(25, 50, 101.325), 0.00988, 1)).toBe(true);
  });

  it('dew point is where the same air would be saturated', () => {
    const td = dewPointC(35.9, 54);
    expect(humidityRatio(td, 100, 101.325)).toBeCloseTo(humidityRatio(35.9, 54, 101.325), 9);
  });
});

describe('rainfall: V = P × A × C', () => {
  const r = estimateRainfall({ areaM2: 1000, surface: 'roofConcrete', areaSource: 'mapped' });

  it('mid case is the annual normal × area × runoff coefficient', () => {
    const P = C.months.reduce((s, m) => s + m.rainMm, 0);
    expect(P).toBeCloseTo(50.2, 6);
    expect(r.annualL.mid).toBeCloseTo(P * 1000 * A['rain.c.roofConcrete'].value, 6);
  });

  it('months add up to the year', () => {
    expect(r.monthlyL.reduce((s, m) => s + m.mid, 0)).toBeCloseTo(r.annualL.mid, 6);
  });

  it('returns an ordered range with confidence', () => {
    expect(ordered(r.annualL)).toBe(true);
    expect(['low', 'medium', 'high']).toContain(r.confidence.level);
  });
});

describe('condensate, quick method (Guz 2005)', () => {
  const e = estimateCondensate(office, 'quick');

  it('hottest month matches the formula worked by hand', () => {
    const tons = office.floorAreaM2 / A['profile.office.m2PerTon'].value;
    const expected = tons * A['condensate.galPerTonHour'].value * LITRES_PER_US_GALLON * A['condensate.peakLoadFactor'].value
      * A['profile.office.hours'].value * C.months[AUG].days * (A['profile.office.days'].value / 7);
    expect(e.monthlyL[AUG].mid).toBeCloseTo(expected, 6);
  });

  it('scales linearly with floor area', () => {
    const double = estimateCondensate({ ...office, floorAreaM2: 20_000 }, 'quick');
    expect(double.annualL.mid).toBeCloseTo(2 * e.annualL.mid, 6);
  });
});

describe('condensate, engineering method (psychrometric)', () => {
  const e = estimateCondensate(office, 'engineering');

  it('August matches the formula worked by hand', () => {
    const p = A['psychro.pressureKPa'].value;
    const dW = humidityRatio(C.months[AUG].tMean, C.months[AUG].rh, p) - humidityRatio(A['condensate.coilDewPointC'].value, 100, p);
    const airKgPerS = A['psychro.airDensity'].value * (office.floorAreaM2 * A['profile.office.oa'].value) / 1000;
    const expected = airKgPerS * dW * 3600 * A['profile.office.hours'].value * C.months[AUG].days * (A['profile.office.days'].value / 7);
    expect(e.monthlyL[AUG].mid).toBeCloseTo(expected, 6);
  });

  it('humid August makes far more water than mild January', () => {
    expect(e.monthlyL[AUG].mid).toBeGreaterThan(5 * e.monthlyL[0].mid);
  });

  it('lands near a published Abu Dhabi figure', () => {
    // A 2022 ScienceDirect review ("Condensate as a water source...") cites ~368.64 L/h for a G+15 Abu Dhabi
    // apartment block. We assume 16 floors × 800 m² and only ask for the right ballpark (within 3×).
    const block = estimateCondensate({ type: 'residential', floorAreaM2: 16 * 800, floorAreaSource: 'estimated' }, 'engineering');
    const perHour = block.monthlyL[AUG].mid / (C.months[AUG].days * 24);
    expect(perHour).toBeGreaterThan(368.64 / 3);
    expect(perHour).toBeLessThan(368.64 * 3);
  });
});

describe('ranges and confidence', () => {
  it('root-sum-square range: one uncertain input gives back its own spread', () => {
    const r = rangeFromSensitivity((v) => v.x * v.y, { x: { low: 1, mid: 2, high: 3 }, y: { low: 1, mid: 1, high: 1 } });
    expect(r).toEqual({ low: 1, mid: 2, high: 3 });
  });

  it('every seed building gets ordered ranges, a 0-100 score and a confidence level', () => {
    for (const b of BUILDINGS) {
      const x = analyzeBuilding(b, SAMPLE_REPORTS);
      for (const r of [x.quick.annualL, x.engineering.annualL, x.rainfall.annualL, x.score.score]) expect(ordered(r), b.id).toBe(true);
      expect(x.score.score.high).toBeLessThanOrEqual(100);
      for (const c of [x.quick.confidence, x.engineering.confidence, x.rainfall.confidence]) {
        expect(['low', 'medium', 'high']).toContain(c.level);
        expect(c.reasons.length).toBeGreaterThan(0);
      }
    }
  });

  it('a published floor area earns more confidence than an estimated one', () => {
    const doc = estimateCondensate(office, 'engineering').confidence.score;
    const guess = estimateCondensate({ ...office, floorAreaSource: 'estimated' }, 'engineering').confidence.score;
    expect(doc).toBeGreaterThan(guess);
  });

  it('confidence levels follow the thresholds in assumptions', () => {
    expect(toConfidence([{ score: 0.9, reason: 'x' }]).level).toBe('high');
    expect(toConfidence([{ score: 0.5, reason: 'x' }]).level).toBe('medium');
    expect(toConfidence([{ score: 0.1, reason: 'x' }]).level).toBe('low');
  });

  it('edited assumptions flow straight through', () => {
    const base = estimateCondensate(office, 'quick').annualL.mid;
    const edited = estimateCondensate(office, 'quick', withOverrides({ 'condensate.galPerTonHour': { value: 0.3 } })).annualL.mid;
    expect(edited).toBeCloseTo(base * 1.5, 6);
  });
});

describe('opportunity score', () => {
  const conf = toConfidence([{ score: 0.6, reason: 'x' }]);
  const at = (litres: number) =>
    scoreOpportunity({ condensateL: { low: litres, mid: litres, high: litres }, rainfallL: { low: 0, mid: 0, high: 0 }, openReportsNearby: 0, confidence: conf }).score.mid;

  it('more water means a higher score, capped at 100', () => {
    expect(at(1_000_000)).toBeGreaterThan(at(10_000));
    expect(at(1e12)).toBeLessThanOrEqual(100);
    expect(at(0)).toBeGreaterThanOrEqual(0);
  });
});

describe('communities (DBSCAN)', () => {
  const near = (id: string, dLat: number, dLng = 0): Building => ({ ...BUILDINGS[0], id, lat: 24.35 + dLat, lng: 54.5 + dLng });

  it('groups close buildings and leaves a far one out', () => {
    const bs = [near('a', 0), near('b', 0.002), near('c', 0.004), near('far', 0.3)];
    const cs = findCommunities(bs, []);
    expect(cs).toHaveLength(1);
    expect(cs[0].buildingIds.sort()).toEqual(['a', 'b', 'c']);
    expect(ordered(cs[0].condensateL)).toBe(true);
  });

  it('rejected reports never join a community', () => {
    const cs = findCommunities(BUILDINGS, SAMPLE_REPORTS);
    const rejected = SAMPLE_REPORTS.filter((r) => r.status === 'rejected').map((r) => r.id);
    expect(cs.flatMap((c) => c.reportIds).some((id) => rejected.includes(id))).toBe(false);
  });

  it('seed data forms a community in Mussafah', () => {
    const cs = findCommunities(BUILDINGS, SAMPLE_REPORTS);
    expect(cs.some((c) => c.buildingIds.includes('dalma-mall') || c.buildingIds.includes('al-safeer-mall'))).toBe(true);
  });
});

describe('report status workflow', () => {
  const r = SAMPLE_REPORTS.find((x) => x.status === 'submitted')!;

  it('only the authority can change a status', () => {
    expect(() => changeStatus(r, 'review', 'citizen')).toThrow();
    expect(() => changeStatus(r, 'review', 'owner')).toThrow();
  });

  it('moves forward, logs history, and never goes back', () => {
    const verified = changeStatus(r, 'verified', 'authority', 'Checked on site');
    expect(verified.status).toBe('verified');
    expect(verified.history.at(-1)).toMatchObject({ status: 'verified', by: 'authority', note: 'Checked on site' });
    expect(() => changeStatus(verified, 'review', 'authority')).toThrow();
    expect(nextStatuses('resolved')).toEqual([]);
  });

  it('seed histories end on the current status', () => {
    for (const s of SAMPLE_REPORTS) expect(s.history.at(-1)!.status).toBe(s.status);
  });
});

describe('runoff for one event', () => {
  it('V = P × A × C, then the capture share', () => {
    const e = estimateRunoff({ areaM2: 1000, surface: 'paved', areaSource: 'mapped' }, 254.8);
    expect(e.runoffL.mid).toBeCloseTo(254.8 * 1000 * A['rain.c.paved'].value, 6);
    expect(e.capturableL.mid).toBeCloseTo(e.runoffL.mid * A['rain.captureEfficiency'].value, 6);
    expect(ordered(e.capturableL)).toBe(true);
  });

  it('every capture zone has a real outline and a positive area', () => {
    expect(CAPTURE_ZONES.length).toBeGreaterThanOrEqual(BUILDINGS.length);
    for (const z of CAPTURE_ZONES) {
      expect(z.ring.length, z.id).toBeGreaterThanOrEqual(4);
      expect(z.areaM2).toBeGreaterThan(0);
    }
  });
});

describe('impact and totals', () => {
  it('1,000 m³ of water saves kWh/m³ × 1,000 kWh and that times the grid factor in CO₂', () => {
    const x = impactOf({ low: 1e6, mid: 1e6, high: 1e6 });
    expect(x.energyKWh.mid).toBeCloseTo(1000 * A['impact.desalKWhPerM3'].value, 6);
    expect(x.co2Kg.mid).toBeCloseTo(1000 * A['impact.desalKWhPerM3'].value * A['impact.gridKgCO2PerKWh'].value, 6);
  });

  it('city totals add up the buildings', () => {
    const xs = BUILDINGS.map((b) => analyzeBuilding(b, SAMPLE_REPORTS));
    const t = cityTotals(xs);
    expect(t.condensateL.mid).toBeCloseTo(xs.reduce((s, x) => s + x.engineering.annualL.mid, 0), 3);
    expect(t.monthly.reduce((s, m) => s + m.condensateL, 0)).toBeCloseTo(t.condensateL.mid, 3);
    expect(ordered(t.totalL)).toBe(true);
  });

  it('report stats count every report once', () => {
    const s = reportStats(SAMPLE_REPORTS, new Date('2026-10-01'));
    expect(Object.values(s.byStatus).reduce((a, b) => a + b, 0)).toBe(SAMPLE_REPORTS.length);
  });
});

describe('new reports and merging', () => {
  const input = { kind: 'condensate' as const, description: 'Water dripping from the units on the back wall', lat: 24.35, lng: 54.52 };

  it('a new report starts submitted, with one history entry', () => {
    const r = createReport(input, 'citizen');
    expect(r.status).toBe('submitted');
    expect(r.history).toHaveLength(1);
  });

  it('merging keeps the copy that has seen more status changes', () => {
    const r = createReport(input, 'citizen');
    const moved = changeStatus(r, 'review', 'authority');
    expect(mergeReports([moved], [r])[0].status).toBe('review');
    expect(mergeReports([r], [moved])[0].status).toBe('review');
  });

  it('the server rejects reports outside Abu Dhabi and unknown assumption keys', () => {
    expect(ReportInputSchema.safeParse({ ...input, reporter: 'citizen', lat: 25.2, lng: 55.3 }).success).toBe(false);
    expect(OverridesSchema.parse({ 'rain.yearFactor': { value: 2 }, hacked: { value: 1 } })).toEqual({ 'rain.yearFactor': { value: 2 } });
  });
});
