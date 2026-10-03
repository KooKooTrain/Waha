import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { X } from 'lucide-react';
import { DEFAULT_ASSUMPTIONS, type Assumption, type AssumptionKey, type BuildingType } from '@waha/shared';
import { useAssumptionStore, useAssumptions } from '../store/assumptions';
import { cx } from './kit';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Which assumptions this result depends on, in display order. */
  keys: AssumptionKey[];
  formula?: string;
};

const isWahaChoice = (a: Assumption) => a.source.startsWith('Waha');
const trim = (n: number) => +n.toPrecision(4);

export function AssumptionsDrawer({ open, onClose, keys, formula }: Props) {
  const current = useAssumptions();
  const overrides = useAssumptionStore((s) => s.overrides);
  const setValue = useAssumptionStore((s) => s.setValue);
  const reset = useAssumptionStore((s) => s.reset);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const groups = [...new Set(keys.map((k) => DEFAULT_ASSUMPTIONS[k].group))];
  const edited = keys.filter((k) => overrides[k]);

  return (
    <div className="fixed inset-0 z-[1200] flex justify-end">
      <div onClick={onClose} className="absolute inset-0 bg-[rgb(2_24_34/.55)] backdrop-blur-[2px]" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="assumptions-title"
        className="relative flex h-full w-[min(460px,100%)] animate-drawer flex-col gap-[22px] overflow-y-auto waha-panel border-l p-7 shadow-[-30px_0_80px_-30px_rgb(0_0_0/.6)]"
      >
        <div className="flex items-center justify-between">
          <h2 id="assumptions-title" className="m-0 text-[28px] tracking-tight">Assumptions</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/20 bg-white/6 text-mist-50 hover:bg-white/12"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {formula && (
          <div className="border-y border-white/12 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[.12em] text-sand-200">Formula</div>
            <div className="mt-2 text-[17px] font-medium italic text-mist-50">{formula}</div>
          </div>
        )}

        <p className="m-0 text-[13px] leading-relaxed text-mist-200">
          Change any value and every estimate on the site updates. Low and high shift with it. Your edits stay in this browser.
        </p>

        {groups.map((group) => (
          <section key={group} className="flex flex-col gap-5">
            <h3 className="m-0 font-sans text-xs font-semibold uppercase tracking-[.14em] text-aqua-300">{group}</h3>
            {keys.filter((k) => DEFAULT_ASSUMPTIONS[k].group === group).map((k) => {
              const a = current[k];
              const isEdited = !!overrides[k];
              const hasRange = a.low !== undefined && a.high !== undefined;
              return (
                <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                  <label htmlFor={`a-${k}`} className="text-sm font-semibold">{a.label}</label>
                  <span className="flex items-center gap-1.5">
                    <input
                      id={`a-${k}`}
                      key={a.value}
                      type="number"
                      step="any"
                      min={0}
                      defaultValue={trim(a.value)}
                      onBlur={(e) => {
                        const v = Number(e.currentTarget.value);
                        if (Number.isFinite(v) && v >= 0 && v !== a.value) setValue(k, v);
                        else e.currentTarget.value = String(trim(a.value));
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      className="w-24 rounded-sm border border-white/16 bg-[#fff] px-2.5 py-1.5 text-right text-sm font-semibold tabular-nums text-aqua-300 outline-none focus:border-aqua-300"
                    />
                    <span className="w-16 text-xs text-mist-300">{a.unit}</span>
                  </span>
                  {hasRange && (
                    <span className="col-span-2 text-xs tabular-nums text-mist-400">
                      Range {trim(Math.min(a.low!, a.high!))} to {trim(Math.max(a.low!, a.high!))}
                    </span>
                  )}
                  <span className="col-span-2 text-[13px] leading-normal text-mist-200">{a.source}</span>
                  <span className={cx('col-span-2 flex gap-3 text-xs font-medium', isEdited ? 'text-conf-high-text' : isWahaChoice(a) ? 'text-sand-200' : 'text-mist-300')}>
                    {isEdited ? 'Your edit' : isWahaChoice(a) ? 'Waha assumption' : 'Published source'}
                    {a.url && !isEdited && <a href={a.url} target="_blank" rel="noreferrer">Source ↗</a>}
                    {isEdited && (
                      <button onClick={() => reset(k)} className="cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-aqua-300 underline">
                        Reset
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </section>
        ))}

        <div className="mt-auto flex items-center justify-between gap-4 pt-2">
          <Link to="/methodology" onClick={onClose} className="text-sm font-semibold">Full methodology →</Link>
          {edited.length > 0 && (
            <button onClick={() => edited.forEach((k) => reset(k))} className="cursor-pointer rounded-full border border-white/25 bg-transparent px-4 py-2 text-[13px] font-semibold text-mist-50 hover:bg-white/6">
              Reset {edited.length} edit{edited.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

/** The assumptions a building estimate leans on, across both condensate methods. */
export const buildingAssumptionKeys = (type: BuildingType): AssumptionKey[] => [
  'condensate.coilDewPointC', 'condensate.oaDelivered', `profile.${type}.oa`, `profile.${type}.hours`, `profile.${type}.days`,
  'psychro.airDensity', 'psychro.pressureKPa',
  'condensate.galPerTonHour', 'condensate.peakLoadFactor', 'condensate.balancePointC', `profile.${type}.m2PerTon`,
];
