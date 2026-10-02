import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Bar, BarChart, ResponsiveContainer, Tooltip as ChartTip, XAxis } from 'recharts';
import { BUILDING_TYPE_LABELS, REPORT_STATUSES, STATUS_LABELS, cityTotals, reportStats } from '@waha/shared';
import { api, useApi } from '../api';
import { useAssumptionStore, useAssumptions } from '../store/assumptions';
import { useReports } from '../store/reports';
import { AssumptionsDrawer } from '../ui/AssumptionsDrawer';
import { PageHeader, SourceNote } from '../ui/Layout';
import { ConfidenceMeter, EstimateBadge, STATUS_HEX, fmt } from '../ui/kit';

const card = 'rounded-xl border border-white/12 bg-[rgb(5_44_60/.86)] p-6 backdrop-blur-[18px]';

export function Dashboard() {
  const a = useAssumptions();
  const overrides = useAssumptionStore((s) => s.overrides);
  const reports = useReports((s) => s.reports);
  const [drawer, setDrawer] = useState(false);
  const analyses = useApi(() => api.analyzeBuildings(overrides, reports), [overrides, reports]);
  const communities = useApi(() => api.communities(overrides, reports), [overrides, reports]);

  // The totals are engine output too: cityTotals and reportStats live in @waha/shared.
  const totals = useMemo(() => analyses.data && cityTotals(analyses.data, a), [analyses.data, a]);
  const stats = useMemo(() => reportStats(reports), [reports]);
  const top = useMemo(
    () => [...(analyses.data ?? [])].sort((x, y) => y.engineering.dailyL.mid - x.engineering.dailyL.mid).slice(0, 8),
    [analyses.data],
  );
  const topMax = top[0]?.engineering.dailyL.mid ?? 1;
  const verified = stats.byStatus.verified + stats.byStatus.resolved;

  return (
    <>
      <PageHeader overline="Dashboard" title="Water we could keep">
        <div className="flex items-center gap-3">
          <EstimateBadge />
          <button onClick={() => setDrawer(true)} className="cursor-pointer rounded-full border border-white/20 bg-white/6 px-3.5 py-[7px] text-[13px] font-semibold text-mist-50 hover:bg-white/12">
            Impact assumptions
          </button>
        </div>
      </PageHeader>

      <main className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 pb-24 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Recoverable water a year" value={totals ? `${fmt(totals.totalL.mid / 1000)} m³` : '…'}
            note={totals ? `${fmt(totals.totalL.low / 1000)} to ${fmt(totals.totalL.high / 1000)} m³ · ${totals.buildings} buildings` : ''} />
          <Kpi label="Desalination power avoided" value={totals ? `${fmt(totals.impact.energyKWh.mid / 1000)} MWh` : '…'}
            note={totals ? `a year · range ${fmt(totals.impact.energyKWh.low / 1000)} to ${fmt(totals.impact.energyKWh.high / 1000)}` : ''} />
          <Kpi label="CO₂ avoided" value={totals ? `${fmt(totals.impact.co2Kg.mid / 1000)} t` : '…'}
            note={totals ? `a year · range ${fmt(totals.impact.co2Kg.low / 1000)} to ${fmt(totals.impact.co2Kg.high / 1000)}` : ''} />
          <Kpi label="Community reports" value={String(stats.total)} note={`${stats.open} open · ${verified} verified or resolved · +${stats.last30Days} in 30 days`} good />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className={`${card} flex flex-col gap-5`}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="m-0 text-xl font-bold tracking-[-0.035em]">Recoverable water by month</h2>
              <div className="flex gap-3.5 text-xs font-medium text-mist-200">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-aqua-300" />Condensate</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-status-submitted" />Rainfall</span>
              </div>
            </div>
            <div className="h-[220px]" role="img" aria-label="Monthly recoverable water: condensate peaks in summer, rain in winter">
              {totals && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={totals.monthly.map((m) => ({ month: m.month, condensate: m.condensateL / 1000, rain: m.rainL / 1000 }))} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: 'rgb(255 255 255 / .14)' }} tick={{ fill: '#A8C3C9', fontSize: 11 }} interval={0} />
                    <ChartTip
                      cursor={{ fill: 'rgb(255 255 255 / .05)' }}
                      formatter={(v, name) => [`${fmt(Number(v))} m³`, name === 'condensate' ? 'Condensate' : 'Rainfall']}
                      contentStyle={{ background: 'rgb(4 40 56 / .95)', border: '1px solid rgb(255 255 255 / .2)', borderRadius: 10, color: '#EEF5F6', fontSize: 12 }}
                      labelStyle={{ color: '#A8C3C9' }}
                    />
                    <Bar dataKey="condensate" stackId="w" fill="#8EEDF0" />
                    <Bar dataKey="rain" stackId="w" fill="#A9B8FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <span className="text-xs text-mist-300">Likely values for the {totals?.buildings ?? '…'} mapped buildings. Rain is the share their roofs could keep in a normal year.</span>
          </div>

          <div className={`${card} flex flex-col gap-[18px]`}>
            <h2 className="m-0 text-xl font-bold tracking-[-0.035em]">Community reports by status</h2>
            <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
              {REPORT_STATUSES.map((s) => stats.byStatus[s] > 0 && <div key={s} style={{ flex: stats.byStatus[s], background: STATUS_HEX[s] }} />)}
            </div>
            <div className="flex flex-col">
              {REPORT_STATUSES.map((s) => (
                <div key={s} className="flex items-center gap-2.5 border-b border-white/8 py-[9px] text-sm font-medium">
                  <span className="size-2 rounded-full" style={{ background: STATUS_HEX[s] }} />
                  <span className="flex-1">{STATUS_LABELS[s]}</span>
                  <span className="tabular-nums text-mist-200">{stats.byStatus[s]}</span>
                </div>
              ))}
            </div>
            <Link to="/community" className="text-[13px] font-semibold">View all reports →</Link>
          </div>
        </section>

        <section className={`${card} flex flex-col gap-3`}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="m-0 text-xl font-bold tracking-[-0.035em]">Top buildings by condensate</h2>
            <Link to="/map" className="text-[13px] font-semibold">See on map →</Link>
          </div>
          {top.map((x) => (
            <Link key={x.building.id} to={`/buildings?id=${x.building.id}`}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto] items-center gap-4 border-b border-white/8 py-2.5 text-mist-50 hover:text-mist-50">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{x.building.name}</div>
                <div className="text-xs text-mist-300">{BUILDING_TYPE_LABELS[x.building.type]} · score {x.score.score.mid}</div>
              </div>
              <div className="h-2 rounded-full bg-white/8">
                <div className="h-full rounded-full bg-aqua-300" style={{ width: `${(x.engineering.dailyL.mid / topMax) * 100}%` }} />
              </div>
              <span className="text-right text-sm font-semibold tabular-nums">{fmt(x.engineering.dailyL.mid)} L/day</span>
            </Link>
          ))}
        </section>

        <section className={`${card} flex flex-col gap-3`}>
          <h2 className="m-0 text-xl font-bold tracking-[-0.035em]">Neighbourhood groups</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {communities.data?.map((c) => (
              <div key={c.id} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/3 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold">{c.name}</span>
                  <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{fmt(c.condensateL.mid / 1000)} m³/yr</span>
                </div>
                <span className="text-xs text-mist-300">{plural(c.buildingIds.length, 'building')} · {plural(c.reportIds.length, 'report')} · {c.openReports} open</span>
                <ConfidenceMeter confidence={c.confidence} />
              </div>
            ))}
          </div>
        </section>

        <SourceNote source={analyses.source} />
      </main>

      <AssumptionsDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        keys={['impact.desalKWhPerM3', 'impact.gridKgCO2PerKWh', 'rain.captureEfficiency']}
        formula="CO₂ avoided = water kept (m³) × kWh per m³ × kg CO₂ per kWh"
      />
    </>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function Kpi({ label, value, note, good }: { label: string; value: string; note: string; good?: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/12 bg-[rgb(5_44_60/.86)] p-[22px] backdrop-blur-[18px]">
      <span className="text-[13px] font-medium text-mist-300">{label}</span>
      <span className="font-display text-[34px] font-bold tabular-nums leading-none tracking-[-0.05em]">{value}</span>
      <span className={good ? 'text-xs font-medium text-conf-high' : 'text-xs font-medium text-mist-300'}>{note}</span>
    </div>
  );
}
