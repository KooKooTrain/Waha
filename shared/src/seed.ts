import { STATUS_PIPELINE } from './reports';
import type { Building, District, Report, ReportKind, ReportStatus, Role, Source } from './types';

/*
 * Real buildings. Footprints come from OpenStreetMap (pulled 2 Oct 2026, measured with turf.area).
 * Where a floor area has been published we use it; otherwise it's footprint × floors and marked estimated.
 */

const osm = (path: string): Source => ({ label: 'OpenStreetMap footprint', url: `https://www.openstreetmap.org/${path}` });
const wiki = (page: string): Source => ({ label: 'Wikipedia', url: `https://en.wikipedia.org/wiki/${page}` });
const wikidata = (q: string): Source => ({ label: 'Wikidata', url: `https://www.wikidata.org/wiki/${q}` });

const CITY: District = 'Abu Dhabi City';
const MUS: District = 'Mussafah & MBZ';

/** Floor count from OSM unless `why` says otherwise. */
const est = (roof: number, floors: number, why?: string) => ({
  floors,
  floorAreaM2: roof * floors,
  floorAreaSource: 'estimated' as const,
  floorAreaNote: `Footprint ${roof.toLocaleString('en-US')} m² × ${floors} floor${floors > 1 ? 's' : ''}${why ? `. ${why}` : ' (OSM)'}`,
});

