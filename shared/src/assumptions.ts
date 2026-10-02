import { BUILDING_TYPES, type BuildingType, type Range } from './types';

/**
 * Every number the engine leans on lives here, with where it came from.
 * `value` is the best guess; `low`/`high` bound it. Anything can be overridden
 * with `withOverrides`, which is what the Assumptions drawer does.
 */
export type Assumption = {
  group: string;
  label: string;
  unit: string;
  value: number;
  low?: number;
  high?: number;
  source: string;
  url?: string;
};

const ASHRAE_621 = 'https://www.ashrae.org/technical-resources/bookstore/standards-62-1-62-2';
const GUZ = 'https://www.hpac.com/air-conditioning/article/20928378/methods-of-calculating-water-recovery-from-air-conditioning-cooling-coils-part-1-of-2';
const UAE_TR = 'https://enershares.com/hvac-mep-thumb-rules/';
const RUNOFF = 'https://www.twdb.texas.gov/publications/brochures/conservation/doc/RainwaterHarvestingManual_3rdedition.pdf';

const GENERAL = {
  'psychro.pressureKPa': {
    group: 'Psychrometrics', label: 'Air pressure', unit: 'kPa', value: 101.325,
    source: 'Standard sea-level atmosphere, ASHRAE Handbook: Fundamentals ch. 1. Abu Dhabi sits at sea level.',
  },
  'psychro.airDensity': {
    group: 'Psychrometrics', label: 'Air density', unit: 'kg/m³', value: 1.2, low: 1.15, high: 1.2,
    source: 'ASHRAE "standard air" is 1.2 kg/m³. Hot outdoor air is a little lighter, hence the low end.',
  },
  'condensate.coilDewPointC': {
    group: 'Condensate (engineering)', label: 'Air leaving the cooling coil', unit: '°C dew point', value: 12, low: 13, high: 11,
    source: 'Typical off-coil condition for comfort cooling is 11-13 °C, near saturated. A colder coil wrings out more water, so 11 °C is the high case.',
  },
  'condensate.oaDelivered': {
    group: 'Condensate (engineering)', label: 'Fresh air actually delivered vs design', unit: '×', value: 1, low: 0.7, high: 1.2,
    source: 'Waha assumption. Plenty of buildings run fresh air below the design rate, a few run above it.',
  },
  'condensate.galPerTonHour': {
    group: 'Condensate (quick)', label: 'Condensate per ton of cooling per hour', unit: 'US gal/TR·h', value: 0.2, low: 0.1, high: 0.3,
    source: 'Guz (2005), "Condensate Water Recovery", ASHRAE Journal: large buildings make 0.1-0.3 gal per ton-hour in summer.',
    url: GUZ,
  },
  'condensate.peakLoadFactor': {
    group: 'Condensate (quick)', label: 'Share of cooling capacity in use, hottest month', unit: '×', value: 0.7, low: 0.5, high: 0.85,
    source: 'Waha assumption for UAE summers. Guz\'s formula multiplies by a load factor; plants rarely run at 100%.',
    url: GUZ,
  },
  'condensate.balancePointC': {
    group: 'Condensate (quick)', label: 'Temperature where cooling demand bottoms out', unit: '°C', value: 18, low: 20, high: 16,
    source: 'Standard 18 °C (65 °F) base used for cooling degree days. Load scales linearly from here to the hottest month.',
  },
  'rain.yearFactor': {
    group: 'Rainfall', label: 'This year vs the 30-year normal', unit: '×', value: 1, low: 0.5, high: 2,
    source: 'Waha assumption. UAE rain swings hard year to year, so half to double the normal covers most years.',
  },
  'rain.c.roofConcrete': {
    group: 'Rainfall', label: 'Runoff coefficient, flat concrete roof', unit: 'C', value: 0.8, low: 0.6, high: 0.9,
    source: 'Rainwater harvesting tables: concrete roofs 0.80-0.90, flat cement roofs down to 0.60 after ponding and evaporation.',
    url: RUNOFF,
  },
  'rain.c.roofMetal': {
    group: 'Rainfall', label: 'Runoff coefficient, metal roof', unit: 'C', value: 0.9, low: 0.8, high: 0.95,
    source: 'Texas Manual on Rainwater Harvesting (TWDB, 2005): smooth metal roofs lose the least.',
    url: RUNOFF,
  },
  'rain.c.paved': {
    group: 'Rainfall', label: 'Runoff coefficient, asphalt or paving', unit: 'C', value: 0.85, low: 0.7, high: 0.95,
    source: 'Rational method runoff tables (ASCE/WEF MOP 77): asphalt and concrete pavement 0.70-0.95.',
  },
  'rain.c.landscape': {
    group: 'Rainfall', label: 'Runoff coefficient, sand or planting', unit: 'C', value: 0.15, low: 0.1, high: 0.3,
    source: 'Rational method runoff tables (ASCE/WEF MOP 77): sandy soil and lawns 0.05-0.35.',
  },
  'rain.captureEfficiency': {
    group: 'Rainfall', label: 'Share of runoff a tank or swale actually keeps', unit: '×', value: 0.6, low: 0.45, high: 0.75,
    source: 'Waha assumption. First-flush diversion, overflow in big storms and evaporation all take a cut, and UAE storms are short and intense.',
  },
  'impact.desalKWhPerM3': {
    group: 'Impact', label: 'Electricity to desalinate one cubic metre', unit: 'kWh/m³', value: 3.5, low: 2.81, high: 4.5,
    source: 'Taweelah reverse osmosis plant runs at a record 2.81 kWh/m³ (ACWA Power). Older seawater RO plants run 3.5-4.5. Thermal plants use far more, so this is conservative.',
    url: 'https://acwapower.com/en/what-we-do/projects/taweelah-ro-desalination-iwp/',
  },
  'impact.gridKgCO2PerKWh': {
    group: 'Impact', label: 'CO₂ per unit of grid electricity', unit: 'kg CO₂/kWh', value: 0.39, low: 0.27, high: 0.4,
    source: 'Abu Dhabi grid was 0.39 kg/kWh in 2018 (EAD Climate Change Strategy). The UAE targets 0.27 by 2030; DEWA reported 0.40 for 2020.',
    url: 'https://www.ead.gov.ae/-/media/Project/EAD/EAD/Documents/Climate-Change-Strategy-in-The-Emirate-of-Abu-Dhabi.pdf',
  },
  'community.radiusKm': {
    group: 'Communities', label: 'Max distance between neighbours', unit: 'km', value: 1, low: 0.5, high: 1.5,
    source: 'Waha assumption: about one shared tanker run or pipe loop. Feeds turf.clustersDbscan.',
  },
  'community.minPoints': {
    group: 'Communities', label: 'Points needed to form a community', unit: 'count', value: 3,
    source: 'Waha assumption. Three buildings or reports is the smallest group worth coordinating.',
  },
  'score.wCondensate': {
    group: 'Opportunity score', label: 'Weight: condensate volume', unit: 'weight', value: 0.45,
    source: 'Waha scoring choice. Condensate is the steadiest supply, so it counts most.',
  },
  'score.wRain': {
    group: 'Opportunity score', label: 'Weight: rainfall volume', unit: 'weight', value: 0.15,
    source: 'Waha scoring choice. Rain is real but rare in Abu Dhabi, so it counts less.',
  },
  'score.wDemand': {
    group: 'Opportunity score', label: 'Weight: community reports nearby', unit: 'weight', value: 0.25,
    source: 'Waha scoring choice. People flagging waste nearby means someone wants it fixed.',
  },
  'score.wConfidence': {
    group: 'Opportunity score', label: 'Weight: data confidence', unit: 'weight', value: 0.15,
    source: 'Waha scoring choice. Well-documented buildings are easier to act on.',
  },
  'score.condensateRefL': {
    group: 'Opportunity score', label: 'Condensate that maxes the score', unit: 'L/yr', value: 10_000_000,
    source: 'Waha scoring choice: roughly a large mall. Top of the log scale.',
  },
  'score.rainRefL': {
    group: 'Opportunity score', label: 'Rainfall that maxes the score', unit: 'L/yr', value: 2_000_000,
    source: 'Waha scoring choice: roughly a 50,000 m² roof in a normal year. Top of the log scale.',
  },
  'score.floorL': {
    group: 'Opportunity score', label: 'Volume that scores zero', unit: 'L/yr', value: 10_000,
    source: 'Waha scoring choice: a single household AC unit makes about this much a year. Bottom of the log scale.',
  },
  'score.demandRef': {
    group: 'Opportunity score', label: 'Open reports that max demand', unit: 'reports', value: 5,
    source: 'Waha scoring choice.',
  },
  'confidence.highAt': {
    group: 'Confidence', label: 'Score needed for "high"', unit: '0-1', value: 0.7,
    source: 'Waha scoring choice.',
  },
  'confidence.mediumAt': {
    group: 'Confidence', label: 'Score needed for "medium"', unit: '0-1', value: 0.45,
    source: 'Waha scoring choice.',
  },
  'confidence.agreeWithin': {
    group: 'Confidence', label: 'Methods count as agreeing within', unit: '×', value: 1.6,
    source: 'Waha scoring choice. If quick and engineering land within 1.6× of each other, trust goes up.',
  },
  'confidence.estimatedArea': {
    group: 'Confidence', label: 'Trust in an estimated floor area', unit: '0-1', value: 0.25,
    source: 'Waha scoring choice. Footprint × floors ignores setbacks, atriums and plant floors, so an estimated area alone keeps a building out of "high".',
  },
  'confidence.mappedArea': {
    group: 'Confidence', label: 'Trust in a mapped roof area', unit: '0-1', value: 0.8,
    source: 'Waha scoring choice. OpenStreetMap footprints are traced from imagery and usually close.',
  },
  'confidence.quickMethod': {
    group: 'Confidence', label: 'Trust in the rule-of-thumb method', unit: '0-1', value: 0.6,
    source: 'Waha scoring choice.',
  },
  'confidence.engineeringMethod': {
    group: 'Confidence', label: 'Trust in the psychrometric method', unit: '0-1', value: 0.9,
    source: 'Waha scoring choice. It works from real humidity, not a rule of thumb.',
  },
  'confidence.maybeUnconditioned': {
    group: 'Confidence', label: 'Trust that an industrial unit is fully air-conditioned', unit: '0-1', value: 0.5,
    source: 'Waha scoring choice. Many Mussafah workshops are only partly cooled.',
  },
} satisfies Record<string, Assumption>;

