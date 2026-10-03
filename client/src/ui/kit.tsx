import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { AirVent, CloudRain, Droplet, type LucideIcon } from 'lucide-react';
import {
  STATUS_LABELS, STATUS_PIPELINE, isOpen, type Confidence, type ConfidenceLevel, type Range, type Report, type ReportKind, type ReportStatus, type Role,
} from '@waha/shared';

/* ---------------------------------------------------------------- formatting */

/** Display rounding only. The engine keeps full precision; we just don't pretend to know the last digit. */
export function roundForDisplay(n: number): number {
  const a = Math.abs(n);
  const step = a < 100 ? 1 : a < 1_000 ? 10 : a < 100_000 ? 100 : 1_000;
  return Math.round(n / step) * step;
}
export const fmt = (n: number) => roundForDisplay(n).toLocaleString('en-US');
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ---------------------------------------------------------------- GlassCard */

type GlassVariant = 'heavy' | 'medium' | 'solid';
const GLASS: Record<GlassVariant, string> = {
  heavy: 'glass-heavy rounded-[26px]', // nav, hero, map overlays
  medium: 'glass-medium rounded-xl', // cards, popups, drawers
  solid: 'glass-solid rounded-[22px]', // anything holding numbers
};

export function GlassCard({ variant = 'solid', as: Tag = 'section', className, children }: {
  variant?: GlassVariant; as?: ElementType; className?: string; children: ReactNode;
}) {
  return <Tag className={cx(GLASS[variant], className)}>{children}</Tag>;
}

/* ---------------------------------------------------------------- StatTile */

/** Counts up from the previous value. Skips straight to the end if the user prefers less motion. */
function useCountUp(target: number, ms = 900) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setShown(a + (target - a) * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return shown;
}

export function StatTile({ label, value, unit, caption, icon: Icon, size = 'md' }: {
  label: string; value: number; unit: string; caption?: ReactNode; icon?: LucideIcon; size?: 'md' | 'xl';
}) {
  const shown = useCountUp(value);
  return (
    <GlassCard className="flex flex-col gap-2.5 p-6">
      {Icon && (
        <span className="grid size-12 place-items-center rounded-md bg-aqua-400/12 text-aqua-300">
          <Icon size={22} strokeWidth={1.75} aria-hidden />
        </span>
      )}
      <span className="text-[13px] font-medium text-mist-200">{label}</span>
      <div className="flex flex-wrap items-baseline gap-1.5">
        <span aria-hidden className={cx(
          'font-display font-black leading-none tracking-display tabular-nums',
          size === 'xl' ? 'text-[clamp(56px,6vw,76px)]' : 'text-[44px]',
        )}>
          {fmt(shown)}
        </span>
        <span className="sr-only">{fmt(value)}</span>
        <span className="text-[13px] font-semibold text-aqua-300">{unit}</span>
      </div>
      {caption && <span className="text-[13px] font-medium text-mist-200">{caption}</span>}
    </GlassCard>
  );
}

/* ---------------------------------------------------------------- RangeBar */