export const BUILDINGS: Building[] = [
  // Abu Dhabi City
  {
    id: 'adnoc-hq', name: 'ADNOC Headquarters', type: 'office', district: CITY, lat: 24.46197, lng: 54.32412,
    roofAreaM2: 2643, floors: 65, floorAreaM2: 190_000, floorAreaSource: 'documented',
    floorAreaNote: '190,000 m² gross floor area (CTBUH, via Wikipedia)',
    sources: [osm('way/242540551'), wiki('ADNOC_Headquarters')],
  },
  {
    id: 'the-landmark', name: 'The Landmark', type: 'office', district: CITY, lat: 24.48483, lng: 54.35065,
    roofAreaM2: 2499, ...est(2499, 72),
    sources: [osm('way/284811564'), wiki('The_Landmark_(Abu_Dhabi)')],
  },
  {
    id: 'adia-tower', name: 'ADIA Tower', type: 'office', district: CITY, lat: 24.48607, lng: 54.35151,
    roofAreaM2: 2397, ...est(2397, 40),
    sources: [osm('way/88383166'), wiki('Abu_Dhabi_Investment_Authority_Tower')],
  },
  {
    id: 'al-bahr-towers', name: 'Al Bahr Towers', type: 'office', district: CITY, lat: 24.4562, lng: 54.40116,
    roofAreaM2: 13076, floors: 29, floorAreaM2: 70_000, floorAreaSource: 'documented',
    floorAreaNote: '70,000 m² across both towers (Wikipedia)',
    sources: [osm('way/170243985'), wiki('Al_Bahr_Towers')],
  },
  {
    id: 'capital-gate', name: 'Capital Gate', type: 'hotel', district: CITY, lat: 24.4187, lng: 54.43466,
    roofAreaM2: 2970, floors: 35, floorAreaM2: 53_100, floorAreaSource: 'documented',
    floorAreaNote: '53,100 m² gross floor area (Wikipedia). Home to the Andaz hotel.',
    sources: [osm('way/103779658'), wiki('Capital_Gate')],
  },
  {
    id: 'al-maqam-tower', name: 'Al Maqam Tower, ADGM', type: 'office', district: CITY, lat: 24.50052, lng: 54.38939,
    roofAreaM2: 2405, ...est(2405, 37),
    sources: [osm('way/223575411'), wikidata('Q1390702')],
  },
  {
    id: 'sky-tower', name: 'Sky Tower, Al Reem Island', type: 'residential', district: CITY, lat: 24.4962, lng: 54.40856,
    roofAreaM2: 2633, ...est(2633, 80),
    sources: [osm('way/168554211'), wikidata('Q1435741')],
  },
  {
    id: 'abu-dhabi-mall', name: 'Abu Dhabi Mall', type: 'mall', district: CITY, lat: 24.49573, lng: 54.3834,
    roofAreaM2: 36159, ...est(36159, 4),
    sources: [osm('way/150781737'), wikidata('Q4670143')],
  },
  {
    id: 'marina-mall', name: 'Marina Mall', type: 'mall', district: CITY, lat: 24.47639, lng: 54.32078,
    roofAreaM2: 67669, ...est(67669, 2),
    sources: [osm('way/225643187'), wikidata('Q3293168')],
  },
  {
    id: 'emirates-palace', name: 'Emirates Palace', type: 'hotel', district: CITY, lat: 24.46237, lng: 54.31691,
    roofAreaM2: 58682, ...est(58682, 4, 'Wings run from 2 to 8 storeys (OSM tags 8), so 4 is a middle guess'),
    sources: [osm('way/30394921'), wiki('Emirates_Palace')],
  },
  {
    id: 'central-bank', name: 'Central Bank of the UAE', type: 'office', district: CITY, lat: 24.4566, lng: 54.33704,
    roofAreaM2: 4229, ...est(4229, 4),
    sources: [osm('way/204798873'), wikidata('Q2982584')],
  },
  {
    id: 'grand-mosque', name: 'Sheikh Zayed Grand Mosque', type: 'mosque', district: CITY, lat: 24.41242, lng: 54.47509,
    roofAreaM2: 39470, floorAreaM2: 22_470, floorAreaSource: 'estimated',
    floorAreaNote: 'Footprint 39,470 m² minus the open 17,000 m² courtyard (Wikipedia)',
    sources: [osm('relation/1635169'), wiki('Sheikh_Zayed_Grand_Mosque')],
  },
  {
    id: 'qasr-al-watan', name: 'Qasr Al Watan', type: 'civic', district: CITY, lat: 24.46308, lng: 54.30498,
    roofAreaM2: 70144, ...est(70144, 2, 'Floor count is our guess'),
    sources: [osm('relation/7232861'), wikidata('Q61973220')],
  },

  // Mussafah & Mohammed Bin Zayed City
  {
    id: 'dalma-mall', name: 'Dalma Mall', type: 'mall', district: MUS, lat: 24.33301, lng: 54.52425,
    roofAreaM2: 83356, floors: 3, floorAreaM2: 155_000, floorAreaSource: 'documented',
    floorAreaNote: '155,000 m² gross leasable area (Wikipedia). Leasable area only, so this runs a little low.',
    sources: [osm('way/102820609'), wiki('Dalma_Mall')],
  },
  {
    id: 'mazyad-mall', name: 'Mazyad Mall', type: 'mall', district: MUS, lat: 24.37312, lng: 54.53794,
    roofAreaM2: 12104, floors: 3, floorAreaM2: 22_910, floorAreaSource: 'documented',
    floorAreaNote: '22,910 m² gross leasable area over three levels',
    sources: [osm('way/89640098'), { label: 'Occupi mall profile', url: 'https://getoccupi.com/malls/mazyad' }],
  },
  {
    id: 'burjeel-medical-city', name: 'Burjeel Medical City', type: 'hospital', district: MUS, lat: 24.35452, lng: 54.53878,
    roofAreaM2: 12453, floorAreaM2: 82_000, floorAreaSource: 'documented',
    floorAreaNote: '82,000 m² gross floor area (main contractor project page). 400 beds.',
    sources: [osm('way/1153928498'), { label: 'NSCC project page', url: 'https://nsccme.com/projects/burjeel-medical-city-abu-dhabi/' }],
  },
  {
    id: 'al-safeer-mall', name: 'AlSafeer Mall', type: 'mall', district: MUS, lat: 24.34282, lng: 54.53033,
    roofAreaM2: 2840, ...est(2840, 3),
    sources: [osm('way/116691880')],
  },
  {
    id: 'al-ain-university-ad', name: 'Al Ain University, Abu Dhabi campus', type: 'school', district: MUS, lat: 24.34593, lng: 54.53919,
    roofAreaM2: 10345, ...est(10345, 3, 'Floor count is our guess, and the footprint includes courtyards'),
    sources: [osm('relation/15601793')],
  },
  {
    id: 'dunes-school', name: 'Dunes International School', type: 'school', district: MUS, lat: 24.33939, lng: 54.53245,
    roofAreaM2: 4288, ...est(4288, 3),
    sources: [osm('way/1156504621')],
  },
  {
    id: 'mussafah-bus-station', name: 'Mussafah Bus Station', type: 'civic', district: MUS, lat: 24.32117, lng: 54.53059,
    roofAreaM2: 2657, ...est(2657, 1, 'Single-storey, our guess'),
    sources: [osm('way/756721128')],
  },
  {
    id: 'adsb', name: 'Abu Dhabi Ship Building', type: 'industrial', district: MUS, lat: 24.3543, lng: 54.4671,
    roofAreaM2: 3673, ...est(3673, 1, 'Single-storey, our guess'),
    sources: [osm('way/483092094')],
  },
  {
    id: 'neopharma', name: 'Neopharma', type: 'industrial', district: MUS, lat: 24.32509, lng: 54.52348,
    roofAreaM2: 2068, ...est(2068, 4),
    sources: [osm('way/482165132')],
  },
  {
    id: 'modern-bakery', name: 'Modern Bakery', type: 'industrial', district: MUS, lat: 24.34399, lng: 54.47684,
    roofAreaM2: 1354, ...est(1354, 1, 'Single-storey, our guess'),
    sources: [osm('way/483094446')],
  },
];

