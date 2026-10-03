import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CircleMarker, Polygon, Tooltip } from 'react-leaflet';
import { BUILDING_TYPE_LABELS, RAIN_SCENARIOS } from '@waha/shared';
import { api, useApi } from '../api';
import { placeOf } from './Community';
import { useAssumptionStore } from '../store/assumptions';
import { useReports } from '../store/reports';
import { BaseMap, FitTo } from '../ui/BaseMap';
import { Nav, SourceNote } from '../ui/Layout';
import { StatusActions } from '../ui/StatusActions';
import { ConfidenceMeter, KIND_META, StatusChip, cx, fmt, fmtDate } from '../ui/kit';

type Layer = 'reports' | 'buildings' | 'rainfall' | 'communities';
const LAYERS: Record<Layer, { label: string; color: string }> = {
  reports: { label: 'Community reports', color: '#E8C56B' },
  buildings: { label: 'Building condensate', color: '#8EEDF0' },
  rainfall: { label: 'Rain catchments', color: '#A9B8FF' },
  communities: { label: 'Neighbourhood groups', color: '#F0DEB8' },
};
const NORMAL = RAIN_SCENARIOS.find((s) => s.key === 'normal')!;

export function MapPage() {
  const overrides = useAssumptionStore((s) => s.overrides);
  const reports = useReports((s) => s.reports);
  const [on, setOn] = useState<Record<Layer, boolean>>({ reports: true, buildings: true, rainfall: true, communities: true });
  const [sel, setSel] = useState<{ layer: Layer; id: string } | null>(null);

  const analyses = useApi(() => api.analyzeBuildings(overrides, reports), [overrides, reports]);
  const zones = useApi(() => api.zones(), []);
  const runoff = useApi(
    () => zones.data?.length
      ? api.runoff(zones.data.map((z) => ({ areaM2: z.areaM2, surface: z.surface, areaSource: 'mapped' as const })), NORMAL.depthMm, overrides)
      : Promise.resolve({ data: [], source: 'browser' as const }),
    [zones.data, overrides],
  );
  const communities = useApi(() => api.communities(overrides, reports), [overrides, reports]);

  const counts: Record<Layer, number> = {
    reports: reports.length,
    buildings: analyses.data?.length ?? 0,
    rainfall: zones.data?.length ?? 0,
    communities: communities.data?.length ?? 0,
  };
  const toggle = (l: Layer) => {
    setOn((o) => ({ ...o, [l]: !o[l] }));
    if (sel?.layer === l) setSel(null);
  };
  const isSel = (layer: Layer, id: string) => sel?.layer === layer && sel.id === id;
  const allPoints = [...reports.map((r) => [r.lat, r.lng] as [number, number]), ...(analyses.data ?? []).map((x) => [x.building.lat, x.building.lng] as [number, number])];

  return (
    <div className="flex h-dvh min-h-[640px] flex-col bg-[#06384A]">
      <div className="absolute inset-x-0 top-0 z-[1100]"><Nav /></div>
      <main className="relative flex flex-1">
        <div className="absolute inset-0 z-0">
          <BaseMap zoom={11}>
            {on.communities && communities.data?.map((c) => c.hull && (
              <Polygon key={c.id} positions={c.hull.map(([lng, lat]) => [lat, lng] as [number, number])}
                pathOptions={{ color: LAYERS.communities.color, weight: isSel('communities', c.id) ? 2.5 : 1.2, dashArray: '5 6', fillColor: LAYERS.communities.color, fillOpacity: isSel('communities', c.id) ? 0.16 : 0.07 }}
                eventHandlers={{ click: () => setSel({ layer: 'communities', id: c.id }) }}>
                <Tooltip sticky>{c.name}</Tooltip>
              </Polygon>
            ))}
            {on.rainfall && zones.data?.map((z) => (
              <Polygon key={z.id} positions={z.ring.map(([lng, lat]) => [lat, lng] as [number, number])}
                pathOptions={{ color: LAYERS.rainfall.color, weight: isSel('rainfall', z.id) ? 3 : 1, fillColor: LAYERS.rainfall.color, fillOpacity: isSel('rainfall', z.id) ? 0.55 : 0.3 }}
                eventHandlers={{ click: () => setSel({ layer: 'rainfall', id: z.id }) }}>
                <Tooltip sticky>{z.name}</Tooltip>
              </Polygon>
            ))}
            {on.rainfall && zones.data?.map((z) => (
              <CircleMarker key={`${z.id}-dot`} center={[z.lat, z.lng]} radius={isSel('rainfall', z.id) ? 7 : 4}
                pathOptions={{ color: '#04141C', weight: 1, fillColor: LAYERS.rainfall.color, fillOpacity: 0.95 }}
                eventHandlers={{ click: () => setSel({ layer: 'rainfall', id: z.id }) }}>
                <Tooltip direction="top">{z.name}</Tooltip>
              </CircleMarker>
            ))}
            {on.buildings && analyses.data?.map((x) => {
              const s = isSel('buildings', x.building.id);
              // Marker area grows with condensate, so a mall reads bigger than a bakery. Display scaling only.
              const r = 5 + Math.sqrt(x.engineering.dailyL.mid) / 12;
              return (
                <CircleMarker key={x.building.id} center={[x.building.lat, x.building.lng]} radius={s ? r + 3 : r}
                  pathOptions={{ color: s ? '#F4F9F9' : '#04141C', weight: s ? 3 : 1.5, fillColor: LAYERS.buildings.color, fillOpacity: 0.9 }}
                  eventHandlers={{ click: () => setSel({ layer: 'buildings', id: x.building.id }) }}>
                  <Tooltip direction="top">{x.building.name}</Tooltip>
                </CircleMarker>
              );
            })}
            {on.reports && reports.map((rep) => {
              const s = isSel('reports', rep.id);
              return (
                <CircleMarker key={rep.id} center={[rep.lat, rep.lng]} radius={s ? 10 : 7}
                  pathOptions={{ color: s ? '#F4F9F9' : '#04141C', weight: s ? 3 : 1.5, fillColor: LAYERS.reports.color, fillOpacity: 0.95 }}
                  eventHandlers={{ click: () => setSel({ layer: 'reports', id: rep.id }) }}>
                  <Tooltip direction="top">{rep.title}</Tooltip>
                </CircleMarker>
              );
            })}
            <FitTo points={allPoints} fitKey={analyses.data ? 'ready' : 'waiting'} maxZoom={12} />
          </BaseMap>
        </div>

        <aside className="relative z-[500] m-4 mt-[92px] flex max-h-[calc(100%-108px)] w-[min(360px,calc(100%-32px))] flex-col gap-5 self-start overflow-y-auto rounded-xl border border-white/14 bg-[rgb(5_44_60/.88)] p-[22px] backdrop-blur-[18px]">
          <div>
            <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-[.14em] text-sand-200">Water map</p>
            <h1 className="m-0 text-[32px] leading-none tracking-heading">Where the water is</h1>
          </div>
          <div className="flex flex-col gap-1.5">
            {(Object.keys(LAYERS) as Layer[]).map((l) => (
              <button key={l} onClick={() => toggle(l)} aria-pressed={on[l]}
                className={cx('flex cursor-pointer items-center gap-3 rounded-[14px] border px-3.5 py-3 text-left text-sm font-semibold text-mist-50',
                  on[l] ? 'border-white/22 bg-white/7' : 'border-white/8 bg-transparent')}>
                <span className="size-3 flex-none rounded-full" style={{ background: LAYERS[l].color, opacity: on[l] ? 1 : 0.25 }} />
                <span className="flex-1">{LAYERS[l].label}</span>
                <span className="font-medium tabular-nums text-mist-300">{counts[l]}</span>
              </button>
            ))}
          </div>
          <Detail sel={sel} analyses={analyses.data} zones={zones.data} runoff={runoff.data} communities={communities.data} reports={reports} />
          <SourceNote source={analyses.source} />
        </aside>
      </main>
    </div>
  );
}

