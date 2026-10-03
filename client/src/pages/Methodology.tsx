import { useState, type ReactNode } from 'react';
import {
  ABU_DHABI_CLIMATE, DEFAULT_ASSUMPTIONS, RAIN_SCENARIOS, dewPointC, humidityRatio,
  type AssumptionKey,
} from '@waha/shared';
import { useAssumptionStore, useAssumptions } from '../store/assumptions';
import { AssumptionsDrawer } from '../ui/AssumptionsDrawer';
import { PageHeader } from '../ui/Layout';
import { cx } from '../ui/kit';

const KEYS = Object.keys(DEFAULT_ASSUMPTIONS) as AssumptionKey[];
const GROUPS = [...new Set(KEYS.map((k) => DEFAULT_ASSUMPTIONS[k].group))];

const DATA_SOURCES = [
  ['Building outlines, car parks', 'OpenStreetMap contributors (ODbL), pulled October 2026', 'https://www.openstreetmap.org/copyright'],
  ['Climate normals', ABU_DHABI_CLIMATE.source, ABU_DHABI_CLIMATE.url],
  ['Fresh-air rates', 'ASHRAE Standard 62.1, Table 6-1', 'https://www.ashrae.org/technical-resources/bookstore/standards-62-1-62-2'],
  ['Condensate rule of thumb', 'Guz (2005), ASHRAE Journal', 'https://www.hpac.com/air-conditioning/article/20928378/methods-of-calculating-water-recovery-from-air-conditioning-cooling-coils-part-1-of-2'],
  ['Runoff coefficients', 'Texas Manual on Rainwater Harvesting (TWDB, 2005)', 'https://www.twdb.texas.gov/publications/brochures/conservation/doc/RainwaterHarvestingManual_3rdedition.pdf'],
  ['Desalination energy', 'ACWA Power, Taweelah RO plant', 'https://acwapower.com/en/what-we-do/projects/taweelah-ro-desalination-iwp/'],
  ['Grid carbon', 'Environment Agency Abu Dhabi, Climate Change Strategy', 'https://www.ead.gov.ae/-/media/Project/EAD/EAD/Documents/Climate-Change-Strategy-in-The-Emirate-of-Abu-Dhabi.pdf'],
  ['April 2024 storm', 'National Center of Meteorology, via Wikipedia', 'https://en.wikipedia.org/wiki/2024_United_Arab_Emirates_floods'],
] as const;

