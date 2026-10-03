import { useMemo, useState } from 'react';
import { CircleMarker, Polygon, Polyline, Tooltip } from 'react-leaflet';
import {
  RAIN_SCENARIOS, districtOf, polygonAreaM2, rainReportsIn, sumRanges,
  type CaptureZone, type RunoffEstimate, type Surface,
} from '@waha/shared';
import { api, useApi } from '../api';
import { useAssumptionStore, useAssumptions } from '../store/assumptions';
import { useReports } from '../store/reports';
import { AssumptionsDrawer } from '../ui/AssumptionsDrawer';
import { BaseMap, FlyTo } from '../ui/BaseMap';
import { PageHeader, SourceNote } from '../ui/Layout';
import { ConfidenceMeter, EstimateBadge, cx, fmt } from '../ui/kit';

const SURFACES: Record<Surface, string> = {
  roofConcrete: 'Concrete roof', roofMetal: 'Metal roof', paved: 'Paved or asphalt', landscape: 'Sand or planting',
};

const CAPTURE: Record<Surface, [string, string]> = {
  roofConcrete: ['Storage', 'Downpipes into a roof or underground tank, then irrigation and washing.'],
  roofMetal: ['Storage', 'Gutters into a tank. Metal sheds give the cleanest runoff.'],
  paved: ['Reuse', 'Kerb cuts and short pipe runs send runoff to bioswales and nearby planting.'],
  landscape: ['Infiltration', 'Swales and soakaways let water sink in and recharge the ground instead of pooling.'],
};

// Bins for the map colours, lightest = most water. Display only.
const BINS = ['#13707A', '#2FB8C2', '#8EEDF0', '#F0DEB8'];
const binOf = (v: number, max: number) => BINS[Math.min(3, Math.max(0, Math.floor((v / max) * 4 - 1e-9)))];

const RAIN_KEYS = ['rain.c.roofConcrete', 'rain.c.roofMetal', 'rain.c.paved', 'rain.c.landscape', 'rain.captureEfficiency', 'rain.yearFactor'] as const;