export function RangeBar({ range, unit, label = 'Estimate' }: { range: Range; unit: string; label?: string }) {
  // Leave 15% headroom past "high" so the band never kisses the edge. Layout only.
  const scale = range.high * 1.15 || 1;
  const pct = (n: number) => `${(n / scale) * 100}%`;
  return (
    <figure role="img" aria-label={`${label}: low ${fmt(range.low)}, likely ${fmt(range.mid)}, high ${fmt(range.high)} ${unit}`} className="m-0">
      <div className="relative h-2.5 rounded-full bg-white/8">
        <div
          className="absolute inset-y-0 rounded-full bg-[linear-gradient(90deg,rgb(92_225_230/.35),var(--color-aqua-400),rgb(92_225_230/.35))]"
          style={{ left: pct(range.low), width: pct(range.high - range.low) }}
        />
        <div
          className="absolute -top-[5px] -ml-0.5 h-5 w-1 rounded-[2px] bg-mist-50 shadow-[0_0_0_3px_rgb(4_20_28/.6)]"
          style={{ left: pct(range.mid) }}
        />
      </div>
      <figcaption aria-hidden className="mt-2.5 grid grid-cols-3 text-xs font-medium tabular-nums text-mist-300">
        <span>Low {fmt(range.low)}</span>
        <span className="text-center text-mist-50">Likely {fmt(range.mid)}</span>
        <span className="text-right">High {fmt(range.high)}</span>
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------- ConfidenceMeter */

const CONF: Record<ConfidenceLevel, { bars: number; bar: string; text: string; label: string }> = {
  low: { bars: 1, bar: 'bg-conf-low', text: 'text-conf-low-text', label: 'Low' },
  medium: { bars: 2, bar: 'bg-conf-med', text: 'text-conf-med-text', label: 'Medium' },
  high: { bars: 3, bar: 'bg-conf-high', text: 'text-conf-high-text', label: 'High' },
};

export function ConfidenceMeter({ confidence, showReasons = false }: { confidence: Confidence; showReasons?: boolean }) {
  const c = CONF[confidence.level];
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex gap-1" aria-hidden>
          {[1, 2, 3].map((i) => <span key={i} className={cx('h-2 w-[22px] rounded-[4px]', i <= c.bars ? c.bar : 'bg-white/12')} />)}
        </div>
        <span className={cx('text-[13px] font-semibold', c.text)}>{c.label} confidence</span>
      </div>
      {showReasons && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] leading-snug text-mist-200">
          {confidence.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- EstimateBadge */

const BADGE = {
  estimate: { label: 'Estimate', title: 'Modelled from public data and the listed assumptions. Not a meter reading.', cls: 'border-aqua-400/30 bg-aqua-400/10 text-aqua-300' },
  sample: { label: 'Sample', title: 'Made-up demo data, pinned to a real place.', cls: 'border-sand-400/35 bg-sand-400/10 text-sand-200' },
};

export function EstimateBadge({ kind = 'estimate' }: { kind?: keyof typeof BADGE }) {
  const b = BADGE[kind];
  return (
    <span title={b.title} className={cx('inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[.06em]', b.cls)}>
      {b.label}
    </span>
  );
}

/* ---------------------------------------------------------------- StatusChip */

// Spelled out in full so Tailwind can see every class.
const STATUS_STYLE: Record<ReportStatus, { chip: string; dot: string; ring: string }> = {
  submitted: { chip: 'text-status-submitted bg-status-submitted/12 border-status-submitted/35', dot: 'bg-status-submitted', ring: 'border-status-submitted' },
  review: { chip: 'text-status-review bg-status-review/12 border-status-review/35', dot: 'bg-status-review', ring: 'border-status-review' },
  investigating: { chip: 'text-status-investigating bg-status-investigating/12 border-status-investigating/35', dot: 'bg-status-investigating', ring: 'border-status-investigating' },
  verified: { chip: 'text-status-verified bg-status-verified/12 border-status-verified/35', dot: 'bg-status-verified', ring: 'border-status-verified' },
  resolved: { chip: 'text-status-resolved bg-status-resolved/12 border-status-resolved/35', dot: 'bg-status-resolved', ring: 'border-status-resolved' },
  rejected: { chip: 'text-status-rejected bg-status-rejected/12 border-status-rejected/35', dot: 'bg-status-rejected', ring: 'border-status-rejected' },
};

export function StatusChip({ status }: { status: ReportStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[3px] text-xs font-semibold', s.chip)}>
      <span aria-hidden className={cx('size-1.5 rounded-full', s.dot)} />
      {STATUS_LABELS[status]}
    </span>
  );
}

/* ---------------------------------------------------------------- StatusTimeline */

const WHAT_HAPPENS_NEXT: Partial<Record<ReportStatus, string>> = {
  review: 'A reviewer checks the report',
  investigating: 'Passed to the municipality for a site visit',
  verified: 'Confirmed on site',
  resolved: 'Fixed, or turned into a recovery project',
};

const REPORTED_BY: Record<Role, string> = {
  citizen: 'Reported by a resident',
  owner: 'Reported by the building owner',
  authority: 'Logged by the authority',
};

export function StatusTimeline({ report }: { report: Report }) {
  const upcoming = isOpen(report.status) ? STATUS_PIPELINE.slice(STATUS_PIPELINE.indexOf(report.status) + 1) : [];
  const steps = [
    ...report.history.map((e, i) => ({
      key: `${e.status}-${e.at}`, status: e.status, done: true,
      note: [fmtDate(e.at), e.note ?? (i === 0 ? REPORTED_BY[e.by] : undefined)].filter(Boolean).join(' · '),
    })),
    ...upcoming.map((s) => ({ key: s, status: s, done: false, note: WHAT_HAPPENS_NEXT[s] ?? '' })),
  ];

  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {steps.map((s, i) => (
        <li key={s.key} className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3.5">
          <div className="flex flex-col items-center">
            <span className={cx(
              'mt-1 size-3 rounded-full border-2',
              s.done ? cx(STATUS_STYLE[s.status].dot, STATUS_STYLE[s.status].ring) : 'border-white/40 bg-transparent',
            )} />
            <span className={cx('min-h-7 w-px flex-1', i < steps.length - 1 ? 'bg-white/18' : 'bg-transparent')} />
          </div>
          <div className="pb-[18px]">
            <div className={cx('text-sm font-semibold', s.done ? 'text-mist-50' : 'text-mist-200')}>
              {STATUS_LABELS[s.status]}
              {!s.done && <span className="sr-only"> (not reached yet)</span>}
            </div>
            {s.note && <div className="text-[13px] text-mist-300">{s.note}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------------------------------------- map colours and report kinds */

/** Leaflet paints with plain colours, not CSS classes. These mirror the status tokens in index.css. */
export const STATUS_HEX: Record<ReportStatus, string> = {
  submitted: '#A9B8FF', review: '#E8C56B', investigating: '#C9A2FF', verified: '#6EE3A8', resolved: '#5CE1E6', rejected: '#F08A6B',
};

/** Colours follow waha-extra's categories: condensate blue, rainfall teal, community olive. */
export const KIND_META: Record<ReportKind, { label: string; Icon: LucideIcon; color: string; tint: string }> = {
  condensate: { label: 'AC discharge', Icon: AirVent, color: '#08628c', tint: '#e8f1f5' },
  rainfall: { label: 'Rain pooling', Icon: CloudRain, color: '#4793af', tint: '#e7f5f8' },
  leak: { label: 'Leak', Icon: Droplet, color: '#858258', tint: '#f0f0e8' },
};
