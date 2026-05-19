// Agentic device health monitor predicting failures 1-3 months ahead with
// auto-generated tickets.
// Audit: batch_04.md / AIHardwareIoT / Custom Feature Suggestions #1
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

// POST /api/agentic-device-health/predict { device_ids?, horizon_months? }
router.post('/predict', async (req, res) => {
  try {
    const { device_ids = [], horizon_months = 3 } = req.body || {};

    let devices = { rows: [] };
    let telemetry = { rows: [] };
    let alerts = { rows: [] };
    try {
      const dq = device_ids.length
        ? await pool.query(`SELECT * FROM devices WHERE id = ANY($1) LIMIT 50`, [device_ids])
        : await pool.query(`SELECT * FROM devices ORDER BY id DESC LIMIT 50`);
      devices = dq;
    } catch (_) {}
    try {
      telemetry = await pool.query(
        `SELECT device_id, metric, value, recorded_at FROM telemetry
         WHERE recorded_at > NOW() - INTERVAL '30 days' ORDER BY recorded_at DESC LIMIT 200`
      );
    } catch (_) {}
    try {
      alerts = await pool.query(
        `SELECT device_id, severity, message FROM alerts ORDER BY created_at DESC LIMIT 100`
      );
    } catch (_) {}

    const systemPrompt = `You are an agentic IoT device health predictor. Estimate failure probability per
device over the next ${horizon_months} months and auto-generate maintenance tickets when probability > 40%.
Return STRICT JSON only.`;

    const userPrompt = `Devices: ${JSON.stringify(devices.rows.slice(0, 30))}
Recent telemetry (sample): ${JSON.stringify(telemetry.rows.slice(0, 60))}
Recent alerts: ${JSON.stringify(alerts.rows.slice(0, 30))}

Return JSON:
{
  "summary": "...",
  "predictions": [
    { "device_id": "string", "failure_probability_pct": 0, "predicted_failure_mode": "string", "evidence": ["..."], "auto_ticket": { "title": "string", "priority": "low|medium|high|critical", "recommended_actions": ["..."] } }
  ],
  "fleet_health_score_0_100": 0,
  "disclaimer": "Predictions heuristic; validate with maintenance engineer."
}`;

    const raw = await aiService.makeRequest([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
    const parsed = parseJSON(raw);

    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS device_health_predictions (
        id SERIAL PRIMARY KEY, user_id INTEGER, payload JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      await pool.query(
        `INSERT INTO device_health_predictions (user_id, payload) VALUES ($1,$2)`,
        [req.user.id, JSON.stringify(parsed)]
      );
    } catch (_) {}

    res.json({ horizon_months, predictions: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recent', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, payload, created_at FROM device_health_predictions ORDER BY created_at DESC LIMIT 30`
    ).catch(() => ({ rows: [] }));
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
