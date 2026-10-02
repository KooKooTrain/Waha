import { useEffect, useState } from 'react';
import {
  BUILDINGS, CAPTURE_ZONES, analyzeBuilding, estimateRunoff, findCommunities, withOverrides,
  type AssumptionOverrides, type Building, type BuildingAnalysis, type CaptureZone, type CatchmentInput, type Community,
  type Report, type RunoffEstimate,
} from '@waha/shared';

/**
 * Every page goes through here. Each call tries the Express server first and, if it is down,
 * slow or says no, runs the same shared engine right here in the browser. Same code, same numbers.
 */

export type Source = 'server' | 'browser';
export type Result<T> = { data: T; source: Source };

const TIMEOUT_MS = 2500;

export async function server<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T | undefined> {
  try {
    const res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? ((await res.json()) as T) : undefined;
  } catch {
    return undefined;
  }
}

async function either<T>(remote: Promise<T | undefined>, local: () => T): Promise<Result<T>> {
  const data = await remote;
  return data === undefined ? { data: local(), source: 'browser' } : { data, source: 'server' };
}

export const api = {
  buildings: () => either(server<Building[]>('/buildings'), () => BUILDINGS),

  zones: () => either(server<CaptureZone[]>('/zones'), () => CAPTURE_ZONES),

  analyzeBuildings: (overrides: AssumptionOverrides, reports: Report[]) =>
    either(
      server<BuildingAnalysis[]>('/analyze/buildings', { overrides }),
      () => BUILDINGS.map((b) => analyzeBuilding(b, reports, withOverrides(overrides))),
    ),

  analyzeBuilding: (building: Building, overrides: AssumptionOverrides, reports: Report[]) =>
    either(
      server<BuildingAnalysis>('/analyze/building', { building, overrides }),
      () => analyzeBuilding(building, reports, withOverrides(overrides)),
    ),

  runoff: (catchments: CatchmentInput[], depthMm: number, overrides: AssumptionOverrides) =>
    either(
      server<RunoffEstimate[]>('/analyze/runoff', { catchments, depthMm, overrides }),
      () => catchments.map((c) => estimateRunoff(c, depthMm, withOverrides(overrides))),
    ),

  communities: (overrides: AssumptionOverrides, reports: Report[]) =>
    either(server<Community[]>('/communities', { overrides }), () => findCommunities(BUILDINGS, reports, withOverrides(overrides))),
};

/** Runs an api call and re-runs it when `deps` change. Keeps the last data on screen while reloading. */
export function useApi<T>(run: () => Promise<Result<T>>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; source?: Source; loading: boolean }>({ loading: true });
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    run().then((r) => live && setState({ ...r, loading: false }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
