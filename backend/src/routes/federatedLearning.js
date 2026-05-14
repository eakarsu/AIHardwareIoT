// Federated learning for edge models trained on aggregate device data
// without raw telemetry leaving the edge.
// Audit: batch_04.md / AIHardwareIoT / Custom Feature Suggestions #2
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const aiService = require('../services/openRouterService');

const JWT_SECRET = process.env.JWT_SECRET || 'iot-secret';
const router = express.Router();

router.use((req, res, next) => {
  const h = req.headers.authorization;
  const token = h && h.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(403).json({ error: 'Invalid token' }); }
});

function parseJSON(t) { try { const m = t.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch (_) {} return { notes: t }; }

// Bootstrap aggregate table
pool.query(`CREATE TABLE IF NOT EXISTS fl_aggregates (
  id SERIAL PRIMARY KEY, model_id TEXT, device_id TEXT, round_id INT,
  weights_summary JSONB, sample_count INT, submitted_at TIMESTAMPTZ DEFAULT NOW()
)`).catch(() => {});

// POST /api/federated-learning/submit-aggregate
// Body: { model_id, device_id, round_id, weights_summary, sample_count }
router.post('/submit-aggregate', async (req, res) => {
  try {
    const { model_id, device_id, round_id, weights_summary, sample_count = 0 } = req.body || {};
    if (!model_id || !device_id) return res.status(400).json({ error: 'model_id and device_id required' });

    await pool.query(
      `INSERT INTO fl_aggregates (model_id, device_id, round_id, weights_summary, sample_count)
       VALUES ($1,$2,$3,$4,$5)`,
      [model_id, device_id, round_id || 0, JSON.stringify(weights_summary || {}), sample_count]
    );
    res.json({ ok: true, accepted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/federated-learning/aggregate-round { model_id, round_id }
router.post('/aggregate-round', async (req, res) => {
  try {
    const { model_id, round_id } = req.body || {};
    if (!model_id) return res.status(400).json({ error: 'model_id required' });

    const r = await pool.query(
      `SELECT device_id, weights_summary, sample_count, submitted_at
       FROM fl_aggregates WHERE model_id = $1 ${round_id ? 'AND round_id = $2' : ''}
       ORDER BY submitted_at DESC LIMIT 200`,
      round_id ? [model_id, round_id] : [model_id]
    );

    const totalSamples = r.rows.reduce((s, x) => s + (x.sample_count || 0), 0);
    const deviceCount = new Set(r.rows.map(x => x.device_id)).size;

    const userPrompt = `Federated learning aggregation request.
Model: ${model_id}; Round: ${round_id || 'latest'}.
Device count: ${deviceCount}; Total samples: ${totalSamples}.
Submitted weight summaries (sample): ${JSON.stringify(r.rows.slice(0, 20))}

Return STRICT JSON:
{
  "summary": "...",
  "aggregation_strategy": "fedavg|fedprox|scaffold",
  "weighted_average_summary": { /* short description */ },
  "convergence_signal": "stable|drifting|unstable",
  "next_round_recommendation": { "min_devices": 0, "min_samples": 0, "deadline_hours": 0 },
  "anomalous_clients": [{ "device_id": "string", "issue": "string" }],
  "disclaimer": "Aggregation summary; real weight aggregation done off-LLM."
}`;

    const raw = await aiService.makeRequest([{ role: 'user', content: userPrompt }]);
    res.json({
      model_id,
      round_id: round_id || null,
      device_count: deviceCount,
      total_samples: totalSamples,
      aggregation: parseJSON(raw)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/federated-learning/rounds?model_id=...
router.get('/rounds', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT round_id, COUNT(*) AS submissions, MAX(submitted_at) AS last_submitted
       FROM fl_aggregates WHERE model_id = $1 GROUP BY round_id ORDER BY round_id DESC`,
      [req.query.model_id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
