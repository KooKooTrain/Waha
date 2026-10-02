import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_ASSUMPTIONS, withOverrides, type AssumptionKey, type AssumptionOverrides } from '@waha/shared';

type AssumptionState = {
  overrides: AssumptionOverrides;
  /** Sets the likely value. Low and high slide with it, so the uncertainty stays the same width. */
  setValue: (key: AssumptionKey, value: number) => void;
  reset: (key?: AssumptionKey) => void;
};

export const useAssumptionStore = create<AssumptionState>()(
  persist(
    (set) => ({
      overrides: {},
      setValue: (key, value) => set((s) => {
        const base = DEFAULT_ASSUMPTIONS[key];
        const slide = (edge?: number) => (edge === undefined ? undefined : Math.max(0, edge + value - base.value));
        const low = slide(base.low);
        const high = slide(base.high);
        return { overrides: { ...s.overrides, [key]: { value, ...(low !== undefined && { low }), ...(high !== undefined && { high }) } } };
      }),
      reset: (key) => set((s) => {
        if (!key) return { overrides: {} };
        const { [key]: _, ...rest } = s.overrides;
        return { overrides: rest };
      }),
    }),
    { name: 'waha-assumptions' },
  ),
);

/** The live assumption set: defaults plus whatever this person has edited. */
export function useAssumptions() {
  const overrides = useAssumptionStore((s) => s.overrides);
  return useMemo(() => withOverrides(overrides), [overrides]);
}
