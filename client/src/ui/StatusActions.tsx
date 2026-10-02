import { useState } from 'react';
import { STATUS_LABELS, nextStatuses, type Report, type ReportStatus } from '@waha/shared';
import { useReports } from '../store/reports';
import { useRole } from '../store/role';
import { STATUS_HEX, cx } from './kit';

/** The authority's controls for moving a report along. Renders nothing for anyone else. */
export function StatusActions({ report }: { report: Report }) {
  const role = useRole((s) => s.role);
  const setStatus = useReports((s) => s.setStatus);
  const [to, setTo] = useState<ReportStatus | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (role !== 'authority') return null;
  const options = nextStatuses(report.status);
  if (!options.length) return <p className="m-0 text-xs text-mist-300">This report is closed. Nothing left to review.</p>;

  // A rejection always says why, so the person who reported it isn't left guessing.
  const needsNote = to === 'rejected';
  const ready = !!to && (!needsNote || note.trim().length >= 3);

  const save = async () => {
    if (!to || !ready) return;
    setBusy(true);
    setError('');
    try {
      await setStatus(report.id, to, role, note.trim() || undefined);
      setTo(null);
      setNote('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-sand-400/30 bg-sand-400/6 p-3.5" onClick={(e) => e.stopPropagation()}>
      <span className="text-[11px] font-semibold uppercase tracking-[.12em] text-sand-200">Authority review</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Move this report to">
        {options.map((s) => (
          <button
            key={s}
            onClick={() => setTo(to === s ? null : s)}
            aria-pressed={to === s}
            className={cx(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
              to === s ? 'border-mist-50 bg-mist-50 text-lagoon-950' : 'border-white/22 bg-transparent text-mist-50 hover:bg-white/8',
            )}
          >
            <span className="size-1.5 rounded-full" style={{ background: STATUS_HEX[s] }} />
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      {to && (
        <div className="flex animate-fade-up flex-col gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            aria-label="Note for the reporter"
            placeholder={needsNote ? 'Why is it being rejected? (needed)' : 'Note for the reporter (optional)'}
            className="w-full rounded-sm border border-white/16 bg-[rgb(4_30_42/.55)] px-3 py-2 text-sm text-mist-50 outline-none focus:border-aqua-300"
          />
          <button
            onClick={save}
            disabled={!ready || busy}
            className={cx(
              'self-start rounded-full border-0 px-4 py-2 text-[13px] font-semibold text-lagoon-950',
              ready ? 'cursor-pointer bg-sand-400 hover:bg-sand-300' : 'cursor-not-allowed bg-sand-400/40',
            )}
          >
            {busy ? 'Saving…' : `Move to ${STATUS_LABELS[to]}`}
          </button>
        </div>
      )}
      {error && <span role="alert" className="text-xs text-conf-low-text">{error}</span>}
    </div>
  );
}
