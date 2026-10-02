export type ClimateMonth = {
  month: string;
  days: number;
  /** Daily mean, max and min air temperature, °C */
  tMean: number;
  tMax: number;
  tMin: number;
  /** Mean relative humidity, % */
  rh: number;
  /** Mean monthly precipitation, mm */
  rainMm: number;
};

export type Climate = { station: string; source: string; url: string; months: ClimateMonth[] };

const m = (month: string, days: number, tMax: number, tMean: number, tMin: number, rainMm: number, rh: number): ClimateMonth =>
  ({ month, days, tMax, tMean, tMin, rainMm, rh });

/** 1991-2020 normals. Rain adds up to 50.2 mm a year. */
export const ABU_DHABI_CLIMATE: Climate = {
  station: 'Abu Dhabi, Zayed International Airport',
  source: 'WMO 1991-2020 climate normals (NOAA), as tabled on Wikipedia',
  url: 'https://en.wikipedia.org/wiki/Abu_Dhabi#Climate',
  months: [
    m('Jan', 31, 24.5, 19.1, 13.8, 12.5, 68),
    m('Feb', 28, 26.5, 20.6, 15.9, 8.1, 66),
    m('Mar', 31, 29.7, 23.4, 17.5, 12.9, 61),
    m('Apr', 30, 35.0, 27.7, 21.1, 5.2, 53),
    m('May', 31, 39.6, 31.8, 24.6, 0.3, 50),
    m('Jun', 30, 41.4, 33.7, 26.9, 0.0, 54),
    m('Jul', 31, 42.5, 35.5, 29.7, 0.7, 55),
    m('Aug', 31, 43.4, 35.9, 30.2, 0.1, 54),
    m('Sep', 30, 40.9, 33.3, 27.4, 0.0, 60),
    m('Oct', 31, 36.6, 29.7, 23.7, 0.2, 62),
    m('Nov', 30, 31.0, 25.2, 19.6, 2.4, 65),
    m('Dec', 31, 26.5, 21.1, 15.7, 7.8, 69),
  ],
};