type ProfileField = 'hours' | 'days' | 'oa' | 'm2PerTon';
type ProfileKey = `profile.${BuildingType}.${ProfileField}`;
type Triple = [low: number, value: number, high: number];

type Profile = {
  name: string;
  hours: Triple; days: Triple; oa: Triple; m2PerTon: Triple;
  oaSource: string; tonSource: string;
};

const OFFICE_TR = 'UAE office rule of thumb, 250-350 ft² per TR (23-33 m²).';
const RETAIL_TR = 'UAE retail rule of thumb, 200-300 ft² per TR (19-28 m²).';

// Fresh air is ASHRAE 62.1 Table 6-1: Rp (L/s per person) × default density + Ra (L/s per m²).
// m²/TR is listed low-to-high in area, which means high-to-low in cooling. The engine sorts that out.
const PROFILES: Record<BuildingType, Profile> = {
  office: {
    name: 'Office', hours: [9, 10, 12], days: [5, 5, 6], oa: [0.3, 0.425, 0.55], m2PerTon: [32.5, 26, 23.2],
    oaSource: 'ASHRAE 62.1 office: 2.5 L/s·person at 5/100 m² + 0.3 L/s·m².', tonSource: OFFICE_TR,
  },
  residential: {
    name: 'Residential', hours: [18, 24, 24], days: [7, 7, 7], oa: [0.25, 0.35, 0.45], m2PerTon: [37.2, 32.5, 27.9],
    oaSource: 'ASHRAE 62.2 whole-dwelling ventilation, averaged per m² for apartments.', tonSource: 'UAE residential rule of thumb, 300-400 ft² per TR.',
  },
  hotel: {
    name: 'Hotel', hours: [20, 24, 24], days: [7, 7, 7], oa: [0.4, 0.55, 0.75], m2PerTon: [32.5, 26, 23.2],
    oaSource: 'ASHRAE 62.1 hotel bedroom: 2.5 L/s·person at 10/100 m² + 0.3 L/s·m².', tonSource: `${OFFICE_TR} Used as a proxy.`,
  },
  mall: {
    name: 'Mall', hours: [12, 14, 15], days: [7, 7, 7], oa: [0.9, 1.17, 1.82], m2PerTon: [27.9, 23.2, 18.6],
    oaSource: 'ASHRAE 62.1 retail sales: 3.8 L/s·person at 15/100 m² + 0.6 L/s·m². High end is mall common areas at 40/100 m².', tonSource: RETAIL_TR,
  },
  mosque: {
    name: 'Mosque', hours: [4, 6, 9], days: [7, 7, 7], oa: [1.65, 3.3, 3.3], m2PerTon: [23.2, 18.6, 14],
    oaSource: 'ASHRAE 62.1 place of worship: 2.5 L/s·person at 120/100 m² + 0.3 L/s·m², during prayer times.', tonSource: 'Waha assumption: dense assembly space, 150-250 ft² per TR.',
  },
  hospital: {
    name: 'Hospital', hours: [24, 24, 24], days: [7, 7, 7], oa: [0.8, 1, 1.67], m2PerTon: [27.9, 23.2, 18.6],
    oaSource: 'ASHRAE 170 asks for 2 outdoor air changes an hour in patient rooms (about 1.67 L/s·m²). Whole-building average assumed lower.', tonSource: 'Waha assumption, retail-like density.',
  },
  school: {
    name: 'School or university', hours: [7, 8, 10], days: [5, 5, 6], oa: [1.2, 2.35, 2.35], m2PerTon: [27.9, 23.2, 18.6],
    oaSource: 'ASHRAE 62.1 classroom (age 9+): 5 L/s·person at 35/100 m² + 0.6 L/s·m².', tonSource: 'Waha assumption, retail-like density.',
  },
  industrial: {
    name: 'Industrial', hours: [8, 12, 16], days: [6, 6, 7], oa: [0.2, 0.3, 0.45], m2PerTon: [46.5, 37.2, 27.9],
    oaSource: 'ASHRAE 62.1 warehouse area rate: 0.3 L/s·m².', tonSource: 'Waha assumption: lightly cooled, 300-500 ft² per TR.',
  },
  civic: {
    name: 'Civic or cultural', hours: [8, 12, 14], days: [7, 7, 7], oa: [1, 1.82, 1.82], m2PerTon: [27.9, 23.2, 18.6],
    oaSource: 'ASHRAE 62.1 museum: 3.8 L/s·person at 40/100 m² + 0.3 L/s·m².', tonSource: 'Waha assumption, retail-like density.',
  },
};

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> =
  Object.fromEntries(BUILDING_TYPES.map((t) => [t, PROFILES[t].name])) as Record<BuildingType, string>;

