import { useMemo, useState, type ReactNode } from 'react';
import { Building2, CloudRain, Gauge } from 'lucide-react';
import { BUILDINGS, REPORT_STATUSES, SAMPLE_REPORTS, analyzeBuilding } from '@waha/shared';
import { useAssumptions } from '../store/assumptions';
import { AssumptionsDrawer, buildingAssumptionKeys } from '../ui/AssumptionsDrawer';
import { Footer } from '../ui/Layout';
import { ConfidenceMeter, EstimateBadge, GlassCard, RangeBar, StatTile, StatusChip, StatusTimeline, fmt } from '../ui/kit';

/** A review page for the UI kit. Every number on it comes straight from the shared engine. */
export function Kit() {
  const [id, setId] = useState(BUILDINGS[0].id);
  const [drawer, setDrawer] = useState(false);
  const a = useAssumptions();
  const b = BUILDINGS.find((x) => x.id === id)!;
  const x = useMemo(() => analyzeBuilding(b, SAMPLE_REPORTS, a), [b, a]);
  const timelines = ['investigating', 'resolved', 'rejected'].map((s) => SAMPLE_REPORTS.find((r) => r.status === s)!);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#06384A]">
      <div aria-hidden className="pointer-events-none absolute -left-16 -top-20 size-[380px] rounded-full bg-aqua-400 opacity-35 blur-[90px]" />
      <div aria-hidden className="pointer-events-none absolute -right-10 top-[420px] size-[320px] rounded-full bg-sand-400 opacity-30 blur-[90px]" />

      <main className="relative mx-auto flex max-w-[1180px] flex-col gap-16 px-4 pb-24 pt-12 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="m-0 mb-3 text-xs font-semibold uppercase tracking-[.14em] text-sand-200">UI kit</p>
            <h1 className="m-0 text-[clamp(40px,6vw,72px)] leading-[.95] tracking-display">Every piece, live data</h1>
          </div>
          <label className="flex flex-col gap-2 text-[13px] font-semibold text-sand-200">
            Building
            <select
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="cursor-pointer appearance-none rounded-[12px] border border-sand-400/35 bg-sand-400/8 px-3.5 py-3 text-[15px] font-medium text-mist-50"
            >
              {BUILDINGS.map((o) => <option key={o.id} value={o.id} className="bg-lagoon-900">{o.name}</option>)}
            </select>
          </label>
        </header>

        <Section title="GlassCard">
          <div className="grid gap-[18px] sm:grid-cols-3">
            {(['heavy', 'medium', 'solid'] as const).map((v) => (
              <GlassCard key={v} variant={v} className="flex min-h-40 flex-col gap-2 p-6">
                <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-aqua-300">glass-{v}</span>
                <span className="font-display text-2xl font-black tracking-tight">
                  {{ heavy: 'Nav, hero, map overlays', medium: 'Cards, popups, drawers', solid: 'Charts, tables, stat tiles' }[v]}
                </span>
              </GlassCard>
            ))}
          </div>
        </Section>

        <Section title="StatTile">
          <div className="grid gap-[18px] sm:grid-cols-3">
            <StatTile icon={Building2} label="Condensate, likely" value={x.engineering.dailyL.mid} unit="L/day" caption={`${fmt(x.engineering.annualL.mid / 1000)} m³ a year`} />
            <StatTile icon={CloudRain} label="Roof rainfall, normal year" value={x.rainfall.annualL.mid} unit="L/yr" caption={`${fmt(b.roofAreaM2)} m² roof`} />
            <StatTile icon={Gauge} label="Opportunity score" value={x.score.score.mid} unit="/ 100" caption={`${x.openReportsNearby} open reports within reach`} />
          </div>
        </Section>

        <Section title="RangeBar, ConfidenceMeter, EstimateBadge">
          <GlassCard className="flex flex-col gap-7 p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-semibold">{b.name}</div>
                <div className="mt-0.5 text-[13px] text-mist-300">{b.district} · {b.floorAreaNote}</div>
              </div>
              <div className="flex items-center gap-2">
                <EstimateBadge />
                <button onClick={() => setDrawer(true)} className="cursor-pointer rounded-full border border-white/20 bg-white/6 px-3.5 py-[7px] text-[13px] font-semibold text-mist-50 hover:bg-white/12">
                  Assumptions
                </button>
              </div>
            </div>
            {(['engineering', 'quick'] as const).map((m) => (
              <div key={m} className="flex flex-col gap-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="m-0 text-xl font-bold tracking-tight">{m === 'engineering' ? 'Psychrometric method' : 'Rule of thumb'}</h3>
                  <span className="text-xs text-mist-300">{x[m].formula}</span>
                </div>
                <RangeBar range={x[m].dailyL} unit="L/day" label={`${m} estimate`} />
                <ConfidenceMeter confidence={x[m].confidence} showReasons />
              </div>
            ))}
            <div className="flex gap-2"><EstimateBadge /><EstimateBadge kind="sample" /></div>
          </GlassCard>
        </Section>

        <Section title="StatusChip">
          <div className="flex flex-wrap gap-3">{REPORT_STATUSES.map((s) => <StatusChip key={s} status={s} />)}</div>
        </Section>

        <Section title="StatusTimeline">
          <div className="grid gap-[18px] md:grid-cols-3">
            {timelines.map((r) => (
              <GlassCard key={r.id} variant="medium" className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between gap-2"><StatusChip status={r.status} /><EstimateBadge kind="sample" /></div>
                <p className="m-0 text-[15px] font-medium leading-snug">{r.title}</p>
                <StatusTimeline report={r} />
              </GlassCard>
            ))}
          </div>
        </Section>
      </main>

      <AssumptionsDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        keys={buildingAssumptionKeys(b.type)}
        formula={x.engineering.formula}
      />
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="m-0 text-[28px] tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
