import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import buildingsRouter from './routes/buildings';
import rainfallRouter from './routes/rainfall';
import communityRouter from './routes/community';
import mapRouter from './routes/map';
import dashboardRouter from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend integration (Vite dev server default: http://localhost:5173)
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    service: 'WAHA Water Resource Intelligence API',
    timestamp: new Date().toISOString(),
    version: '1.0.0-prototype'
  });
});

// Register Core Domain API Routes
app.use('/api/buildings', buildingsRouter);
app.use('/api/rainfall', rainfallRouter);
app.use('/api/community', communityRouter);
app.use('/api/map', mapRouter);
app.use('/api/dashboard', dashboardRouter);

// 404 Fallback Handler
app.use((req: Request, res: Response) => {
  return res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global 500 Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred'
  });
});

// Start Server if launched directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 WAHA Backend REST API Prototype running`);
    console.log(`📍 Local Server URL: http://localhost:${PORT}`);
    console.log(`💚 Health Check:    http://localhost:${PORT}/api/health`);
    console.log(`🗺️ Map Opportunities: http://localhost:${PORT}/api/map/opportunities`);
    console.log(`📊 Dashboard API:   http://localhost:${PORT}/api/dashboard`);
    console.log(`====================================================`);
  });
}

export default app;
