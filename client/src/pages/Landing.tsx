import { useState } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { FACTS } from '@waha/shared';
import { api, useApi } from '../api';
import { useAssumptionStore, useAssumptions } from '../store/assumptions';
import { useReports } from '../store/reports';
import { Footer, Nav, Water } from '../ui/Layout';
import { ConfidenceMeter, EstimateBadge, RangeBar, fmt } from '../ui/kit';

const SOURCES = [
  { num: '01', title: 'Buildings', to: '/buildings', output: 'Litres per day',
    body: 'Estimate the AC condensate a building could recover, with the range and the assumptions behind it.' },
  { num: '02', title: 'Rainfall', to: '/rainfall', output: 'Capturable m³ per scenario',
    body: 'Work out runoff from real roofs and car parks for a normal year or a storm like April 2024.' },
  { num: '03', title: 'Community', to: '/community', output: 'Reviewed reports',
    body: 'Report places where water pools, leaks or drains away. Reports get reviewed and added to the shared map.' },
];

const STEPS = [
  { n: '01', title: 'Collect', stage: 'Three sources', value: 'Buildings · Rainfall · Reports',
    body: 'Building data comes from public records and owners. Rain and surfaces come from climate normals and OpenStreetMap. Residents report what they see.' },
  { n: '02', title: 'Estimate', stage: 'Water opportunity engine', value: 'Range · Confidence · Score',
    body: 'Each source becomes a low, likely and high volume with a confidence level and every assumption on show.' },
  { n: '03', title: 'Locate', stage: 'Map and dashboard', value: 'Water map · Impact dashboard',
    body: 'Opportunities are scored and put on one map. The dashboard adds up the water, the desalination power and the CO₂ it would save.' },
  { n: '04', title: 'Review', stage: 'Authority review', value: 'Verified · Investigating · Rejected',
    body: 'The authority verifies, investigates or rejects each report, and the person who sent it sees the status change.' },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/** The headline surfaces like it's coming up through water: a noise displacement
 *  shrinks to nothing as each line rises in. The filter is dropped once it settles,
 *  so it costs nothing after the first second and a half. */
function HeroTitle() {
  const reduce = useReducedMotion();
  const [settled, setSettled] = useState(!!reduce);
  return (
    <>
      {!settled && (
        <svg aria-hidden className="absolute size-0">
          <filter id="hero-ripple" x="-10%" y="-20%" width="120%" height="140%">
            <motion.feTurbulence
              type="fractalNoise" numOctaves={2} seed={7} result="noise"
              initial={{ baseFrequency: '0.006 0.06' }} animate={{ baseFrequency: '0.012 0.02' }}
              transition={{ duration: 1.8, ease: EASE }}
            />
            <motion.feDisplacementMap
              in="SourceGraphic" in2="noise" xChannelSelector="R" yChannelSelector="G"
              initial={{ scale: 70 }} animate={{ scale: 0 }}
              transition={{ duration: 1.8, ease: EASE }}
              onAnimationComplete={() => setSettled(true)}
            />
          </filter>
        </svg>
      )}
      <h1
        style={{ filter: settled ? undefined : 'url(#hero-ripple)' }}
        className="m-0 text-[clamp(56px,11.5vw,176px)] leading-[.9] tracking-display text-[#F4F9F9] [text-shadow:0_2px_24px_rgb(3_40_56/.45),0_10px_70px_rgb(3_30_44/.5)]"
      >
        {['EVERY DROP,', 'FOUND.'].map((line, i) => (
          <motion.span
            key={line}
            className="block"
            initial={reduce ? false : { opacity: 0, y: '0.3em' }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.15 + i * 0.18, ease: EASE }}
          >
            {line}
          </motion.span>
        ))}
      </h1>
    </>
  );
}

const EXAMPLE_ID = 'al-bahr-towers';
const TOWER_ID = 'adia-tower';

