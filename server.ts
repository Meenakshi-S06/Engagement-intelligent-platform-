// server.ts
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  authRouter,
  usersRouter,
  batchesRouter,
  sessionsRouter,
  attendanceRouter,
  assessmentsRouter,
  feedbackRouter,
  mentorAssignmentsRouter,
  mentorAlertsRouter,
  riskRouter,
  interventionsRouter,
  tasksRouter,
  eventsRouter,
  proofsRouter,
  engagementRouter,
  leaderboardRouter,
} from './server/routes/index';
import { authenticateJwt } from './server/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 1. Auth routes (unprotected login/refresh)
  app.use('/auth', authRouter);

  // 2. Users routes
  app.use('/users', usersRouter);
  app.use('/admin/users', usersRouter);

  // 3. API Module routes
  app.use('/api/batches', authenticateJwt, batchesRouter);
  app.use('/api/sessions', authenticateJwt, sessionsRouter);
  app.use('/api/attendance', authenticateJwt, attendanceRouter);
  app.use('/api/assessments', authenticateJwt, assessmentsRouter);
  app.use('/api/feedback', authenticateJwt, feedbackRouter);
  app.use('/api/mentor-assignments', authenticateJwt, mentorAssignmentsRouter);
  app.use('/api/mentor-alerts', authenticateJwt, mentorAlertsRouter);
  app.use('/api/risk', authenticateJwt, riskRouter);
  app.use('/api/interventions', authenticateJwt, interventionsRouter);
  app.use('/api/tasks', authenticateJwt, tasksRouter);
  app.use('/api/events', authenticateJwt, eventsRouter);
  app.use('/api/proofs', authenticateJwt, proofsRouter);
  app.use('/api/engagement', authenticateJwt, engagementRouter);
  app.use('/api/leaderboard', authenticateJwt, leaderboardRouter);

  // Frontend Serving: Vite dev server or static dist
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HOPE Platform] Server running on http://0.0.0.0:${PORT} (Mode: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
