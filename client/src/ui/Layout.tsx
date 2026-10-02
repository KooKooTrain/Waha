import type { ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { UserRound } from 'lucide-react';
import type { Role } from '@waha/shared';
import { ROLE_LABELS, useRole } from '../store/role';
import './water-flow.js';
import { cx } from './kit';

const PAGES = [
  ['/', 'Home'], ['/buildings', 'Buildings'], ['/rainfall', 'Rainfall'], ['/community', 'Community'], ['/map', 'Map'], ['/dashboard', 'Dashboard'],
] as const;

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 13a5 5 0 1 1 5-5c0 7-4 13-13 14" stroke="#EEF5F6" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="14" cy="8" r="1.9" fill="#F0DEB8" />
    </svg>
  );
}

export function Nav({ light = false, right = <RoleSwitcher /> }: { light?: boolean; right?: ReactNode }) {
  return (
    <nav className={cx(
      'relative z-[1100] mx-auto mt-4 grid w-[min(1180px,calc(100%-32px))] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-full border border-white/20 px-4 py-2.5 shadow-glass backdrop-blur-[20px] backdrop-saturate-[140%] sm:grid-cols-[110px_minmax(0,1fr)_110px] sm:px-[22px]',
      light ? 'bg-[rgb(4_40_56/.38)]' : 'bg-[rgb(4_40_56/.55)]',
    )}>
      <Link to="/" aria-label="Waha home" className="flex items-center gap-2 text-mist-50 hover:text-mist-50">
        <Logo />
        <span className="hidden font-display text-[19px] font-black tracking-[-0.03em] sm:inline">WAHA</span>
      </Link>
      <div className="flex min-w-0 justify-[safe_center] gap-1 overflow-x-auto [scrollbar-width:none]">
        {PAGES.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cx(
              'flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium',
              isActive ? 'bg-mist-50 text-lagoon-950 hover:text-lagoon-950' : 'text-mist-50 hover:bg-white/10 hover:text-mist-50',
            )}
          >
            {label}
          </NavLink>
        ))}
      </div>
      <div className="flex justify-end">{right}</div>
    </nav>
  );
}

/** No sign-in in this prototype. Switch roles to see what residents, owners and the authority each get. */
export function RoleSwitcher() {
  const role = useRole((s) => s.role);
  const setRole = useRole((s) => s.setRole);
  return (
    <label className="relative flex items-center">
      <span className="sr-only">Viewing as</span>
      <UserRound size={14} strokeWidth={1.75} aria-hidden className={cx('pointer-events-none absolute left-2.5', role === 'authority' ? 'text-lagoon-950' : 'text-sand-200')} />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        title="Switch role"
        className={cx(
          'max-w-[118px] cursor-pointer appearance-none truncate rounded-full border py-1.5 pl-7 pr-3 text-xs font-semibold',
          role === 'authority' ? 'border-sand-400 bg-sand-400 text-lagoon-950' : 'border-white/25 bg-white/6 text-mist-50',
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
