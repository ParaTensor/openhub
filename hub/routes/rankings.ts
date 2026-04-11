import { Router } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `
      SELECT 
        id, 
        name, 
        provider, 
        score, 
        trend, 
        category,
        global_pricing,
        (SELECT AVG(latency) FROM activity WHERE model = llm_models.id) as avg_latency
      FROM llm_models 
    `;
    
    const params: any[] = [];
    if (category && category !== 'Overall') {
      query += ` WHERE category = $1 `;
      params.push(category);
    }
    
    query += ` ORDER BY score DESC NULLS LAST `;

    const { rows: models } = await pool.query(query, params);

    // Calculate Summary Stats
    // 1. Top Gainer (Highest Score)
    const topGainer = models[0] || null;

    // 2. Fastest (Lowest Avg Latency)
    const fastest = [...models]
      .filter(m => m.avg_latency !== null)
      .sort((a, b) => Number(a.avg_latency) - Number(b.avg_latency))[0] || null;

    // 3. Best Value (Lowest Cost per 1m tokens: prompt + completion)
    const bestValue = [...models]
      .filter(m => m.global_pricing && m.global_pricing.prompt)
      .sort((a, b) => {
        const costA = (a.global_pricing.prompt || 0) + (a.global_pricing.completion || 0);
        const costB = (b.global_pricing.prompt || 0) + (b.global_pricing.completion || 0);
        return costA - costB;
      })[0] || null;

    res.json({
      models: models.map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider || 'Unknown',
        score: m.score || 0,
        latency: m.avg_latency ? `${(m.avg_latency / 1000).toFixed(2)}s` : 'N/A',
        cost: m.global_pricing?.prompt ? `$${((m.global_pricing.prompt + m.global_pricing.completion) / 2).toFixed(2)}` : 'N/A',
        trend: m.trend || 'stable'
      })),
      stats: {
        topGainer: topGainer ? { name: topGainer.name, score: topGainer.score } : null,
        fastest: fastest ? { name: fastest.name, latency: `${(fastest.avg_latency / 1000).toFixed(2)}s` } : null,
        bestValue: bestValue ? { name: bestValue.name, cost: `$${((bestValue.global_pricing.prompt + bestValue.global_pricing.completion) / 2).toFixed(2)}` } : null
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