/*
 * Sample reports. Made up for the demo, pinned near real places. Every one carries `sample: true`.
 */

const NOTES: Partial<Record<ReportStatus, string>> = {
  review: 'Picked up by the municipality water team',
  investigating: 'Site visit booked',
  verified: 'Confirmed on site',
  resolved: 'Drain line rerouted to a collection tank',
};

const DAY = 86_400_000;

function history(createdAt: string, reporter: Role, status: ReportStatus, rejectNote?: string): Report['history'] {
  const t0 = Date.parse(createdAt);
  const at = (i: number) => new Date(t0 + i * 2 * DAY).toISOString();
  const path: ReportStatus[] = status === 'rejected'
    ? ['submitted', 'review']
    : STATUS_PIPELINE.slice(0, STATUS_PIPELINE.indexOf(status) + 1);
  const events: Report['history'] = path.map((s, i) => ({
    status: s, at: at(i), by: i === 0 ? reporter : 'authority', ...(i > 0 && NOTES[s] ? { note: NOTES[s] } : {}),
  }));
  if (status === 'rejected') events.push({ status: 'rejected', at: at(path.length), by: 'authority', note: rejectNote });
  return events;
}

type Row = [id: string, kind: ReportKind, title: string, description: string, lat: number, lng: number,
  buildingId: string, status: ReportStatus, createdAt: string, reporter: Role, rejectNote?: string];