export function Landing() {
  const a = useAssumptions();
  const overrides = useAssumptionStore((s) => s.overrides);
  const reports = useReports((s) => s.reports);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const reduce = useReducedMotion();
  const analyses = useApi(() => api.analyzeBuildings(overrides, reports), [overrides, reports]);
  const example = analyses.data?.find((x) => x.building.id === EXAMPLE_ID);
  const tower = analyses.data?.find((x) => x.building.id === TOWER_ID);

  const stats = [
    { kicker: 'Desalination', value: String(FACTS.desalShare.value), unit: FACTS.desalShare.unit, label: FACTS.desalShare.label, source: FACTS.desalShare.source, url: FACTS.desalShare.url },
    {
      kicker: 'AC condensate', value: tower ? fmt(tower.engineering.dailyL.mid) : '…', unit: 'L/day',
      label: `of clean condensate a ${tower?.building.floors ?? ''}-floor tower like ${tower?.building.name ?? 'ADIA Tower'} could send down the drain, averaged over the year.`,
      source: 'Waha engine, see the methodology', url: '/methodology',
    },
    { kicker: 'Flood runoff', value: String(FACTS.storm2024.value), unit: FACTS.storm2024.unit, label: FACTS.storm2024.label, source: FACTS.storm2024.source, url: FACTS.storm2024.url },
  ];

  const shown = example && [
    ['profile.office.oa', a['profile.office.oa']],
    ['condensate.coilDewPointC', a['condensate.coilDewPointC']],
    ['profile.office.hours', a['profile.office.hours']],
    ['psychro.airDensity', a['psychro.airDensity']],
  ] as const;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Water intensity="1" speed="1.6" sand="0.5" tint="" />

      <header className="relative z-10 flex min-h-[max(680px,100vh)] flex-col overflow-hidden">
        <Nav className="animate-bob" />
        <div className="relative flex flex-1 flex-col items-center justify-center bg-[radial-gradient(42%_34%_at_50%_50%,rgb(3_40_56/.42),rgb(3_40_56/0)_100%)] px-5 pb-[120px] pt-16 text-center">
          <HeroTitle />
          <motion.div
            className="flex flex-col items-center"
            initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7, ease: EASE }}
          >
            <p className="m-0 mt-7 max-w-[34ch] text-[clamp(17px,1.6vw,21px)] font-semibold text-[#F4F9F9] [text-shadow:0_1px_16px_rgb(3_40_56/.7)]">
              Mapping the water Abu Dhabi is already losing.
            </p>
            <Link to="/map" className="btn-liquid mt-[34px] inline-flex items-center gap-2.5 bg-sand-400 px-6 py-[13px] text-[15px] font-semibold text-lagoon-950 shadow-cta hover:-translate-y-0.5 hover:bg-sand-300 hover:text-lagoon-950">
              Explore the map <span className="text-[17px] leading-none">→</span>
            </Link>
          </motion.div>
        </div>
      </header>

      <main className="relative z-10 isolate">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-[60px] bottom-0 -z-10 bg-[rgb(6_56_74/.48)] backdrop-blur-[3px] [mask-image:linear-gradient(180deg,transparent,#000_280px)]" />

        <section className="mx-auto max-w-[1180px] px-4 pb-14 pt-24 sm:px-6">
          <p className="m-0 mb-3.5 text-xs font-semibold uppercase tracking-[.14em] text-sand-200">The problem</p>
          <h2 className="m-0 max-w-[18ch] text-[clamp(36px,5vw,64px)] leading-none tracking-heading">Scarce water, and still we drain it away.</h2>
          <div className="mt-16 grid gap-x-10 gap-y-12 md:grid-cols-3">
            {stats.map((s) => (
              <div key={s.kicker} className="flex flex-col gap-3.5 border-l border-white/32 pl-6">
                <span className="text-[13px] font-semibold text-[#D6E7EA]">{s.kicker}</span>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-[clamp(64px,7vw,104px)] font-black leading-[.9] tracking-display text-[#F4F9F9]">{s.value}</span>
                  <span className="text-[17px] font-semibold text-aqua-200">{s.unit}</span>
                </div>
                <p className="m-0 max-w-[30ch] text-base leading-normal">{s.label}</p>
                {s.url.startsWith('/')
                  ? <Link to={s.url} className="text-xs font-medium text-sand-200">Source · {s.source}</Link>
                  : <a href={s.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-sand-200">Source · {s.source} ↗</a>}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-4 pb-14 pt-24 sm:px-6">
          <p className="m-0 mb-3.5 text-xs font-semibold uppercase tracking-[.14em] text-sand-200">Three sources, one map</p>
          <h2 className="m-0 max-w-[20ch] text-[clamp(36px,5vw,64px)] leading-none tracking-heading">Water that is already here.</h2>
          <div className="mt-14 flex flex-col border-b border-white/28">
            {SOURCES.map((c) => (
              <Link key={c.num} to={c.to} className="grid items-baseline gap-x-12 gap-y-3 border-t border-white/28 py-8 text-[#F4F9F9] transition-all hover:pl-3 hover:text-sand-200 md:grid-cols-2">
                <div className="flex items-baseline gap-5">
                  <span className="text-[13px] font-semibold tabular-nums text-[#D6E7EA]">{c.num}</span>
                  <span className="font-display text-[clamp(44px,6.5vw,92px)] font-black leading-[.95] tracking-[-0.065em]">{c.title}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  <p className="m-0 max-w-[44ch] text-base leading-normal text-mist-50">{c.body}</p>
                  <span className="text-[13px] font-semibold">{c.output} →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-4 pb-14 pt-24 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-5">
            <div>
              <p className="m-0 mb-3.5 text-xs font-semibold uppercase tracking-[.14em] text-sand-200">How it works</p>
              <h2 className="m-0 max-w-[14ch] text-[clamp(36px,5vw,64px)] leading-none tracking-heading">From reports to reviewed water.</h2>
            </div>
            <p className="m-0 max-w-[40ch] text-base leading-relaxed">
              Every source goes through the same four steps, so a condensate estimate, a rain catchment and a resident’s report sit side by side on one map.
            </p>
          </div>
          <ol className="m-0 mt-16 grid list-none gap-x-8 gap-y-12 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="relative flex flex-col gap-3 border-t border-white/40 pt-8">
                <span className="absolute -top-1.5 left-0 size-[11px] rounded-full bg-sand-200 shadow-[0_0_0_5px_rgb(240_222_184/.18)]" />
                <span className="text-xs font-semibold uppercase tracking-[.12em] text-sand-200">Step {s.n}</span>
                <h3 className="m-0 text-[32px] leading-none tracking-tight">{s.title}</h3>
                <span className="text-sm font-semibold text-aqua-200">{s.stage}</span>
                <p className="m-0 text-[15px] leading-relaxed">{s.body}</p>
                <span className="mt-1 text-[13px] font-medium text-[#D6E7EA]">{s.value}</span>
              </li>
            ))}
          </ol>
          <Link to="/methodology" className="mt-12 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/6 px-5 py-[11px] text-sm font-semibold text-mist-50 hover:bg-white/12 hover:text-mist-50">See the formulas</Link>
        </section>

        <section className="mx-auto grid max-w-[1180px] items-start gap-10 px-4 pb-14 pt-24 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="m-0 mb-3.5 text-xs font-semibold uppercase tracking-[.14em] text-sand-200">Methodology</p>
            <h2 className="m-0 max-w-[16ch] text-[clamp(36px,5vw,64px)] leading-none tracking-heading">Every number shows its working.</h2>
            <p className="m-0 mt-6 max-w-[46ch] text-[17px] font-medium leading-relaxed text-[#F4F9F9]">
              Estimates come as a low, likely and high range with a confidence level. Open the assumptions on any figure to see the inputs and constants behind it, and change them if you know better.
            </p>
            <Link to="/methodology" className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/6 px-5 py-[11px] text-sm font-semibold text-mist-50 hover:bg-white/12 hover:text-mist-50">Read the methodology</Link>
          </div>

          <div className="glass-solid rounded-xl p-[26px]">
            {example ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold">{example.building.name} · {example.building.district}</div>
                    <div className="mt-0.5 text-[13px] text-mist-300">
                      {fmt(example.building.floorAreaM2)} m² · {a['profile.office.hours'].value} h/day · whole year
                    </div>
                  </div>
                  <EstimateBadge />
                </div>
                <div className="mt-[22px] flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-[56px] font-black leading-none tracking-display">{fmt(example.engineering.dailyL.mid)}</span>
                  <span className="text-[15px] font-semibold text-aqua-300">L/day likely</span>
                </div>
                <div className="mt-[22px]"><RangeBar range={example.engineering.dailyL} unit="L/day" /></div>
                <div className="mt-[22px] flex flex-wrap items-center justify-between gap-3">
                  <ConfidenceMeter confidence={example.engineering.confidence} />
                  <button onClick={() => setShowAssumptions((v) => !v)} className="cursor-pointer rounded-full border border-white/18 bg-white/5 px-3.5 py-2 text-[13px] font-semibold text-mist-50">
                    {showAssumptions ? 'Hide assumptions' : 'Assumptions'}
                  </button>
                </div>
                {showAssumptions && shown && (
                  <div className="mt-[18px] flex animate-fade-up flex-col gap-3 border-t border-white/10 pt-4">
                    <div className="text-sm font-medium italic leading-relaxed text-mist-200">{example.engineering.formula}</div>
                    {shown.map(([k, x]) => (
                      <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5">
                        <span className="text-sm font-semibold">{x.label}</span>
                        <span className="text-right text-[13px] font-semibold tabular-nums text-aqua-300">{x.value} {x.unit}</span>
                        <span className="col-span-2 text-[13px] text-mist-300">{x.source}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="h-[260px] animate-pulse-soft rounded-md bg-white/8" />
            )}
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-4 pb-[140px] pt-[120px] text-center sm:px-6">
          <h2 className="mx-auto m-0 max-w-[14ch] text-[clamp(44px,7vw,104px)] leading-[.92] tracking-display">Find the water near you.</h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/map" className="btn-liquid bg-sand-400 px-6 py-[13px] text-[15px] font-semibold text-lagoon-950 hover:bg-sand-300 hover:text-lagoon-950">Explore the map</Link>
            <Link to="/community" className="rounded-full border border-white/32 bg-white/8 px-6 py-[13px] text-[15px] font-semibold text-mist-50 hover:bg-white/16 hover:text-mist-50">Report an opportunity</Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
