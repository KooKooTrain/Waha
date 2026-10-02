import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, Polygon, Tooltip } from 'react-leaflet';
import { X } from 'lucide-react';
import {
  BUILDINGS, REPORT_STATUSES, ReportInputSchema, STATUS_LABELS, districtOf,
  type Report, type ReportKind, type ReportStatus,
} from '@waha/shared';
import { api, useApi } from '../api';
import { useAssumptionStore } from '../store/assumptions';
import { useReports } from '../store/reports';
import { ROLE_LABELS, useRole } from '../store/role';
import { StatusActions } from '../ui/StatusActions';
import { BaseMap, FitTo, FlyTo, InvalidateSize } from '../ui/BaseMap';
import { PageHeader, SourceNote } from '../ui/Layout';
import { ConfidenceMeter, EstimateBadge, KIND_META, STATUS_HEX, StatusChip, StatusTimeline, cx, fmt, fmtDate } from '../ui/kit';

const byId = new Map(BUILDINGS.map((b) => [b.id, b]));
export const placeOf = (r: Report) => (r.buildingId && byId.get(r.buildingId)?.name) || districtOf(r.lat);

const chip = (on: boolean) => on ? 'border-mist-50 bg-mist-50 text-lagoon-950' : 'border-white/22 bg-[rgb(4_40_56/.5)] text-mist-50';

