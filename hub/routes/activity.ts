import { Router } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const { rows } = await pool.query(
    'SELECT id, timestamp, model, tokens, latency, status, user_id, cost FROM activity ORDER BY timestamp DESC LIMIT $1',
    [limit],
  );
  res.json(rows);
});

router.get('/stats', async (req, res) => {
  try {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

    // 1. Current 7 days summary
    const { rows: currentStats } = await pool.query(`
      SELECT 
        SUM(tokens) as total_tokens,
        SUM(CAST(REPLACE(REPLACE(COALESCE(cost, '0'), '$', ''), ',', '') AS NUMERIC)) as total_cost,
        AVG(latency) as avg_latency
      FROM activity
      WHERE timestamp >= $1
    `, [sevenDaysAgo]);

    // 2. Previous 7 days summary (for comparison)
    const { rows: previousStats } = await pool.query(`
      SELECT 
        SUM(tokens) as total_tokens,
        SUM(CAST(REPLACE(REPLACE(COALESCE(cost, '0'), '$', ''), ',', '') AS NUMERIC)) as total_cost,
        AVG(latency) as avg_latency
      FROM activity
      WHERE timestamp >= $1 AND timestamp < $2
    `, [fourteenDaysAgo, sevenDaysAgo]);

    // 3. Daily trend for the last 7 days
    const { rows: dailyTrend } = await pool.query(`
      SELECT 
        to_char(to_timestamp(timestamp / 1000), 'Mon DD') as date,
        SUM(tokens) as tokens,
        SUM(CAST(REPLACE(REPLACE(COALESCE(cost, '0'), '$', ''), ',', '') AS NUMERIC)) as cost
      FROM activity
      WHERE timestamp >= $1
      GROUP BY date
      ORDER BY MIN(timestamp)
    `, [sevenDaysAgo]);

    const calculateChange = (current: number | null, previous: number | null) => {
      if (!current || !previous) return null;
      const change = ((current - previous) / previous) * 100;
      return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
    };

    const current = currentStats[0];
    const previous = previousStats[0];

    res.json({
      summary: {
        totalTokens: Number(current.total_tokens || 0),
        totalCost: Number(current.total_cost || 0),
        avgLatency: Number(current.avg_latency || 0),
        changes: {
          tokens: calculateChange(Number(current.total_tokens), Number(previous.total_tokens)),
          cost: calculateChange(Number(current.total_cost), Number(previous.total_cost)),
          latency: calculateChange(Number(current.avg_latency), Number(previous.avg_latency))
        }
      },
      trend: dailyTrend.map(t => ({
        date: t.date,
        tokens: Number(t.tokens),
        cost: Number(t.cost)
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