const profileEntries = BUILDING_TYPES.flatMap((t) => {
  const p = PROFILES[t];
  const group = `Building profile: ${p.name}`;
  const entry = (field: ProfileField, label: string, unit: string, [low, value, high]: Triple, source: string, url?: string) =>
    [`profile.${t}.${field}`, { group, label, unit, low, value, high, source, url }] as const;
  return [
    entry('hours', 'Cooling hours per day', 'h/day', p.hours, 'Waha assumption from typical opening hours.'),
    entry('days', 'Operating days per week', 'days/wk', p.days, 'Waha assumption. UAE weekend is Saturday and Sunday.'),
    entry('oa', 'Design fresh air', 'L/s per m²', p.oa, p.oaSource, ASHRAE_621),
    entry('m2PerTon', 'Floor area per ton of cooling', 'm²/TR', p.m2PerTon, p.tonSource, UAE_TR),
  ];
});

export type Assumptions = Record<keyof typeof GENERAL | ProfileKey, Assumption>;
export type AssumptionKey = keyof Assumptions;

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  ...GENERAL,
  ...(Object.fromEntries(profileEntries) as Record<ProfileKey, Assumption>),
};

export type AssumptionOverrides = Partial<Record<AssumptionKey, Partial<Pick<Assumption, 'low' | 'value' | 'high'>>>>;

export function withOverrides(overrides: AssumptionOverrides, base: Assumptions = DEFAULT_ASSUMPTIONS): Assumptions {
  const out = { ...base };
  for (const [k, v] of Object.entries(overrides) as [AssumptionKey, AssumptionOverrides[AssumptionKey]][]) {
    if (out[k] && v) out[k] = { ...out[k], ...v };
  }
  return out;
}

/**
 * An assumption as a range. "low" and "high" mean low and high *result*, so some inputs
 * run backwards (a colder coil, 11 °C, is the high case). The engine doesn't care which way.
 */
export const rangeOf = (a: Assumption): Range => ({ low: a.low ?? a.value, mid: a.value, high: a.high ?? a.value });

/** NIST: 1 US gallon = 3.785411784 L. A unit definition, not an assumption. */
export const LITRES_PER_US_GALLON = 3.785411784;