export function Community() {
  const reports = useReports((s) => s.reports);
  const source = useReports((s) => s.source);
  const overrides = useAssumptionStore((s) => s.overrides);
  const [kind, setKind] = useState<'all' | ReportKind>('all');
  const [status, setStatus] = useState<'all' | ReportStatus>('all');
  const [focus, setFocus] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const communities = useApi(() => api.communities(overrides, reports), [overrides, reports]);
  const role = useRole((s) => s.role);

  const list = reports.filter((r) => (kind === 'all' || r.kind === kind) && (status === 'all' || r.status === status));
  const focused = reports.find((r) => r.id === focus);

  return (
    <>
      <PageHeader
        wide
        overline="Community"
        title="Seen water where it shouldn’t be?"
        intro="Report AC water running to waste, rain that pools, or a leak. Every report gets reviewed and goes on the shared water map."
      >
        <button onClick={() => setFormOpen(true)} className="cursor-pointer rounded-full border-0 bg-sand-400 px-6 py-3.5 text-[15px] font-semibold text-lagoon-950 shadow-cta hover:bg-sand-300">
          Report an opportunity
        </button>
      </PageHeader>

      {role === 'authority' && (
        <div className="mx-auto max-w-[1280px] px-4 pb-4 sm:px-6">
          <p className="m-0 rounded-md border border-sand-400/35 bg-sand-400/10 px-4 py-3 text-sm text-sand-200">
            You’re reviewing as the authority. Open any report to move it along. Every change shows up on the map and the dashboard straight away.
          </p>
        </div>
      )}

      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 pb-5 sm:px-6">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'condensate', 'rainfall', 'leak'] as const).map((k) => (
            <button key={k} onClick={() => { setKind(k); setFocus(null); }} aria-pressed={kind === k}
              className={cx('inline-flex cursor-pointer items-center gap-[7px] rounded-full border px-3.5 py-2 text-[13px] font-semibold', chip(kind === k))}>
              {k === 'all' ? 'All' : KIND_META[k].label}
              <span className="font-medium tabular-nums opacity-75">{k === 'all' ? reports.length : reports.filter((r) => r.kind === k).length}</span>
            </button>
          ))}
        </div>
        <select
          value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setFocus(null); }} aria-label="Filter by status"
          className="cursor-pointer appearance-none rounded-full border border-white/25 bg-[rgb(4_40_56/.62)] px-4 py-[9px] text-[13px] font-semibold text-mist-50"
        >
          <option value="all" className="bg-lagoon-900">All statuses</option>
          {REPORT_STATUSES.map((s) => <option key={s} value={s} className="bg-lagoon-900">{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      <main className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-6 px-4 pb-24 sm:px-6">
        <section className="min-w-0 flex-[999_1_560px] rounded-xl border border-white/12 bg-[rgb(5_44_60/.86)] px-6 py-2 shadow-[inset_0_1px_0_rgb(255_255_255/.1)] backdrop-blur-[18px]">
          {list.length === 0 && (
            <div className="flex flex-col items-center gap-2.5 px-4 py-16 text-center">
              <span className="font-display text-2xl font-black tracking-tight">No reports match</span>
              <span className="max-w-[36ch] text-sm leading-normal text-mist-200">Try another type or status, or be the first to report one here.</span>
              <button onClick={() => { setKind('all'); setStatus('all'); }} className="mt-1.5 cursor-pointer rounded-full border border-white/25 bg-white/6 px-4 py-[9px] text-[13px] font-semibold text-mist-50">Clear filters</button>
            </div>
          )}
          {list.map((r) => {
            const { Icon, label } = KIND_META[r.kind];
            const open = r.id === focus;
            return (
              <article key={r.id} className="animate-fade-up border-b border-white/8 py-[18px] last:border-b-0">
                <button onClick={() => setFocus(open ? null : r.id)} aria-expanded={open} className="flex w-full cursor-pointer gap-4 border-0 bg-transparent p-0 text-left text-mist-50">
                  <span className="grid size-[72px] flex-none place-items-center rounded-[14px] border border-white/12 bg-white/4 sm:size-[88px]">
                    <Icon size={24} strokeWidth={1.75} className="text-aqua-300" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                      <span className="inline-flex items-center gap-[7px] text-xs font-semibold text-sand-200">{label}</span>
                      <span className="flex items-center gap-2">{r.sample && <EstimateBadge kind="sample" />}<StatusChip status={r.status} /></span>
                    </span>
                    <span className="text-[15px] font-medium leading-snug text-mist-50">{r.title}</span>
                    {r.description !== r.title && <span className="text-sm leading-snug text-mist-200">{r.description}</span>}
                    <span className="text-[13px] text-mist-300">{placeOf(r)} · {fmtDate(r.createdAt)}</span>
                  </span>
                </button>
                {open && (
                  <div className="mt-4 flex animate-fade-up flex-col gap-3 pl-0 sm:pl-[104px]">
                    <StatusTimeline report={r} />
                    <StatusActions report={r} />
                  </div>
                )}
              </article>
            );
          })}
          <div className="py-3"><SourceNote source={source} /></div>
        </section>

        <aside className="flex min-w-0 flex-[1_1_360px] flex-col gap-6 lg:sticky lg:top-6">
          <div className="relative h-[460px] overflow-hidden rounded-xl border border-white/16">
            <BaseMap zoom={11}>
              {communities.data?.map((c) => c.hull && (
                <Polygon key={c.id} positions={c.hull.map(([lng, lat]) => [lat, lng] as [number, number])}
                  pathOptions={{ color: '#F0DEB8', weight: 1, dashArray: '4 6', fillColor: '#F0DEB8', fillOpacity: 0.06 }}>
                  <Tooltip sticky>{c.name}</Tooltip>
                </Polygon>
              ))}
              {list.map((r) => (
                <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={r.id === focus ? 10 : 7}
                  pathOptions={{ color: r.id === focus ? '#F4F9F9' : '#04141C', weight: r.id === focus ? 3 : 1.5, fillColor: STATUS_HEX[r.status], fillOpacity: 0.95 }}
                  eventHandlers={{ click: () => setFocus(r.id) }}>
                  <Tooltip direction="top" offset={[0, -8]}>{KIND_META[r.kind].label} · {placeOf(r)}</Tooltip>
                </CircleMarker>
              ))}
              <FitTo points={list.map((r) => [r.lat, r.lng])} fitKey={`${kind}-${status}-${list.length}`} maxZoom={12} />
              <FlyTo to={focused ? [focused.lat, focused.lng] : undefined} zoom={14} />
            </BaseMap>
            <div className="pointer-events-none absolute left-3 top-3 z-[600] rounded-full border border-white/20 bg-[rgb(4_40_56/.62)] px-3 py-2 text-xs font-semibold backdrop-blur-[16px]">
              {list.length} report{list.length === 1 ? '' : 's'} on map
            </div>
          </div>

          <section className="flex flex-col gap-1 rounded-xl border border-white/12 bg-[rgb(5_44_60/.86)] p-[22px] backdrop-blur-[18px]">
            <h2 className="m-0 text-xl font-bold tracking-tight">Neighbourhood groups</h2>
            <p className="m-0 mb-2 text-[13px] leading-normal text-mist-200">
              Buildings and open reports close enough to share a tank, a tanker run or a pipe. Found by clustering, not drawn by hand.
            </p>
            {communities.data?.map((c) => (
              <div key={c.id} className="flex flex-col gap-1.5 border-t border-white/8 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold">{c.name}</span>
                  <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{fmt(c.condensateL.mid / 1000)} m³/yr</span>
                </div>
                <span className="text-xs text-mist-300">
                  {c.buildingIds.length} building{c.buildingIds.length === 1 ? '' : 's'} · {c.reportIds.length} report{c.reportIds.length === 1 ? '' : 's'} · {c.openReports} open
                </span>
                <ConfidenceMeter confidence={c.confidence} />
              </div>
            ))}
          </section>
        </aside>
      </main>

      {formOpen && <ReportForm onClose={() => setFormOpen(false)} onSeeOnMap={(id) => { setFormOpen(false); setKind('all'); setStatus('all'); setFocus(id); }} />}
    </>
  );
}

function ReportForm({ onClose, onSeeOnMap }: { onClose: () => void; onSeeOnMap: (id: string) => void }) {
  const add = useReports((s) => s.add);
  const role = useRole((s) => s.role);
  const [loc, setLoc] = useState<[number, number] | null>(null);
  const [kind, setKind] = useState<ReportKind | null>(null);
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Report | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const draft = useMemo(
    () => (loc && kind ? { kind, description, lat: loc[0], lng: loc[1], reporter: role } : null),
    [loc, kind, description, role],
  );
  const valid = !!draft && ReportInputSchema.safeParse(draft).success;

  const submit = async () => {
    if (!draft || !valid) return;
    setSending(true);
    setError('');
    try {
      const { reporter, ...input } = draft;
      setDone(await add(input, reporter));
    } catch {
      setError('That report did not pass the checks. Make sure the pin is inside Abu Dhabi City, Mussafah or MBZ.');
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setDone(null);
    setLoc(null);
    setKind(null);
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end">
      <div onClick={onClose} className="absolute inset-0 bg-[rgb(2_24_34/.55)] backdrop-blur-[2px]" />
      <aside role="dialog" aria-modal="true" aria-labelledby="report-title"
        className="relative flex h-full w-[min(520px,100%)] animate-drawer flex-col gap-[22px] overflow-y-auto border-l border-white/14 bg-[rgb(5_40_54/.97)] p-7 shadow-[-30px_0_80px_-30px_rgb(0_0_0/.6)]">
        <div className="flex items-center justify-between">
          <h2 id="report-title" className="m-0 text-[28px] tracking-tight">{done ? 'Report submitted' : 'Report an opportunity'}</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/20 bg-white/6 text-mist-50 hover:bg-white/12">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {!done ? (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-semibold">Location</span>
                <span className={cx('text-xs font-medium', loc ? 'text-sand-200' : 'text-mist-300')}>{loc ? districtOf(loc[0]) : 'Click the map to place it'}</span>
              </div>
              <div className="relative h-[220px] overflow-hidden rounded-md border border-white/16">
                <BaseMap zoom={10} crosshair onClick={(e) => setLoc([e.latlng.lat, e.latlng.lng])}>
                  <InvalidateSize />
                  {loc && <CircleMarker center={loc} radius={8} pathOptions={{ color: '#04141C', weight: 2, fillColor: '#F0DEB8', fillOpacity: 1 }} />}
                </BaseMap>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold">Type</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(KIND_META) as ReportKind[]).map((k) => {
                  const { Icon, label } = KIND_META[k];
                  return (
                    <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}
                      className={cx('inline-flex cursor-pointer items-center gap-[7px] rounded-full border px-3.5 py-[9px] text-[13px] font-semibold',
                        kind === k ? 'border-sand-200 bg-sand-200 text-lagoon-950' : 'border-white/22 bg-transparent text-mist-50')}>
                      <Icon size={14} strokeWidth={1.75} aria-hidden />{label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex flex-col gap-2">
              <span className="flex items-baseline justify-between">
                <span className="text-[13px] font-semibold">What did you see?</span>
                <span className="text-xs font-medium tabular-nums text-mist-300">{description.length}/280</span>
              </span>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)} maxLength={280} rows={4}
                placeholder="e.g. Water stays in the car park for days after rain."
                className="w-full resize-y rounded-[12px] border border-white/16 bg-[rgb(4_30_42/.55)] px-3.5 py-3 text-[15px] font-medium leading-normal text-mist-50 outline-none focus:border-aqua-300"
              />
            </label>

            <button onClick={submit} disabled={!valid || sending}
              className={cx('rounded-full border-0 px-6 py-3.5 text-[15px] font-semibold text-lagoon-950', valid ? 'cursor-pointer bg-sand-400 hover:bg-sand-300' : 'cursor-not-allowed bg-sand-400/40')}>
              {sending ? 'Submitting…' : 'Submit report'}
            </button>
            <span className="-mt-3 text-center text-xs text-mist-300">
              {error || (valid ? `Filed as: ${ROLE_LABELS[role]}. Reports go public once they are reviewed.` : 'Add a location, a type and at least 10 characters.')}
            </span>
          </>
        ) : (
          <div className="flex animate-fade-up flex-col gap-6">
            <p className="m-0 text-[15px] leading-relaxed">Thank you. Your report is on the community map and in the review queue.</p>
            <div className="flex flex-col gap-2 border-y border-white/12 py-[18px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-sand-200">{KIND_META[done.kind].label}</span>
                <StatusChip status={done.status} />
              </div>
              <p className="m-0 text-[15px] font-medium leading-snug">{done.description}</p>
              <span className="text-[13px] text-mist-300">{placeOf(done)} · {fmtDate(done.createdAt)} · Ref {done.id.toUpperCase()}</span>
            </div>
            <div>
              <h3 className="m-0 mb-4 text-lg font-bold tracking-[-0.035em]">Status</h3>
              <StatusTimeline report={done} />
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button onClick={() => onSeeOnMap(done.id)} className="cursor-pointer rounded-full border-0 bg-sand-400 px-5 py-3 text-sm font-semibold text-lagoon-950">See it on the map</button>
              <button onClick={reset} className="cursor-pointer rounded-full border border-white/25 bg-transparent px-5 py-3 text-sm font-semibold text-mist-50">Report another</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
