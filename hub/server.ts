import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import { pool, initSchema } from './db';
import { AuthUser, AuthenticatedRequest } from './types';
import authRouter from './routes/auth';
import modelsRouter, {listPublishedRoutedModels} from './routes/models';
import pricingRouter from './routes/pricing';
import gatewayRouter from './routes/gateway';
import llmModelsRouter, {handlePublicLlmModelsList} from './routes/llm_models';
import providersRouter from './routes/providers';
import { authenticate } from './middleware/auth';
import keysRouter from './routes/keys';
import activityRouter from './routes/activity';
import billingRouter from './routes/billing';
import rankingsRouter from './routes/rankings';
import chatRouter from './routes/chat';
import customersRouter from './routes/customers';

const PORT = Number(process.env.PORT || 3322);

async function startServer() {
  await initSchema();

  const app = express();

  app.use((req, res, next) => {
    const origin = req.header('origin');
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  app.use(express.json());

  // 官方全局模型列表：必须在 authenticate 之前注册，否则未登录首页会 401
  app.get('/api/llm-models', handlePublicLlmModelsList);
  // 已发布路由模型（与登录后 /models 同源），供首页排序与展示
  app.get('/api/models', listPublishedRoutedModels);

  // Check Auth Middleware for /api routes
  app.use('/api', authenticate);

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'connected' });
    } catch {
      res.status(500).json({ status: 'error', database: 'disconnected' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/models', modelsRouter);
  app.use('/api/pricing', pricingRouter);
  app.use('/api/llm-models', llmModelsRouter);
  app.use('/api/gateway', gatewayRouter);
  app.use('/api', providersRouter);
  app.use('/api/user-api-keys', keysRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/rankings', rankingsRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/admin/customers', customersRouter);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      root: path.join(__dirname, '../web'),
      configFile: path.join(__dirname, '../web/vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