export function Methodology() {
  const a = useAssumptions();
  const overrides = useAssumptionStore((s) => s.overrides);
  const [group, setGroup] = useState<string | null>(null);
  const p = a['psychro.pressureKPa'].value;
  const wCoil = humidityRatio(a['condensate.coilDewPointC'].value, 100, p);

  return (
    <>
      <PageHeader
        overline="Methodology"
        title="How every number is made"
        intro="Waha never shows a single magic number. Each estimate is a low, likely and high range with a confidence level, built from public data and assumptions you can read and change."
      />

      <main className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 pb-24 sm:px-6">
        <Card title="1. Condensate, the physics way" tag="Psychrometric method">
          <Formula>Litres = air density × fresh-air flow × (outdoor humidity ratio − coil humidity ratio) × seconds running</Formula>
          <P>
            Hot, humid outdoor air gets pulled across a cooling coil at about {a['condensate.coilDewPointC'].value} °C. The air can’t hold its water at that
            temperature, so the extra drips off. How much depends on how humid the air was to start with. We take Abu Dhabi’s monthly
            temperature and humidity normals, turn them into a humidity ratio (kg of water per kg of dry air) and subtract what is left after the coil.
            Fresh-air flow comes from ASHRAE 62.1 rates for each kind of building.
          </P>
          <div className="waha-table">
            <table className="tabular-nums">
              <thead>
                <tr>
                  {['Month', 'Mean °C', 'Humidity %', 'Dew point °C', 'Outdoor g/kg', 'After coil g/kg', 'Water per kg air'].map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {ABU_DHABI_CLIMATE.months.map((m) => {
                  const wOut = humidityRatio(m.tMean, m.rh, p);
                  const drop = Math.max(0, wOut - wCoil);
                  return (
                    <tr key={m.month} className={cx(drop === 0 && 'text-[#9aabb2]')}>
                      <td className="font-semibold">{m.month}</td>
                      <td>{m.tMean}</td>
                      <td>{m.rh}</td>
                      <td>{dewPointC(m.tMean, m.rh).toFixed(1)}</td>
                      <td>{(wOut * 1000).toFixed(1)}</td>
                      <td>{(wCoil * 1000).toFixed(1)}</td>
                      <td className="font-semibold text-[#155771]">{(drop * 1000).toFixed(1)} g</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <P muted>
            Using monthly averages smooths over muggy nights and dry afternoons, and we only count water from fresh air, not from air recirculating inside.
            Both push the estimate down, so treat it as a careful figure rather than a generous one.
          </P>
        </Card>

        <Card title="2. Condensate, the rule of thumb" tag="Guz 2005">
          <Formula>Litres = (floor area ÷ m² per ton) × gal per ton-hour × 3.785 × load factor × hours running</Formula>
          <P>
            Facilities engineers have measured condensate for years. Guz (2005) found large buildings make {a['condensate.galPerTonHour'].low} to {a['condensate.galPerTonHour'].high} US gallons per ton of cooling for
            every hour the plant runs in summer. We size the plant from UAE rules of thumb for floor area per ton, then ease the load off in cooler
            months. This method is a cross-check. When it lands close to the physics method, confidence goes up.
          </P>
        </Card>

        <Card title="3. Rainfall" tag="V = P × A × C">
          <Formula>Litres = rain (mm) × area (m²) × runoff coefficient × share you can keep</Formula>
          <P>
            One millimetre of rain on one square metre is exactly one litre. The runoff coefficient (C) is the fraction that runs off instead of soaking
            in or evaporating: about {a['rain.c.roofConcrete'].value} for a flat concrete roof and {a['rain.c.landscape'].value} for sand.
            Then a tank or swale only keeps part of it ({Math.round(a['rain.captureEfficiency'].value * 100)}% likely), because storms here are short and fierce.
            Roof and car-park outlines are traced from OpenStreetMap and measured with turf.
          </P>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {RAIN_SCENARIOS.map((s) => (
              <li key={s.key} className="rounded-full border border-white/16 px-3 py-1.5 text-[13px]">
                <span className="font-semibold">{s.label}</span> · {s.depthMm} {s.unit} <span className="text-mist-300">({s.source})</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="4. Ranges" tag="Low, likely, high">
            <P>
              Every input has a low and high value as well as a likely one. We nudge one input at a time to its low and high, see how far the answer
              moves, and add those swings together the way you add independent errors (root of the sum of squares). Stacking every worst case at
              once would give silly ranges nobody could plan with.
            </P>
          </Card>
          <Card title="5. Confidence" tag="Low · Medium · High">
            <P>
              Confidence is the plain average of a few checks, each scored 0 to 1: is the floor area published or estimated, which method was used,
              how wide is the range, and do the two condensate methods agree. Above {a['confidence.highAt'].value} reads as high,
              above {a['confidence.mediumAt'].value} as medium. The reasons always show next to the meter.
            </P>
          </Card>
          <Card title="6. Neighbourhood groups" tag="DBSCAN">
            <P>
              Buildings and open reports are clustered with turf.clustersDbscan. Points within {a['community.radiusKm'].value} km of each other link
              up, and it takes {a['community.minPoints'].value} to make a group. Rejected reports are left out. A group is a place where one tank,
              one tanker run or one pipe could serve several sites.
            </P>
          </Card>
          <Card title="7. Opportunity score" tag="0 to 100">
            <P>
              A weighted mix: condensate volume ({a['score.wCondensate'].value}), rain volume ({a['score.wRain'].value}), open reports nearby
              ({a['score.wDemand'].value}) and data confidence ({a['score.wConfidence'].value}). Volumes sit on a log scale so a bakery still
              registers next to a mall.
            </P>
          </Card>
        </div>

        <Card title="8. Impact" tag="Energy and CO₂">
          <Formula>CO₂ avoided = water kept (m³) × kWh per m³ × kg CO₂ per kWh</Formula>
          <P>
            Every cubic metre we keep is one the desalination plants don’t have to make. We use {a['impact.desalKWhPerM3'].value} kWh per m³ (Taweelah’s
            reverse osmosis plant manages {DEFAULT_ASSUMPTIONS['impact.desalKWhPerM3'].low}) and {a['impact.gridKgCO2PerKWh'].value} kg of CO₂ per kWh from the
            Abu Dhabi grid. Older thermal plants use much more energy, so the real saving is likely higher.
          </P>
        </Card>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="m-0 text-[40px] tracking-heading">Every assumption</h2>
            <span className="text-[13px] text-mist-300">
              {Object.keys(overrides).length ? `${Object.keys(overrides).length} edited in this browser` : 'All at their defaults'}
            </span>
          </div>
          {GROUPS.map((g) => {
            const keys = KEYS.filter((k) => DEFAULT_ASSUMPTIONS[k].group === g);
            return (
              <div key={g} className="glass-solid rounded-xl p-6">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h3 className="m-0 font-sans text-xs font-semibold uppercase tracking-[.14em] text-aqua-300">{g}</h3>
                  <button onClick={() => setGroup(g)} className="cursor-pointer rounded-full border border-white/20 bg-white/6 px-3 py-1.5 text-xs font-semibold text-mist-50 hover:bg-white/12">Edit</button>
                </div>
                <dl className="m-0 grid gap-x-6 gap-y-3 md:grid-cols-2">
                  {keys.map((k) => {
                    const x = a[k];
                    const range = x.low !== undefined && x.high !== undefined ? ` (${Math.min(x.low, x.high)} to ${Math.max(x.low, x.high)})` : '';
                    return (
                      <div key={k} className="flex flex-col gap-0.5 border-t border-white/8 pt-3">
                        <dt className="flex items-baseline justify-between gap-3 text-sm font-semibold">
                          <span>{x.label}</span>
                          <span className={cx('whitespace-nowrap tabular-nums', overrides[k] ? 'text-conf-high-text' : 'text-aqua-300')}>
                            {+x.value.toPrecision(4)} {x.unit}<span className="text-xs font-normal text-mist-400">{range}</span>
                          </span>
                        </dt>
                        <dd className="m-0 text-[13px] leading-normal text-mist-200">
                          {x.source} {x.url && <a href={x.url} target="_blank" rel="noreferrer">Source ↗</a>}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            );
          })}
        </section>

        <Card title="Data sources" tag="Where it all comes from">
          <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
            {DATA_SOURCES.map(([what, who, url]) => (
              <li key={what} className="flex flex-col border-t border-white/8 pt-3">
                <span className="text-sm font-semibold">{what}</span>
                <a href={url} target="_blank" rel="noreferrer" className="text-[13px]">{who} ↗</a>
              </li>
            ))}
          </ul>
          <P muted>
            Community reports marked “Sample” are made up for the demo and pinned to real places. Everything else on the map is a real building or surface.
          </P>
        </Card>
      </main>

      <AssumptionsDrawer open={!!group} onClose={() => setGroup(null)} keys={KEYS.filter((k) => DEFAULT_ASSUMPTIONS[k].group === group)} />
    </>
  );
}

function Card({ title, tag, children }: { title: string; tag: string; children: ReactNode }) {
  return (
    <section className="glass-solid flex flex-col gap-4 rounded-xl p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 text-[28px] tracking-tight">{title}</h2>
        <span className="text-xs font-semibold uppercase tracking-[.12em] text-sand-200">{tag}</span>
      </div>
      {children}
    </section>
  );
}

const Formula = ({ children }: { children: ReactNode }) => (
  <div className="border-y border-white/12 py-3.5 text-[17px] font-medium italic text-mist-50">{children}</div>
);

const P = ({ children, muted }: { children: ReactNode; muted?: boolean }) => (
  <p className={cx('m-0 max-w-[75ch] text-[15px] leading-relaxed', muted ? 'text-mist-300' : 'text-mist-200')}>{children}</p>
);
