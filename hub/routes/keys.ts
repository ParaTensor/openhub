import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db';
import { AuthenticatedRequest } from '../types';

const router = Router();

function normalizeAllowedModels(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const ids = value.filter((x) => typeof x === 'string') as string[];
    return ids.length > 0 ? ids : undefined;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        const ids = parsed.filter((x) => typeof x === 'string') as string[];
        return ids.length > 0 ? ids : undefined;
      }
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

router.get('/', async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const uid = authReq.authUser?.id;
  if (!uid) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const { rows } = await pool.query(
    `SELECT id, name, key, uid, created_at, last_used, usage, allowed_models, budget_limit
     FROM user_api_keys
     WHERE uid = $1
     ORDER BY created_at DESC`,
    [uid],
  );
  res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      key: row.key,
      uid: row.uid,
      createdAt: new Date(Number(row.created_at)).toISOString(),
      lastUsed: row.last_used || 'Never',
      usage: row.usage || '$0.00',
      allowedModels: normalizeAllowedModels(row.allowed_models),
      budgetLimit: row.budget_limit !== null ? Number(row.budget_limit) : undefined,
    })),
  );
});

router.post('/', async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const uid = authReq.authUser?.id;
  if (!uid) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const { name, key, lastUsed, usage, budgetLimit, allowedModels } = req.body || {};
  if (!name || !key) {
    return res.status(400).json({ error: 'name/key required' });
  }
  const id = randomUUID();
  const createdAt = Date.now();

  let parsedModels = null;
  if (Array.isArray(allowedModels) && allowedModels.length > 0) {
    parsedModels = JSON.stringify(allowedModels);
  }

  await pool.query(
    `INSERT INTO user_api_keys (id, name, key, uid, created_at, last_used, usage, allowed_models, budget_limit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, name, key, uid, createdAt, lastUsed || 'Never', usage || '$0.00', parsedModels, budgetLimit || null],
  );
  res.status(201).json({ id, createdAt });
});

router.patch('/:id', async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const uid = authReq.authUser?.id;
  if (!uid) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const { id } = req.params;
  const own = await pool.query('SELECT 1 FROM user_api_keys WHERE id = $1 AND uid = $2 LIMIT 1', [id, uid]);
  if (own.rows.length === 0) {
    return res.status(404).json({ error: 'not found' });
  }

  const { name, budgetLimit, allowedModels } = req.body || {};
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) {
      return res.status(400).json({ error: 'name cannot be empty' });
    }
    sets.push(`name = $${i++}`);
    values.push(trimmed);
  }
  if (budgetLimit !== undefined) {
    sets.push(`budget_limit = $${i++}`);
    values.push(budgetLimit === null || budgetLimit === '' ? null : Number(budgetLimit));
  }
  if (allowedModels !== undefined) {
    sets.push(`allowed_models = $${i++}`);
    const parsed =
      Array.isArray(allowedModels) && allowedModels.length > 0 ? JSON.stringify(allowedModels) : null;
    values.push(parsed);
  }

  if (sets.length === 0) {
    return res.status(400).json({ error: 'no updates' });
  }

  values.push(id);
  await pool.query(`UPDATE user_api_keys SET ${sets.join(', ')} WHERE id = $${i} AND uid = $${i + 1}`, [...values, uid]);
  res.json({ status: 'ok' });
});

router.delete('/:id', async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const uid = authReq.authUser?.id;
  if (!uid) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const r = await pool.query('DELETE FROM user_api_keys WHERE id = $1 AND uid = $2 RETURNING id', [req.params.id, uid]);
  if (r.rowCount === 0) {
    return res.status(404).json({ error: 'not found' });
  }
  res.json({ status: 'deleted' });
});

export default router;
