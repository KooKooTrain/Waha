import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CircleMarker, Tooltip } from 'react-leaflet';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip as ChartTip, XAxis } from 'recharts';
import {
  BUILDINGS, BUILDING_TYPES, BUILDING_TYPE_LABELS, districtOf,
  type AssumptionOverrides, type Building, type BuildingAnalysis, type BuildingType,
} from '@waha/shared';
import { api, type Source } from '../api';
import { useAssumptionStore, useAssumptions } from '../store/assumptions';
import { useReports } from '../store/reports';
import { AssumptionsDrawer, buildingAssumptionKeys } from '../ui/AssumptionsDrawer';
import { BaseMap, FlyTo } from '../ui/BaseMap';
import { PageHeader, SourceNote } from '../ui/Layout';
import { ConfidenceMeter, EstimateBadge, RangeBar, cx, fmt } from '../ui/kit';

type Form = { name: string; type: BuildingType; area: string; hours: number; tonnage: string; freshAir: string };
type Request = { building: Building; extra: AssumptionOverrides };

// Qualitative only. We don't have sourced costs or paybacks, so we don't show any.
const RETROFITS = [
  { tier: 'Tier 1', name: 'Collect and reuse on site', desc: 'Gravity drain from the air-handler trays to a tank, then drip irrigation.', line: 'border-aqua-300' },
  { tier: 'Tier 2', name: 'Treat and pump', desc: 'Filter, UV and a booster pump into the irrigation network.', line: 'border-aqua-400' },
  { tier: 'Tier 3', name: 'Integrated dual supply', desc: 'Feeds toilet flushing and cooling-tower make-up, metered through the building management system.', line: 'border-sand-200' },
];

const input = 'w-full rounded-[12px] border border-white/16 bg-[rgb(4_30_42/.55)] px-3.5 py-3 text-[15px] font-medium text-mist-50 outline-none focus:border-aqua-300';
const exact = (v: number) => ({ value: v, low: v, high: v });

