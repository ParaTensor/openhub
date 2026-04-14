import type {Request, Response} from 'express';
import {Router} from 'express';
import {pool} from '../db';
import {requireRole} from '../middleware/auth';

/** 首页等匿名场景；在 server 中挂在全局 authenticate 之前 */
export async function handlePublicLlmModelsList(_req: Request, res: Response) {
  try {
    const {rows} = await pool.query('SELECT * FROM llm_models ORDER BY name DESC');
    res.json(rows);
  } catch (e: any) {
    console.error('GET /api/llm-models:', e);
    res.status(500).json({error: String(e?.message || e)});
  }
}

const router = Router();

router.use(requireRole('admin'));

router.put('/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();
  const { name, description, context_length, global_pricing } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  await pool.query(
    `UPDATE llm_models
     SET name = COALESCE($2, name),
         description = COALESCE($3, description),
         context_length = COALESCE($4, context_length),
         global_pricing = COALESCE($5::jsonb, global_pricing),
         updated_at = $6
     WHERE id = $1`,
    [id, name, description, context_length, global_pricing ? JSON.stringify(global_pricing) : null, Date.now()],
  );
  res.json({ status: 'updated' });
});

router.post('/remote-sync', requireRole('admin'), async (req, res) => {
  const { url, payload } = req.body;
  
  let modelsToSync: any[] = [];
  
  try {
    if (url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch remote JSON');
      modelsToSync = await response.json();
    } else if (Array.isArray(payload)) {
      modelsToSync = payload;
    } else {
      return res.status(400).json({ error: 'Provide url or valid JSON payload' });
    }
    
    // Simulate updating DB
    for (const model of modelsToSync) {
      if (!model.id) continue;
      await pool.query(
        `INSERT INTO llm_models (id, name, description, context_length, global_pricing, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)
         ON CONFLICT (id)
         DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           context_length = EXCLUDED.context_length,
           global_pricing = EXCLUDED.global_pricing,
           updated_at = $6`,
        [
          model.id,
          model.name || model.id,
          model.description || '',
          model.context_length || null,
          JSON.stringify(model.global_pricing || {}),
          Date.now(),
        ],
      );
    }
    
    res.json({ status: 'synced', count: modelsToSync.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
