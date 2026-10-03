import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { UserRound } from 'lucide-react';
import type { Role } from '@waha/shared';
import { ROLE_LABELS, useRole } from '../store/role';
import './water-flow.js';
import { cx } from './kit';

const PAGES = [
  ['/', 'Home'], ['/buildings', 'Buildings'], ['/rainfall', 'Rainfall'], ['/community', 'Community'], ['/map', 'Map'], ['/dashboard', 'Dashboard'],
] as const;

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 42 42" fill="none" aria-hidden>
      <path d="M21 4C17 12 8 22 8 29a13 13 0 0026 0c0-7-9-17-13-25Z" stroke="currentColor" strokeWidth="2.4" />
      <path d="M12 28c6-5 11 5 18 0M13 33c6-4 10 4 16 0" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** Floating white pill. On phones the links fold into a menu under the pill. */
export function Nav({ right = <RoleSwitcher />, className }: { right?: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className={cx(
      'relative z-[1100] mx-auto mt-6 flex h-[70px] w-[min(1180px,calc(100%-32px))] items-center justify-between gap-5 rounded-[40px] border border-white/45 bg-white/95 pl-[26px] pr-[18px] text-[#193c4b] shadow-[inset_0_1px_0_#fff,0_12px_30px_rgb(4_40_56/.18)] backdrop-blur-[18px] max-md:h-[60px] max-md:gap-2 max-md:pl-[19px] max-md:pr-3',
      className,
    )}>
      <Link to="/" aria-label="Waha home" className="flex flex-none items-center gap-2 text-[#193c4b] hover:text-[#193c4b]">
        <Logo />
        <span className="font-display text-[25px] font-semibold tracking-[-0.5px] max-md:text-[22px]">WAHA.</span>
      </Link>
      <nav
        aria-label="Main navigation"
        className={cx(
          'items-center gap-8 text-[13px] font-medium max-lg:gap-5 max-md:absolute max-md:inset-x-0 max-md:top-[69px] max-md:flex-col max-md:items-stretch max-md:gap-1 max-md:rounded-2xl max-md:bg-white max-md:px-6 max-md:py-4 max-md:text-[15px] max-md:shadow-[0_15px_25px_#143a5015]',
          open ? 'flex' : 'hidden md:flex',
        )}
      >
        {PAGES.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) => cx('py-3 transition-colors', isActive ? 'text-[#193c4b] hover:text-[#193c4b]' : 'text-[#66777e] hover:text-[#193c4b]')}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-1 max-md:ml-auto">
        {right}
        <button type="button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="p-2 text-2xl leading-none md:hidden">☰</button>
      </div>
    </header>
  );
}

/** No sign-in in this prototype. Switch roles to see what residents, owners and the authority each get. */
export function RoleSwitcher() {
  const role = useRole((s) => s.role);
  const setRole = useRole((s) => s.setRole);
  return (
    <label className="relative flex items-center">
      <span className="sr-only">Viewing as</span>
      <UserRound size={14} strokeWidth={1.75} aria-hidden className={cx('pointer-events-none absolute left-3.5', role === 'authority' ? 'text-lagoon-950' : 'text-white')} />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        title="Switch role"
        className={cx(
          'min-h-[42px] max-w-[140px] cursor-pointer appearance-none truncate rounded-full border-0 py-2.5 pl-9 pr-5 text-[13px] font-medium transition-colors max-md:min-h-9 max-md:max-w-[118px] max-md:pl-8 max-md:pr-3 max-md:text-xs',
          role === 'authority' ? 'bg-sand-400 text-lagoon-950 hover:bg-sand-300' : 'bg-[#103f53] text-white hover:bg-[#205e75]',
        )}
      >
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r} className="bg-lagoon-900 text-mist-50">{ROLE_LABELS[r]}</option>)}
      </select>
    </label>
  );
}

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/16 bg-[rgb(4_40_56/.62)] backdrop-blur-[20px]">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-x-7 gap-y-4 px-4 py-7 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo size={20} />
          <span className="font-display text-base font-black tracking-[-0.03em]">WAHA</span>
          <span className="text-[13px] font-medium">UAE Hackathon prototype</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-sand-400/35 bg-[rgb(4_30_42/.35)] px-3 py-1.5 text-xs font-medium text-sand-200">
            <span className="size-1.5 rounded-full bg-sand-400" />Prototype data. All figures are estimates.
          </span>
          <Link to="/methodology" className="text-[13px] font-semibold text-mist-50">Methodology</Link>
          <Link to="/kit" className="text-[13px] font-semibold text-mist-50">Design system</Link>
        </div>
      </div>
    </footer>
  );
}

/** Animated water, then a tint so text on top stays readable. */
export function Water({ intensity = '1', speed = '0.6', sand = '0.4', tint = 'bg-[rgb(6_56_74/.55)]' }: {
  intensity?: string; speed?: string; sand?: string; tint?: string;
}) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <waha-water intensity={intensity} speed={speed} sand={sand} style={{ position: 'absolute', inset: 0 }} />
      <div className={cx('absolute inset-0', tint)} />
    </div>
  );
}

/** Standard page shell: water behind, nav on top, footer below. */
export function Layout() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Water />
      <div className="relative z-10">
        <Nav />
        <Outlet />
        <Footer />
      </div>
    </div>
  );
}

export function PageHeader({ overline, title, intro, children, wide }: {
  overline: string; title: string; intro?: ReactNode; children?: ReactNode; wide?: boolean;
}) {
  return (
    <header className={cx('mx-auto flex flex-wrap items-end justify-between gap-x-12 gap-y-5 px-4 pb-7 pt-16 sm:px-6', wide ? 'max-w-[1280px]' : 'max-w-[1180px]')}>
      <div className="animate-fade-up">
        <p className="m-0 mb-3.5 text-xs font-semibold uppercase tracking-[.14em] text-sand-200">{overline}</p>
        <h1 className="m-0 max-w-[16ch] text-[clamp(40px,5.5vw,72px)] leading-[.98] tracking-[-0.07em]">{title}</h1>
        {intro && <p className="m-0 mt-4 max-w-[46ch] text-base leading-relaxed text-mist-50">{intro}</p>}
      </div>
      {children}
    </header>
  );
}

/** Small note saying where the numbers on a page were worked out. */
export function SourceNote({ source }: { source?: 'server' | 'browser' }) {
  if (!source) return null;
  return (
    <span className="text-xs text-mist-300">
      {source === 'server' ? 'Live from the Waha server' : 'Server offline, running in your browser'}
    </span>
  );
}