type DetailProps = {
  sel: { layer: Layer; id: string } | null;
  analyses?: Awaited<ReturnType<typeof api.analyzeBuildings>>['data'];
  zones?: Awaited<ReturnType<typeof api.zones>>['data'];
  runoff?: Awaited<ReturnType<typeof api.runoff>>['data'];
  communities?: Awaited<ReturnType<typeof api.communities>>['data'];
  reports: ReturnType<typeof useReports.getState>['reports'];
};

function Detail({ sel, analyses, zones, runoff, communities, reports }: DetailProps) {
  if (!sel) return <p className="m-0 text-[13px] leading-normal text-mist-300">Select a point or shape for details.</p>;
  const shell = (kind: string, color: string, title: string, body: ReactNode, cta: [string, string]) => (
    <div className="flex animate-fade-up flex-col gap-2 border-t border-white/12 pt-[18px]">
      <span className="text-xs font-semibold" style={{ color }}>{kind}</span>
      <h2 className="m-0 font-display text-xl font-bold tracking-[-0.035em]">{title}</h2>
      {body}
      <Link to={cta[1]} className="mt-1.5 self-start rounded-full bg-sand-400 px-[18px] py-2.5 text-[13px] font-semibold text-lagoon-950 hover:bg-sand-300 hover:text-lagoon-950">{cta[0]}</Link>
    </div>
  );
  const metric = (label: string, value: string, note?: string) => (
    <div className="flex flex-col pt-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-mist-300">{label}</span>
        <span className="font-display text-[22px] font-bold tabular-nums tracking-[-0.03em]">{value}</span>
      </div>
      {note && <span className="text-right text-xs tabular-nums text-mist-300">{note}</span>}
    </div>
  );

  if (sel.layer === 'reports') {
    const r = reports.find((x) => x.id === sel.id);
    if (!r) return null;
    return shell(KIND_META[r.kind].label, LAYERS.reports.color, r.title, (
      <>
        <p className="m-0 text-sm leading-normal text-mist-200">{r.description}</p>
        <div className="flex flex-wrap items-center gap-2"><StatusChip status={r.status} /></div>
        <span className="text-xs text-mist-300">{placeOf(r)} · {fmtDate(r.createdAt)}</span>
        <StatusActions report={r} />
      </>
    ), ['Open in Community', '/community']);
  }
  if (sel.layer === 'buildings') {
    const x = analyses?.find((a) => a.building.id === sel.id);
    if (!x) return null;
    return shell(BUILDING_TYPE_LABELS[x.building.type], LAYERS.buildings.color, x.building.name, (
      <>
        <p className="m-0 text-sm leading-normal text-mist-200">{x.building.floorAreaNote}</p>
        {metric('Condensate per day', `${fmt(x.engineering.dailyL.mid)} L`, `range ${fmt(x.engineering.dailyL.low)} to ${fmt(x.engineering.dailyL.high)}`)}
        {metric('Opportunity score', `${x.score.score.mid} / 100`)}
        <ConfidenceMeter confidence={x.engineering.confidence} />
      </>
    ), ['Estimate this building', `/buildings?id=${x.building.id}`]);
  }
  if (sel.layer === 'rainfall') {
    const i = zones?.findIndex((z) => z.id === sel.id) ?? -1;
    const z = zones?.[i];
    const e = runoff?.[i];
    if (!z || !e) return null;
    return shell('Rain catchment', LAYERS.rainfall.color, z.name, (
      <>
        <p className="m-0 text-sm leading-normal text-mist-200">{fmt(z.areaM2)} m² traced from OpenStreetMap · {z.district}</p>
        {metric('Capturable, normal year', `${fmt(e.capturableL.mid / 1000)} m³`, `range ${fmt(e.capturableL.low / 1000)} to ${fmt(e.capturableL.high / 1000)}`)}
      </>
    ), ['See rainfall data', '/rainfall']);
  }
  const c = communities?.find((x) => x.id === sel.id);
  if (!c) return null;
  return shell('Neighbourhood group', LAYERS.communities.color, c.name, (
    <>
      <p className="m-0 text-sm leading-normal text-mist-200">{c.buildingIds.length} building{c.buildingIds.length === 1 ? '' : 's'} and {c.reportIds.length} report{c.reportIds.length === 1 ? '' : 's'} within reach of each other.</p>
      {metric('Condensate between them', `${fmt(c.condensateL.mid / 1000)} m³/yr`)}
      <ConfidenceMeter confidence={c.confidence} />
    </>
  ), ['Open in Community', '/community']);
}