const ROWS: Row[] = [
  ['r-001', 'condensate', 'AC water pouring onto the pavement', 'Clear water running off the service side of Dalma Mall all morning. It just soaks into the sand.', 24.3338, 54.5251, 'dalma-mall', 'submitted', '2026-09-21T08:10:00.000Z', 'citizen'],
  ['r-002', 'condensate', 'Split units dripping all day', 'Every shop on this row has a drip line onto the footpath. The kerb has gone green.', 24.3435, 54.5297, 'al-safeer-mall', 'review', '2026-09-12T16:40:00.000Z', 'citizen'],
  ['r-003', 'condensate', 'Accommodation block drains into the sand', 'About forty window units on the back wall, all draining straight down.', 24.3220, 54.5290, 'mussafah-bus-station', 'investigating', '2026-08-30T07:20:00.000Z', 'citizen'],
  ['r-004', 'condensate', 'Workshop row, every unit drips onto the road', 'Steady drip from the site offices along this street. Worst in the afternoon.', 24.3446, 54.4775, 'modern-bakery', 'verified', '2026-08-18T12:05:00.000Z', 'citizen'],
  ['r-005', 'rainfall', 'Car park floods after rain', 'The lower car park was ankle deep for two days after the last storm.', 24.3725, 54.5372, 'mazyad-mall', 'verified', '2026-08-02T09:30:00.000Z', 'citizen'],
  ['r-006', 'leak', 'Burst irrigation pipe on the median', 'Water spraying across the road near the hospital entrance.', 24.3551, 54.5395, 'burjeel-medical-city', 'resolved', '2026-07-25T06:50:00.000Z', 'citizen'],
  ['r-007', 'condensate', 'AHU drain running to the storm drain', 'Our air handlers make a lot of water in summer. Happy to pipe it somewhere useful.', 24.3540, 54.5381, 'burjeel-medical-city', 'review', '2026-09-15T10:00:00.000Z', 'owner'],
  ['r-008', 'condensate', 'Drip lines over the playground', 'Kids splash in it at break time. It could be watering the planting.', 24.3398, 54.5320, 'dunes-school', 'submitted', '2026-09-24T07:45:00.000Z', 'citizen'],
  ['r-009', 'rainfall', 'Roof water dumps onto the bus platform', 'When it rains the gutters empty right where people queue.', 24.3215, 54.5302, 'mussafah-bus-station', 'investigating', '2026-09-03T15:15:00.000Z', 'citizen'],
  ['r-010', 'condensate', 'Puddle under the loading bay', 'There is always water under the loading bay, even in August.', 24.4952, 54.3840, 'abu-dhabi-mall', 'verified', '2026-08-10T11:25:00.000Z', 'citizen'],
  ['r-011', 'rainfall', 'Corniche underpass floods every winter', 'Same underpass, same flood, every year.', 24.4740, 54.3230, 'marina-mall', 'resolved', '2026-07-15T08:00:00.000Z', 'citizen'],
  ['r-012', 'condensate', 'Tower drip onto the street', 'Water dripping from the podium level onto the Corniche footpath.', 24.4855, 54.3510, 'the-landmark', 'submitted', '2026-09-26T17:30:00.000Z', 'citizen'],
  ['r-013', 'condensate', 'Hotel condensate going to sewer', 'We collect it in a sump but pump it to the sewer. Looking for a better option.', 24.4192, 54.4345, 'capital-gate', 'review', '2026-09-09T13:00:00.000Z', 'owner'],
  ['r-014', 'leak', 'Hose left running by the car park', 'A hose running onto the paving near the east car park.', 24.4130, 54.4760, 'grand-mosque', 'rejected', '2026-08-22T18:10:00.000Z', 'citizen', 'Already logged as a maintenance ticket'],
  ['r-015', 'rainfall', 'Forecourt holds water for days', 'After rain the forecourt by the towers stays flooded for days.', 24.4566, 54.4005, 'al-bahr-towers', 'submitted', '2026-09-28T09:05:00.000Z', 'citizen'],
  ['r-016', 'condensate', 'Steady drip from the back lot AHUs', 'Rooftop units on the production block drain into the yard.', 24.3254, 54.5238, 'neopharma', 'investigating', '2026-09-01T06:30:00.000Z', 'owner'],
  ['r-017', 'condensate', 'Site offices drip onto gravel', 'Portacabin AC units by the yard gate, maybe a dozen of them.', 24.3547, 54.4675, 'adsb', 'submitted', '2026-09-19T14:20:00.000Z', 'citizen'],
  ['r-018', 'rainfall', 'Courtyard floods when it rains', 'The main courtyard turns into a pond after any proper rain.', 24.3462, 54.5388, 'al-ain-university-ad', 'review', '2026-09-06T10:40:00.000Z', 'citizen'],
  ['r-019', 'condensate', 'Rooftop units overflow the gutter', 'Water spills over the parapet on the south side most afternoons.', 24.3735, 54.5383, 'mazyad-mall', 'resolved', '2026-07-28T12:00:00.000Z', 'citizen'],
  ['r-020', 'condensate', 'Wet patch on the plaza with no rain', 'A wet patch by the entrance that never dries out.', 24.4570, 54.3375, 'central-bank', 'verified', '2026-08-14T08:55:00.000Z', 'citizen'],
];

export const SAMPLE_REPORTS: Report[] = ROWS.map(
  ([id, kind, title, description, lat, lng, buildingId, status, createdAt, reporter, rejectNote]) => ({
    id, kind, title, description, lat, lng, buildingId, status, createdAt, reporter,
    history: history(createdAt, reporter, status, rejectNote),
    sample: true,
  }),
);
