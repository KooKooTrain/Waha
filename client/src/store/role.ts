import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '@waha/shared';

/** Who you're using Waha as. No sign-in in this prototype; it's a switch so judges can see every side. */
export const useRole = create<{ role: Role; setRole: (role: Role) => void }>()(
  persist((set) => ({ role: 'citizen', setRole: (role) => set({ role }) }), { name: 'waha-role' }),
);

export const ROLE_LABELS: Record<Role, string> = { citizen: 'Resident', owner: 'Building owner', authority: 'Authority' };
