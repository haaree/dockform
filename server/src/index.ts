import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRouter from './routes/auth.js';
import companiesRouter from './routes/companies.js';
import plantsRouter from './routes/plants.js';
import departmentsRouter from './routes/departments.js';
import teamsRouter from './routes/teams.js';
import rolesRouter from './routes/roles.js';
import permissionsRouter from './routes/permissions.js';
import usersRouter from './routes/users.js';
import formsRouter from './routes/forms.js';
import responsesRouter from './routes/responses.js';
import dashboardRouter from './routes/dashboard.js';
import cronRouter from './routes/cron.js';
import emailRouter from './routes/email.js';
import aiRouter from './routes/ai.js';
import uploadsRouter from './routes/uploads.js';
import filesRouter from './routes/files.js';
import { authMiddleware } from './middleware/auth.js';

export const prisma = new PrismaClient();

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/cron', cronRouter);
app.use('/api/email', emailRouter);
app.use('/api/files', filesRouter);

app.use('/api', authMiddleware);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/plants', plantsRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/permissions', permissionsRouter);
app.use('/api/users', usersRouter);
app.use('/api/forms', formsRouter);
app.use('/api/responses', responsesRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/ai', aiRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled route error]', err?.message, err?.stack);
  if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`DockForm API listening on :${PORT}`);
});