export function Rainfall() {
  const a = useAssumptions();
  const overrides = useAssumptionStore((s) => s.overrides);
  const reports = useReports((s) => s.reports);
  const [scenKey, setScenKey] = useState(RAIN_SCENARIOS[0].key);
  const [selId, setSelId] = useState<string | null>(null);
  const [drawn, setDrawn] = useState<CaptureZone[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [pts, setPts] = useState<[number, number][]>([]);
  const [surface, setSurface] = useState<Surface>('roofConcrete');
  const [drawer, setDrawer] = useState(false);
  const scen = RAIN_SCENARIOS.find((s) => s.key === scenKey)!;

  const base = useApi(() => api.zones(), []);
  const zones = useMemo(() => [...(base.data ?? []), ...drawn], [base.data, drawn]);
  const est = useApi(
    () => zones.length
      ? api.runoff(
        zones.map((z) => ({ areaM2: z.areaM2, surface: z.surface, areaSource: z.kind === 'drawn' ? 'drawn' : 'mapped' })),
        scen.depthMm,
        overrides,
      )
      : Promise.resolve({ data: [] as RunoffEstimate[], source: 'browser' as const }),
    [zones, scen.depthMm, overrides],
  );

  const ready = !!est.data && est.data.length === zones.length && zones.length > 0;
  const rows = ready
    ? zones.map((z, i) => ({ z, e: est.data![i] as RunoffEstimate })).sort((x, y) => y.e.capturableL.mid - x.e.capturableL.mid)
    : [];
  const max = Math.max(1, ...rows.map((r) => r.e.capturableL.mid));
  const total = rows.length ? sumRanges(rows.map((r) => r.e.capturableL)) : undefined;
  const sel = rows.find((r) => r.z.id === selId);

  const finish = () => {
    if (pts.length < 3) return;
    const ring = pts.map(([lat, lng]) => [lng, lat] as [number, number]);
    const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const z: CaptureZone = {
      id: `drawn-${Date.now()}`, name: `Your area ${drawn.length + 1}`, kind: 'drawn', district: districtOf(lat), surface,
      areaM2: Math.round(polygonAreaM2(ring)), lat, lng, ring: [...ring, ring[0]], osm: '',
    };
    setDrawn((d) => [...d, z]);
    setDrawing(false);
    setPts([]);
    setSelId(z.id);
  };

  return (
    <>
      <PageHeader wide overline="Rainwater recovery" title="Where would the rain go?">
        <div className="flex flex-col items-start gap-2.5">
          <span className="text-[13px] font-semibold">Rain scenario</span>
          <div className="flex flex-wrap waha-panel rounded-[18px] p-1">
            {RAIN_SCENARIOS.map((s) => (
              <button
                key={s.key}
                onClick={() => setScenKey(s.key)}
                aria-pressed={s.key === scenKey}
                className={cx(
                  'flex cursor-pointer flex-col items-start gap-0.5 rounded-[14px] border-0 px-4 py-2.5 transition-colors',
                  s.key === scenKey ? 'bg-mist-50 text-lagoon-950' : 'bg-transparent text-mist-50',
                )}
              >
                <span className="text-sm font-semibold">{s.label}</span>
                <span className="text-xs font-medium tabular-nums opacity-85">{s.depthMm} {s.unit}</span>
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      <main className="mx-auto flex max-w-[1280px] flex-wrap items-stretch gap-6 px-4 pb-24 pt-2 sm:px-6">
        {/* MAP */}
        <section className="relative min-h-[600px] min-w-0 flex-[999_1_560px] overflow-hidden rounded-xl border border-white/16">
          <BaseMap zoom={11} crosshair={drawing} onClick={(e) => drawing && setPts((p) => [...p, [e.latlng.lat, e.latlng.lng]])}>
            {rows.map(({ z, e }) => {
              const ponding = rainReportsIn(z, reports).length > 0;
              const color = binOf(e.capturableL.mid, max);
              return (
                <Polygon
                  key={z.id}
                  positions={z.ring.map(([lng, lat]) => [lat, lng] as [number, number])}
                  pathOptions={{
                    color: ponding ? '#F0DEB8' : color, dashArray: ponding ? '6 5' : undefined, weight: z.id === selId ? 3 : 1.5,
                    fillColor: color, fillOpacity: z.id === selId ? 0.75 : 0.5,
                  }}
                  eventHandlers={{ click: () => !drawing && setSelId(z.id) }}
                >
                  <Tooltip direction="top" sticky>{z.name}</Tooltip>
                </Polygon>
              );
            })}
            {/* Footprints are tiny at city zoom, so each zone also gets a dot at its centre. */}
            {rows.map(({ z, e }) => (
              <CircleMarker key={`${z.id}-dot`} center={[z.lat, z.lng]} radius={z.id === selId ? 8 : 5}
                pathOptions={{ color: '#04141C', weight: 1, fillColor: binOf(e.capturableL.mid, max), fillOpacity: 0.95 }}
                eventHandlers={{ click: () => !drawing && setSelId(z.id) }}>
                <Tooltip direction="top">{z.name}</Tooltip>
              </CircleMarker>
            ))}
            {drawing && pts.length > 0 && (
              <>
                <Polyline positions={pts.length > 2 ? [...pts, pts[0]] : pts} pathOptions={{ color: '#F0DEB8', weight: 2, dashArray: '4 4' }} />
                {pts.map((p, i) => <CircleMarker key={i} center={p} radius={4} pathOptions={{ color: '#04141C', weight: 1, fillColor: '#F0DEB8', fillOpacity: 1 }} />)}
              </>
            )}
            <FlyTo to={sel ? [sel.z.lat, sel.z.lng] : undefined} zoom={15} />
          </BaseMap>

          {/* draw panel */}
          <div className="absolute right-3 top-3 z-[700] flex w-[min(300px,calc(100%-24px))] flex-col gap-3 waha-panel waha-panel-map rounded-lg p-4">
            {!drawing ? (
              <>
                <span className="text-sm font-semibold">Draw your own area</span>
                <span className="text-[13px] leading-normal text-mist-200">Outline a roof, car park or street to estimate its runoff.</span>
                <button onClick={() => { setDrawing(true); setPts([]); setSelId(null); }} className="cursor-pointer self-start rounded-full border border-sand-200/50 bg-sand-200/12 px-3.5 py-2 text-[13px] font-semibold text-sand-200 hover:bg-sand-200/20">
                  Start drawing
                </button>
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">Drawing</span>
                  <span className="text-xs font-medium text-sand-200">{pts.length} point{pts.length === 1 ? '' : 's'}</span>
                </div>
                <span className="text-[13px] leading-normal text-mist-200">Click the map to add corners. Pick the surface, then finish.</span>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(SURFACES) as Surface[]).map((s) => (
                    <button
                      key={s} onClick={() => setSurface(s)} aria-pressed={s === surface}
                      className={cx('cursor-pointer rounded-full border px-2.5 py-1.5 text-xs font-semibold',
                        s === surface ? 'border-sand-200 bg-sand-200 text-lagoon-950' : 'border-white/25 bg-transparent text-mist-50')}
                    >
                      {SURFACES[s]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={finish} disabled={pts.length < 3} className={cx('flex-1 rounded-full border-0 px-3.5 py-2 text-[13px] font-semibold text-[#04141c]', pts.length < 3 ? 'cursor-not-allowed bg-sand-400/40' : 'cursor-pointer bg-sand-400')}>
                    Finish area
                  </button>
                  <button onClick={() => { setDrawing(false); setPts([]); }} className="cursor-pointer rounded-full border border-white/20 bg-transparent px-3.5 py-2 text-[13px] font-semibold text-mist-50">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>

          {/* legend */}
          <div className="absolute bottom-7 left-3 z-[700] flex flex-col gap-2.5 waha-panel waha-panel-map rounded-[18px] px-4 py-3.5">
            <span className="text-xs font-semibold">Capturable m³ · {scen.label}</span>
            <div className="flex gap-0.5">
              {BINS.map((c, i) => (
                <div key={c} className="flex w-16 flex-col gap-1">
                  <span className="h-2 rounded-[2px]" style={{ background: c }} />
                  <span className="text-[11px] font-medium tabular-nums text-mist-200">{i === 0 ? '0' : fmt((max * i) / 4 / 1000)}{i === 3 ? '+' : ''}</span>
                </div>
              ))}
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-mist-200">
              <span className="size-3 rounded-[3px] border-2 border-dashed border-sand-200" />Community-reported ponding
            </span>
          </div>

          {!ready && (
            <div className="absolute inset-0 z-[600] grid place-items-center bg-lagoon-800">
              <span className="animate-pulse-soft text-sm font-semibold text-mist-200">Loading surface data…</span>
            </div>
          )}
        </section>

        {/* SIDE */}
        <aside className="flex max-h-[600px] min-w-0 flex-[1_1_340px] flex-col gap-1.5 overflow-y-auto waha-panel rounded-xl p-[22px]">
          {!sel ? (
            <>
              <div className="flex items-baseline justify-between gap-3 pb-3">
                <h2 className="m-0 text-2xl tracking-tight">Capture zones</h2>
                <button onClick={() => setDrawer(true)} className="cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-aqua-300">Assumptions</button>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-white/10 pb-3.5 pt-3">
                <span className="text-[13px] font-medium text-mist-200">Total capturable</span>
                <span className="flex items-baseline gap-1.5">
                  <span className="font-display text-[30px] font-black tracking-heading">{total ? fmt(total.mid / 1000) : '…'}</span>
                  <span className="text-[13px] font-semibold text-aqua-300">m³ est.</span>
                </span>
              </div>
              {!ready && [1, 2, 3, 4, 5].map((k) => <div key={k} className="my-1.5 h-[58px] animate-pulse-soft rounded-[12px] bg-white/8" />)}
              {rows.map(({ z, e }, i) => (
                <button
                  key={z.id}
                  onClick={() => setSelId(z.id)}
                  className="grid w-full cursor-pointer grid-cols-[24px_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 border-0 border-t border-white/8 bg-transparent px-1 py-3.5 text-left text-mist-50 hover:bg-white/4"
                >
                  <span className="text-xs font-semibold tabular-nums text-mist-300">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-semibold">{z.name}</span>
                    <span className="text-xs text-mist-300">{SURFACES[z.surface]} · {z.district}</span>
                  </span>
                  <span className="text-right text-sm font-semibold tabular-nums">{fmt(e.capturableL.mid / 1000)} m³</span>
                  <span />
                  <span className="col-[2/-1] h-[3px] rounded-full bg-white/8">
                    <span className="block h-full rounded-full" style={{ width: `${(e.capturableL.mid / max) * 100}%`, background: binOf(e.capturableL.mid, max) }} />
                  </span>
                </button>
              ))}
              <div className="pt-3"><SourceNote source={est.source} /></div>
            </>
          ) : (
            <ZoneDetail zone={sel.z} e={sel.e} scenario={`${scen.label}, ${scen.depthMm} ${scen.unit}`} ponding={rainReportsIn(sel.z, reports).length}
              runoffC={a[`rain.c.${sel.z.surface}`].value} capture={a['rain.captureEfficiency'].value} onBack={() => setSelId(null)} onAssumptions={() => setDrawer(true)} />
          )}
        </aside>
      </main>

      <AssumptionsDrawer open={drawer} onClose={() => setDrawer(false)} keys={[...RAIN_KEYS]} formula="Litres = rain depth (mm) × area (m²) × runoff coefficient × capture share" />
    </>
  );
}

function ZoneDetail({ zone, e, scenario, ponding, runoffC, capture, onBack, onAssumptions }: {
  zone: CaptureZone; e: RunoffEstimate; scenario: string; ponding: number; runoffC: number; capture: number;
  onBack: () => void; onAssumptions: () => void;
}) {
  const [how, why] = CAPTURE[zone.surface];
  return (
    <div className="flex animate-fade-up flex-col gap-[18px]">
      <button onClick={onBack} className="cursor-pointer self-start border-0 bg-transparent p-0 text-[13px] font-semibold text-sand-200">← All zones</button>
      <div>
        <h2 className="m-0 text-[26px] leading-[1.05] tracking-tight">{zone.name}</h2>
        <span className="text-[13px] text-mist-300">{zone.district}</span>
      </div>
      {ponding > 0 && (
        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-dashed border-sand-200/60 px-3 py-1.5 text-xs font-semibold text-sand-200">
          Community-reported ponding · {ponding} report{ponding > 1 ? 's' : ''}
        </span>
      )}
      <div className="border-y border-white/10 py-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-mist-200">Capturable volume</span>
          <EstimateBadge />
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="font-display text-[52px] font-black leading-none tracking-display">{fmt(e.capturableL.mid / 1000)}</span>
          <span className="text-sm font-semibold text-aqua-300">m³</span>
        </div>
        <div className="mt-1.5 text-xs font-medium tabular-nums text-mist-300">
          Range {fmt(e.capturableL.low / 1000)} to {fmt(e.capturableL.high / 1000)} m³ · {scenario}
        </div>
      </div>
      <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2.5 text-sm font-medium tabular-nums">
        <dt className="text-mist-200">Surface</dt><dd className="m-0 text-right">{SURFACES[zone.surface]}</dd>
        <dt className="text-mist-200">Area</dt><dd className="m-0 text-right">{fmt(zone.areaM2)} m²</dd>
        <dt className="text-mist-200">Runoff coefficient</dt><dd className="m-0 text-right">{runoffC}</dd>
        <dt className="text-mist-200">Total runoff <span className="text-[11px] text-aqua-300">est.</span></dt><dd className="m-0 text-right">{fmt(e.runoffL.mid / 1000)} m³</dd>
        <dt className="text-mist-200">Share kept</dt><dd className="m-0 text-right">{Math.round(capture * 100)}%</dd>
      </dl>
      <ConfidenceMeter confidence={e.confidence} showReasons />
      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-[.12em] text-sand-200">Suggested capture</span>
        <span className="font-display text-xl font-bold tracking-[-0.035em]">{how}</span>
        <span className="text-[13px] leading-normal text-mist-200">{why}</span>
      </div>
      <div className="flex gap-4 text-xs">
        <button onClick={onAssumptions} className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-aqua-300">Assumptions</button>
        {zone.osm && <a href={zone.osm} target="_blank" rel="noreferrer" className="font-semibold">Outline on OpenStreetMap ↗</a>}
      </div>
    </div>
  );
}
