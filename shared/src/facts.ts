import { ABU_DHABI_CLIMATE } from './climate';

/** Published facts the site quotes. Not model inputs, so they live apart from assumptions. */
export type Fact = { value: number; unit: string; label: string; source: string; url: string };

export const FACTS = {
  desalShare: {
    value: 41, unit: '%',
    label: 'of all the water the UAE uses comes out of desalination plants. For homes, it is nearly all of it.',
    source: 'GCC Statistical Center 2023, via Al Jazeera',
    url: 'https://www.aljazeera.com/news/2026/3/12/how-much-of-the-gulfs-water-comes-from-desalination-plants',
  },
  storm2024: {
    value: 254.8, unit: 'mm',
    label: 'of rain fell in 24 hours at Khatm Al Shakla, Al Ain, on 16 April 2024. The most since UAE records began in 1949.',
    source: 'National Center of Meteorology, via Wikipedia',
    url: 'https://en.wikipedia.org/wiki/2024_United_Arab_Emirates_floods',
  },
} satisfies Record<string, Fact>;

export type RainScenario = { key: string; label: string; depthMm: number; unit: string; source: string };

export const RAIN_SCENARIOS: RainScenario[] = [
  {
    key: 'normal', label: 'Normal year', unit: 'mm a year',
    depthMm: Math.round(ABU_DHABI_CLIMATE.months.reduce((s, m) => s + m.rainMm, 0) * 10) / 10,
    source: ABU_DHABI_CLIMATE.source,
  },
  { key: 'storm', label: 'April 2024 storm', unit: 'mm in 24 h', depthMm: FACTS.storm2024.value, source: FACTS.storm2024.source },
];
