import { REPORT_STATUSES, type Report, type ReportStatus, type Role } from './types';

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
