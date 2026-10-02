import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  BUILDINGS, DEFAULT_ASSUMPTIONS, ReportInputSchema, SAMPLE_REPORTS, createReport, mergeReports, nearestBuilding,
  type Report, type ReportInput, type Role,
} from '@waha/shared';
import { server, type Source } from '../api';

type ReportState = {
  reports: Report[];
  /** Where the list last came from. "browser" means the server was unreachable. */
  source: Source;
  load: () => Promise<void>;
  add: (input: ReportInput, reporter: Role) => Promise<Report>;
};

/**
 * Reports live in this browser (localStorage) and on the server when it is up.
 * On load the two lists are merged, so a report made offline isn't lost when the server comes back.
 */
export const useReports = create<ReportState>()(
  persist(
    (set, get) => ({
      reports: SAMPLE_REPORTS,
      source: 'browser',
      load: async () => {
        const remote = await server<Report[]>('/reports');
        if (remote) set({ reports: mergeReports(get().reports, remote), source: 'server' });
        else set({ source: 'browser' });
      },
      add: async (input, reporter) => {
        // Same rules as the server, so the offline path can't sneak past them.
        const valid = ReportInputSchema.parse({ ...input, reporter });
        const remote = await server<Report>('/reports', valid);
        const report = remote ?? createReport(
          input,
          reporter,
          nearestBuilding(input.lat, input.lng, BUILDINGS, DEFAULT_ASSUMPTIONS['community.radiusKm'].value)?.id,
        );
        set({ reports: mergeReports(get().reports, [report]), source: remote ? 'server' : 'browser' });
        return report;
      },
    }),
    { name: 'waha-reports', partialize: (s) => ({ reports: s.reports }) },
  ),
);