export function Buildings() {
  const a = useAssumptions();
  const overrides = useAssumptionStore((s) => s.overrides);
  const reports = useReports((s) => s.reports);

  const [base, setBase] = useState<Building | null>(null);
  const [form, setForm] = useState<Form>({ name: '', type: 'office', area: '', hours: 0, tonnage: '', freshAir: '' });
  const [hoursTouched, setHoursTouched] = useState(false);
  const [loc, setLoc] = useState<[number, number] | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [request, setRequest] = useState<Request | null>(null);
  const [out, setOut] = useState<{ x?: BuildingAnalysis; source?: Source; loading: boolean }>({ loading: false });

  const defaultHours = a[`profile.${form.type}.hours`].value;
  const hours = hoursTouched ? form.hours : defaultHours;
  const area = Number(form.area);
  const canCalc = area > 0 && !!loc;

  // Re-run whenever the request, the assumptions or the reports change.
  useEffect(() => {
    if (!request) return;
    let live = true;
    setOut((o) => ({ ...o, loading: true }));
    api.analyzeBuilding(request.building, { ...overrides, ...request.extra }, reports)
      .then((r) => live && setOut({ x: r.data, source: r.source, loading: false }));
    return () => {
      live = false;
    };
  }, [request, overrides, reports]);

  const pick = (b: Building) => {
    setBase(b);
    setForm({ name: b.name, type: b.type, area: String(b.floorAreaM2), hours: 0, tonnage: '', freshAir: '' });
    setHoursTouched(false);
    setLoc([b.lat, b.lng]);
    setAdvanced(false);
  };

  const edit = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }));
    if ('name' in patch || 'type' in patch || 'area' in patch) setBase(null);
  };

  const calculate = () => {
    if (!canCalc) return;
    const building: Building = base ?? {
      id: 'your-building', name: form.name.trim() || 'Your building', type: form.type, district: districtOf(loc[0]),
      lat: loc[0], lng: loc[1], roofAreaM2: 0, floorAreaM2: area, floorAreaSource: 'documented',
      floorAreaNote: 'Floor area entered by you', sources: [],
    };
    // Anything the owner actually knows replaces a default, with no range around it.
    const extra: AssumptionOverrides = {};
    if (hoursTouched) extra[`profile.${form.type}.hours`] = exact(form.hours);
    if (Number(form.tonnage) > 0) extra[`profile.${form.type}.m2PerTon`] = exact(area / Number(form.tonnage));
    if (Number(form.freshAir) > 0) {
      extra[`profile.${form.type}.oa`] = exact((Number(form.freshAir) * 1000) / area); // m³/s to L/s per m²
      extra['condensate.oaDelivered'] = exact(1);
    }
    setOut({ loading: true });
    setRequest({ building, extra });
  };

  // Deep links from the map and dashboard: /buildings?id=adnoc-hq opens straight on that building.
  const [params] = useSearchParams();
  useEffect(() => {
    const hit = BUILDINGS.find((o) => o.id === params.get('id'));
    if (!hit) return;
    pick(hit);
    setOut({ loading: true });
    setRequest({ building: hit, extra: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const x = out.x;
  const b = request?.building;

  return (
    <>
      <PageHeader overline="Building water recovery" title="What does your building drain?">
        <p className="m-0 max-w-[42ch] text-base leading-relaxed text-mist-50">
          Air conditioning pulls water out of humid air. Pick a real Abu Dhabi building or describe your own to see how much condensate it could recover.
        </p>
      </PageHeader>

      <main className="mx-auto grid max-w-[1180px] items-start gap-6 px-4 pb-24 pt-2 sm:px-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* FORM */}
        <section className="flex flex-col gap-[22px] rounded-xl border border-white/12 bg-[rgb(5_44_60/.84)] p-7 shadow-[inset_0_1px_0_rgb(255_255_255/.1)] backdrop-blur-[18px]">
          <label className="flex flex-col gap-2 text-[13px] font-semibold text-sand-200">
            Try a real building
            <select
              value={base?.id ?? ''}
              onChange={(e) => { const hit = BUILDINGS.find((o) => o.id === e.target.value); if (hit) pick(hit); }}
              className="w-full cursor-pointer appearance-none rounded-[12px] border border-sand-400/35 bg-sand-400/8 px-3.5 py-3 text-[15px] font-medium text-mist-50"
            >
              <option value="" className="bg-lagoon-900">Choose one…</option>
              {BUILDINGS.map((o) => (
                <option key={o.id} value={o.id} className="bg-lagoon-900">{o.name} · {BUILDING_TYPE_LABELS[o.type]} · {o.district}</option>
              ))}
            </select>
          </label>

          <div className="h-px bg-white/10" />

          <label className="flex flex-col gap-2 text-[13px] font-semibold">
            Building name
            <input value={form.name} onChange={(e) => edit({ name: e.target.value })} placeholder="e.g. Al Wahda Tower" className={input} maxLength={120} />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold">Location</span>
            <div className="flex items-center justify-between gap-3 rounded-[12px] border border-dashed border-white/24 bg-[rgb(4_30_42/.35)] px-3.5 py-3">
              <span className={cx('text-[15px] font-medium', loc ? 'text-mist-50' : 'text-mist-300')}>
                {loc ? `${districtOf(loc[0])} · ${loc[0].toFixed(4)}, ${loc[1].toFixed(4)}` : 'No location set'}
              </span>
              <span className="whitespace-nowrap text-xs font-medium text-mist-300">Click the map</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-[13px] font-semibold">
              Building type
              <select value={form.type} onChange={(e) => { edit({ type: e.target.value as BuildingType }); setHoursTouched(false); }} className={cx(input, 'cursor-pointer appearance-none')}>
                {BUILDING_TYPES.map((t) => <option key={t} value={t} className="bg-lagoon-900">{BUILDING_TYPE_LABELS[t]}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-[13px] font-semibold">
              Floor area (m²)
              <input type="number" min={0} value={form.area} onChange={(e) => edit({ area: e.target.value })} className={cx(input, 'tabular-nums')} />
            </label>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="hours" className="text-[13px] font-semibold">Cooling hours per day</label>
              <span className="text-[15px] font-semibold tabular-nums text-sand-200">
                {hours} h{!hoursTouched && <span className="text-xs font-medium text-mist-300"> default</span>}
              </span>
            </div>
            <input
              id="hours" type="range" min={1} max={24} step={1} value={hours}
              onChange={(e) => { setForm((f) => ({ ...f, hours: Number(e.target.value) })); setHoursTouched(true); }}
              className="w-full cursor-pointer accent-sand-400"
            />
          </div>

          <div className="flex flex-col gap-4 border-t border-white/10 pt-[18px]">
            <button onClick={() => setAdvanced((v) => !v)} className="flex cursor-pointer items-center justify-between border-0 bg-transparent p-0 text-sm font-semibold text-mist-50">
              <span>Advanced inputs</span>
              <span className="text-[13px] font-medium text-sand-200">{advanced ? 'Hide' : 'Raises confidence'}</span>
            </button>
            {advanced && (
              <div className="flex animate-fade-up flex-col gap-4">
                <p className="m-0 text-[13px] leading-relaxed text-mist-200">Measured values replace the defaults worked out from floor area. Each one narrows the range.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-[13px] font-semibold">
                    Cooling capacity (TR)
                    <input type="number" min={0} value={form.tonnage} onChange={(e) => setForm((f) => ({ ...f, tonnage: e.target.value }))} className={input} />
                  </label>
                  <label className="flex flex-col gap-2 text-[13px] font-semibold">
                    Fresh-air flow (m³/s)
                    <input type="number" min={0} step={0.1} value={form.freshAir} onChange={(e) => setForm((f) => ({ ...f, freshAir: e.target.value }))} className={input} />
                  </label>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={calculate}
            disabled={!canCalc || (out.loading && !x)}
            className={cx(
              'mt-1 rounded-full border-0 px-6 py-3.5 text-[15px] font-semibold text-lagoon-950 shadow-cta',
              canCalc ? 'cursor-pointer bg-sand-400 hover:bg-sand-300' : 'cursor-not-allowed bg-sand-400/40',
            )}
          >
            {out.loading && !x ? 'Calculating…' : !(area > 0) ? 'Enter a floor area to calculate' : !loc ? 'Click the map to place it' : 'Calculate recovery'}
          </button>
        </section>

        {/* MAP + RESULT */}
        <div className="flex min-w-0 flex-col gap-6">
          <div className="relative h-[300px] overflow-hidden rounded-xl border border-white/16">
            <BaseMap zoom={11} crosshair onClick={(e) => { setLoc([e.latlng.lat, e.latlng.lng]); setBase(null); }}>
              {BUILDINGS.map((o) => (
                <CircleMarker
                  key={o.id} center={[o.lat, o.lng]} radius={5}
                  pathOptions={{ color: '#04141C', weight: 1.5, fillColor: '#8EEDF0', fillOpacity: 0.9 }}
                  eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); pick(o); } }}
                >
                  <Tooltip direction="top">{o.name}</Tooltip>
                </CircleMarker>
              ))}
              {loc && (
                <>
                  <CircleMarker center={loc} radius={22} pathOptions={{ stroke: false, fillColor: '#F0DEB8', fillOpacity: 0.22 }} interactive={false} />
                  <CircleMarker center={loc} radius={9} pathOptions={{ color: '#04141C', weight: 2, fillColor: '#F0DEB8', fillOpacity: 1 }} interactive={false} />
                </>
              )}
              <FlyTo to={loc ?? undefined} zoom={13} />
            </BaseMap>
            <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-full border border-white/20 bg-[rgb(4_40_56/.62)] px-3 py-2 text-xs font-semibold backdrop-blur-[16px]">
              {loc ? districtOf(loc[0]) : 'Click to place your building, or pick a dot'}
            </div>
          </div>

          {!request && (
            <section className="flex flex-col items-center gap-3.5 border-t border-white/30 px-7 py-14 text-center">
              <h2 className="m-0 text-[28px] tracking-tight">No estimate yet</h2>
              <p className="m-0 max-w-[38ch] text-[15px] leading-relaxed">Fill in the form or pick a real building, then calculate. Results show up here with their range and assumptions.</p>
            </section>
          )}

          {request && !x && (
            <section className="flex flex-col gap-[18px] rounded-xl border border-white/12 bg-[rgb(5_44_60/.84)] p-7">
              <span className="text-[13px] font-semibold text-sand-200">Calculating…</span>
              <div className="h-14 w-[55%] animate-pulse-soft rounded-[12px] bg-white/10" />
              <div className="h-2.5 animate-pulse-soft rounded-full bg-white/10" />
              <div className="h-[120px] animate-pulse-soft rounded-[12px] bg-white/10" />
            </section>
          )}

          {x && b && (
            <section className={cx(
              'flex animate-fade-up flex-col gap-7 rounded-xl border border-white/12 bg-[rgb(5_44_60/.86)] p-7 shadow-[inset_0_1px_0_rgb(255_255_255/.1)] backdrop-blur-[18px] transition-opacity',
              out.loading && 'opacity-60',
            )}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold">{b.name}</div>
                  <div className="mt-0.5 text-[13px] text-mist-300">
                    {BUILDING_TYPE_LABELS[b.type]} · {fmt(b.floorAreaM2)} m² · {hours} h/day · {b.district}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <EstimateBadge />
                  <button onClick={() => setDrawer(true)} className="cursor-pointer rounded-full border border-white/20 bg-white/6 px-3.5 py-[7px] text-[13px] font-semibold text-mist-50 hover:bg-white/12">
                    Assumptions
                  </button>
                </div>
              </div>

              <div className="grid items-end gap-x-8 gap-y-6 sm:grid-cols-2">
                <div>
                  <div className="text-[13px] font-medium text-mist-200">Recoverable condensate</div>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-[clamp(56px,6vw,76px)] font-black leading-[.95] tracking-display">{fmt(x.engineering.dailyL.mid)}</span>
                    <span className="text-[15px] font-semibold text-aqua-300">L/day likely</span>
                  </div>
                </div>
                <div className="border-l border-white/14 pl-5">
                  <div className="text-[13px] font-medium text-mist-200">Per year</div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-display text-[40px] font-black leading-none tracking-heading">{fmt(x.engineering.annualL.mid / 1000)}</span>
                    <span className="text-sm font-semibold text-aqua-300">m³</span>
                  </div>
                </div>
              </div>

              <RangeBar range={x.engineering.dailyL} unit="L/day" label="Condensate per day" />

              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-y border-white/10 py-4">
                <ConfidenceMeter confidence={x.engineering.confidence} showReasons />
                <div className="text-[13px] text-mist-200">
                  Rule-of-thumb check (Guz 2005): <span className="font-semibold tabular-nums text-mist-50">{fmt(x.quick.dailyL.mid)} L/day</span>
                  <div className="text-xs tabular-nums text-mist-300">range {fmt(x.quick.dailyL.low)} to {fmt(x.quick.dailyL.high)}</div>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="m-0 text-xl font-bold tracking-tight">Monthly condensate</h3>
                  <span className="text-xs font-medium text-mist-300">Likely litres per month · peaks with summer humidity</span>
                </div>
                <MonthlyBars data={x.engineering.monthlyL} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Fact label="Opportunity score" value={`${x.score.score.mid} / 100`} note={`Range ${x.score.score.low} to ${x.score.score.high}`} />
                {b.roofAreaM2 > 0 && (
                  <Fact
                    label="Rain its roof could also catch"
                    value={`${fmt(x.rainfall.capturableL.mid / 1000)} m³ a year`}
                    note={`${fmt(b.roofAreaM2)} m² roof, normal year`}
                  />
                )}
              </div>

              <div>
                <h3 className="m-0 mb-3.5 text-xl font-bold tracking-tight">Retrofit options</h3>
                <div className="grid gap-y-2 sm:grid-cols-3">
                  {RETROFITS.map((t) => (
                    <div key={t.tier} className={cx('mr-[18px] flex flex-col gap-2.5 border-t-2 py-[18px] pr-[18px]', t.line)}>
                      <span className="text-[11px] font-semibold uppercase tracking-[.12em] text-sand-200">{t.tier}</span>
                      <span className="font-display text-lg font-bold leading-tight tracking-[-0.035em]">{t.name}</span>
                      <span className="text-[13px] leading-normal text-mist-200">{t.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-mist-300">
                <span>
                  {b.floorAreaNote}
                  {b.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="ml-3">{s.label} ↗</a>)}
                </span>
                <SourceNote source={out.source} />
              </div>
            </section>
          )}
        </div>
      </main>

      <AssumptionsDrawer open={drawer} onClose={() => setDrawer(false)} keys={buildingAssumptionKeys(b?.type ?? form.type)} formula={x?.engineering.formula} />
    </>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/4 p-4">
      <span className="text-[13px] font-medium text-mist-200">{label}</span>
      <span className="font-display text-2xl font-bold tabular-nums tracking-tight">{value}</span>
      <span className="text-xs text-mist-300">{note}</span>
    </div>
  );
}

function MonthlyBars({ data }: { data: { month: string; mid: number }[] }) {
  const peak = Math.max(...data.map((d) => d.mid));
  return (
    <div className="mt-[18px] h-[170px]" role="img" aria-label={`Monthly condensate, highest in ${data.find((d) => d.mid === peak)?.month}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#A8C3C9', fontSize: 11 }} interval={0} />
          <ChartTip
            cursor={{ fill: 'rgb(255 255 255 / .05)' }}
            formatter={(v) => [`${fmt(Number(v))} L`, 'Likely']}
            contentStyle={{ background: 'rgb(4 40 56 / .95)', border: '1px solid rgb(255 255 255 / .2)', borderRadius: 10, color: '#EEF5F6', fontSize: 12 }}
            labelStyle={{ color: '#A8C3C9' }}
          />
          <Bar dataKey="mid" radius={[6, 6, 2, 2]}>
            {data.map((d) => <Cell key={d.month} fill={d.mid >= peak * 0.88 ? '#8EEDF0' : 'rgb(142 237 240 / .42)'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
