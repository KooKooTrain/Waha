import { REPORT_STATUSES, type Report, type ReportInput, type ReportStatus, type Role } from './types';

export const STATUS_LABELS: Record<ReportStatus, string> = {
  submitted: 'Submitted',
  review: 'Under review',
  investigating: 'Investigating',
  verified: 'Verified',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

/** The happy path, in order. Rejected sits off to the side. */
export const STATUS_PIPELINE: ReportStatus[] = REPORT_STATUSES.filter((s) => s !== 'rejected');

export const isOpen = (s: ReportStatus) => s !== 'resolved' && s !== 'rejected';

/** An authority can move a report forward (skipping steps is fine) or reject anything still open. */
export function nextStatuses(s: ReportStatus): ReportStatus[] {
  if (!isOpen(s)) return [];
  return [...STATUS_PIPELINE.slice(STATUS_PIPELINE.indexOf(s) + 1), 'rejected'];
}

export function changeStatus(r: Report, to: ReportStatus, by: Role, note?: string, at = new Date().toISOString()): Report {
  if (by !== 'authority') throw new Error('Only the authority can change a report status');
  if (!nextStatuses(r.status).includes(to)) throw new Error(`Can't move a report from ${r.status} to ${to}`);
  return { ...r, status: to, history: [...r.history, { status: to, at, by, ...(note ? { note } : {}) }] };
}

/** A brand new report. The title falls back to the start of the description. */
export function createReport(input: ReportInput, reporter: Role, buildingId?: string, now = new Date()): Report {
  const at = now.toISOString();
  const description = input.description.trim();
  const title = input.title?.trim() || (description.length > 60 ? `${description.slice(0, 57).trimEnd()}…` : description);
  return {
    id: `r-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    kind: input.kind,
    title,
    description,
    lat: input.lat,
    lng: input.lng,
    ...(buildingId ? { buildingId } : {}),
    status: 'submitted',
    createdAt: at,
    reporter,
    history: [{ status: 'submitted', at, by: reporter }],
  };
}

/**
 * Joins two report lists by id. When both have the same report, the one with the longer
 * history wins (it has seen more status changes). Newest first.
 */
export function mergeReports(a: Report[], b: Report[]): Report[] {
  const byId = new Map(a.map((r) => [r.id, r]));
  for (const r of b) {
    const mine = byId.get(r.id);
    if (!mine || r.history.length >= mine.history.length) byId.set(r.id, r);
  }
  return [...byId.values()].sort((x, y) => Date.parse(y.createdAt) - Date.parse(x.createdAt));
}
