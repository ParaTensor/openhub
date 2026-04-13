import { Router } from 'express';
import { randomUUID } from 'crypto';
import { Readable } from 'node:stream';
import { pool } from '../db';
import { requireRole } from '../middleware/auth';
import type { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.post('/completions', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const uid = authReq.authUser?.id;
  
  if (!uid) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Find an existing API key for the user
  let apiKeyRow = (await pool.query('SELECT key FROM user_api_keys WHERE uid = $1 ORDER BY created_at ASC LIMIT 1', [uid])).rows[0];

  if (!apiKeyRow) {
    // If no key exists, generate a playground key
    const newKey = `sk-${randomUUID().replace(/-/g, '')}`;
    const id = randomUUID();
    const createdAt = Date.now();
    await pool.query(
      `INSERT INTO user_api_keys (id, name, key, uid, created_at, last_used, usage)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, 'Playground Auto Key', newKey, uid, createdAt, 'Never', '$0.00'],
    );
    // Tell Gateway to reload config so it respects the new key? 
    // Gateway polls or uses pg_notify. Let's do pg_notify just in case Gateway caches it immediately.
    await pool.query("SELECT pg_notify('config_changed', 'api_keys')");

    apiKeyRow = { key: newKey };
    
    // Give gateway a split second to catch the pg_notify before we rush the request in the very same millisecond
    await new Promise(r => setTimeout(r, 200)); 
  }

  const apiKey = apiKeyRow.key;

  const payload = { ...req.body };

  try {
    const upstreamUrl = 'http://127.0.0.1:8000/v1/chat/completions';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const gatewayRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!gatewayRes.ok) {
      const errorText = await gatewayRes.text();
      let errorBody = {};
      try { errorBody = JSON.parse(errorText); } catch { errorBody = { message: errorText }; }
      return res.status(gatewayRes.status).json(errorBody);
    }

    // Proxy the response headers correctly
    res.status(gatewayRes.status);
    for (const [key, val] of gatewayRes.headers.entries()) {
      if (key !== 'content-encoding' && key !== 'content-length' && key !== 'connection') {
        res.setHeader(key, val);
      }
    }

    const upstreamCt = gatewayRes.headers.get('content-type') || '';
    if (upstreamCt.includes('text/event-stream')) {
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
    }
    res.flushHeaders();

    if (!gatewayRes.body) {
      res.end();
    } else {
      const body = gatewayRes.body as ReadableStream<Uint8Array> & NodeJS.ReadableStream;
      const flushRes = () => {
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      };

      if (typeof body.getReader === 'function') {
        const reader = body.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value && value.byteLength) {
            res.write(Buffer.from(value));
            flushRes();
          }
        }
      } else {
        for await (const chunk of Readable.fromWeb(body as any)) {
          if (chunk.length) {
            res.write(chunk);
            flushRes();
          }
        }
      }
      res.end();
    }
  } catch (error: any) {
    console.error('Playground Chat Proxy Error:', error);
    res.status(500).json({ error: 'Failed to contact Gateway', details: error.message });
  }
});

export default router;
