import express, { type ErrorRequestHandler, type Response } from 'express';
import {
  BUILDINGS, BuildingSchema, CAPTURE_ZONES, CatchmentSchema, OverridesSchema, ReportInputSchema, SAMPLE_REPORTS,
  analyzeBuilding, createReport, estimateRunoff, findCommunities, nearestBuilding, withOverrides, type Report,
} from '@waha/shared';
import { z } from 'zod';

const app = express();
app.use(express.json({ limit: '100kb' }));

// ponytail: reports live in memory and reset when the server restarts. The client keeps its own copy
// in localStorage and merges, so nothing is lost for the person using it. Swap in a database when it matters.
let reports: Report[] = [...SAMPLE_REPORTS];

const invalid = (res: Response, error: z.ZodError) => res.status(400).json({ error: 'Invalid request', issues: error.issues });

/** Assumption edits ride along with every analysis request. Unknown keys are dropped by the schema. */
const assumptionsFrom = (body: unknown) => withOverrides(OverridesSchema.parse((body as { overrides?: unknown })?.overrides ?? {}));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/buildings', (_req, res) => {
  res.json(BUILDINGS);
});

app.get('/api/zones', (_req, res) => {
  res.json(CAPTURE_ZONES);
});

app.post('/api/analyze/buildings', (req, res) => {
  const a = assumptionsFrom(req.body);
  res.json(BUILDINGS.map((b) => analyzeBuilding(b, reports, a)));
});

app.post('/api/analyze/building', (req, res) => {
  const building = BuildingSchema.safeParse(req.body?.building);
  if (!building.success) return invalid(res, building.error);
  res.json(analyzeBuilding(building.data, reports, assumptionsFrom(req.body)));
});

const RunoffBody = z.object({ catchments: z.array(CatchmentSchema).min(1).max(200), depthMm: z.number().positive().max(1000) });

app.post('/api/analyze/runoff', (req, res) => {
  const body = RunoffBody.safeParse(req.body);
  if (!body.success) return invalid(res, body.error);
  const a = assumptionsFrom(req.body);
  res.json(body.data.catchments.map((c) => estimateRunoff(c, body.data.depthMm, a)));
});

app.post('/api/communities', (req, res) => {
  res.json(findCommunities(BUILDINGS, reports, assumptionsFrom(req.body)));
});

app.get('/api/reports', (_req, res) => {
  res.json(reports);
});

app.post('/api/reports', (req, res) => {
  const body = ReportInputSchema.safeParse(req.body);
  if (!body.success) return invalid(res, body.error);
  const { reporter, ...input } = body.data;
  const a = withOverrides({});
  const report = createReport(input, reporter, nearestBuilding(input.lat, input.lng, BUILDINGS, a['community.radiusKm'].value)?.id);
  reports = [report, ...reports];
  res.status(201).json(report);
});

// Bad overrides throw from OverridesSchema.parse; anything else is a real bug.
const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof z.ZodError) return invalid(res, err);
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
};
app.use(onError);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`Waha API on http://localhost:${port}`));
