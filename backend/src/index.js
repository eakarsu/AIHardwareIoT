const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const http = require('http');
const winston = require('winston');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = require('./db');
const initDb = require('./initDb');
const aiService = require('./services/openRouterService');

// === Batch 04 Gaps & Frontend Mounts ===
const route_gap_no_automated_rule_tuning_from_historical = require('../routes/gap-no-automated-rule-tuning-from-historical');
const route_gap_no_predictive_bandwidthcost_optimizer_fo = require('../routes/gap-no-predictive-bandwidthcost-optimizer-fo');
const route_gap_no_videoaudio_anomaly_detection_for_av = require('../routes/gap-no-videoaudio-anomaly-detection-for-av');
const route_gap_no_mqtt_broker_integration_only_http = require('../routes/gap-no-mqtt-broker-integration-only-http');
const route_gap_no_ota_firmware_delivery_pipeline_only = require('../routes/gap-no-ota-firmware-delivery-pipeline-only');
const route_gap_no_multi_tenant_fleet_partitioning = require('../routes/gap-no-multi-tenant-fleet-partitioning');
const route_gap_no_audit_log_0_references = require('../routes/gap-no-audit-log-0-references');
const route_gap_no_notification_engine_0_references = require('../routes/gap-no-notification-engine-0-references');
const route_gap_no_webhook_dispatch_for_alerts_to = require('../routes/gap-no-webhook-dispatch-for-alerts-to');
if (!process.env.JWT_SECRET) { console.error('FATAL: JWT_SECRET not set'); process.exit(1); }

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.simple() })],
});

// AI Rate limiter: 20 requests per hour per user/IP
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id ? `user-${req.user.id}` : req.ip,
  handler: (req, res) => res.status(429).json({ error: 'Too many AI requests. Limit: 20 per hour.' }),
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// WebSocket
const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  logger.info('WebSocket client connected');
  ws.on('close', () => wsClients.delete(ws));
});

function broadcast(type, data) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  wsClients.forEach((client) => {
    if (client.readyState === 1) client.send(message);
  });
}

// Simulate telemetry every 10 seconds
setInterval(async () => {
  try {
    const devices = await pool.query("SELECT id, name, type FROM devices WHERE status = 'online' LIMIT 5");
    for (const device of devices.rows) {
      const metrics = ['temperature', 'humidity', 'cpu_usage'];
      const metric = metrics[Math.floor(Math.random() * metrics.length)];
      const units = { temperature: '°C', humidity: '%', cpu_usage: '%' };
      const ranges = { temperature: [18, 35], humidity: [30, 80], cpu_usage: [10, 95] };
      const [min, max] = ranges[metric];
      const value = parseFloat((min + Math.random() * (max - min)).toFixed(2));

      await pool.query(
        'INSERT INTO telemetry (device_id, metric_type, value, unit) VALUES ($1, $2, $3, $4)',
        [device.id, metric, value, units[metric]]
      );

      broadcast('telemetry', { device_id: device.id, device_name: device.name, metric_type: metric, value, unit: units[metric] });

      // Check alert rules
      const rules = await pool.query(
        'SELECT * FROM alert_rules WHERE device_id = $1 AND metric_type = $2 AND active = true',
        [device.id, metric]
      );
      for (const rule of rules.rows) {
        let triggered = false;
        switch (rule.condition) {
          case '>': triggered = value > rule.threshold; break;
          case '<': triggered = value < rule.threshold; break;
          case '>=': triggered = value >= rule.threshold; break;
          case '<=': triggered = value <= rule.threshold; break;
          case '==': triggered = value === rule.threshold; break;
          case '!=': triggered = value !== rule.threshold; break;
        }
        if (triggered) {
          const alertResult = await pool.query(
            'INSERT INTO alerts (device_id, user_id, type, severity, message) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [device.id, rule.user_id, 'threshold_exceeded', rule.severity,
             `${metric} value ${value} ${rule.condition} threshold ${rule.threshold} on ${device.name}`]
          );
          broadcast('alert', alertResult.rows[0]);
        }
      }
    }
  } catch (err) {
    // silent on telemetry simulation errors
  }
}, 10000);

// ============ AUTH ROUTES ============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'All fields required' });
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, role',
      [email, hashed, name]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

app.put('/api/auth/profile', auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3 RETURNING id, email, name, role',
      [name, email, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.put('/api/auth/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, user.rows[0].password);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// ============ DEVICE ROUTES ============

app.get('/api/devices', auth, async (req, res) => {
  try {
    const { type, status, group_name, search, page, limit: lim } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(lim) || 20));
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = 'FROM devices WHERE user_id = $1';
    const params = [req.user.id];
    let idx = 2;

    if (type) { baseQuery += ` AND type = $${idx++}`; params.push(type); }
    if (status) { baseQuery += ` AND status = $${idx++}`; params.push(status); }
    if (group_name) { baseQuery += ` AND group_name = $${idx++}`; params.push(group_name); }
    if (search) { baseQuery += ` AND (name ILIKE $${idx} OR location ILIKE $${idx})`; params.push(`%${search}%`); idx++; }

    const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    const query = `SELECT * ${baseQuery} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    // If no pagination params provided, return array for backwards compat
    if (!page && !lim) {
      return res.json(result.rows);
    }
    res.json({ data: result.rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    logger.error('Get devices error:', err);
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

app.get('/api/devices/stats', auth, async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM devices WHERE user_id = $1', [req.user.id]);
    const byStatus = await pool.query(
      'SELECT status, COUNT(*) FROM devices WHERE user_id = $1 GROUP BY status', [req.user.id]
    );
    const byType = await pool.query(
      'SELECT type, COUNT(*) FROM devices WHERE user_id = $1 GROUP BY type ORDER BY count DESC', [req.user.id]
    );
    const byGroup = await pool.query(
      'SELECT group_name, COUNT(*) FROM devices WHERE user_id = $1 GROUP BY group_name ORDER BY count DESC', [req.user.id]
    );
    const recentAlerts = await pool.query(
      `SELECT a.*, d.name as device_name FROM alerts a JOIN devices d ON a.device_id = d.id
       WHERE a.user_id = $1 AND a.resolved = false ORDER BY a.created_at DESC LIMIT 10`, [req.user.id]
    );
    res.json({
      total: parseInt(total.rows[0].count),
      byStatus: byStatus.rows.reduce((acc, r) => { acc[r.status] = parseInt(r.count); return acc; }, {}),
      byType: byType.rows,
      byGroup: byGroup.rows,
      recentAlerts: recentAlerts.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.get('/api/devices/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM devices WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get device' });
  }
});

app.post('/api/devices', auth, async (req, res) => {
  try {
    const { name, type, status, location, group_name, firmware_version, ip_address, mac_address, metadata } = req.body;
    const result = await pool.query(
      `INSERT INTO devices (user_id, name, type, status, location, group_name, firmware_version, ip_address, mac_address, last_seen, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10) RETURNING *`,
      [req.user.id, name, type, status || 'offline', location, group_name, firmware_version, ip_address, mac_address, JSON.stringify(metadata || {})]
    );
    broadcast('device_added', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create device' });
  }
});

app.put('/api/devices/:id', auth, async (req, res) => {
  try {
    const { name, type, status, location, group_name, firmware_version, ip_address, mac_address, metadata } = req.body;
    const result = await pool.query(
      `UPDATE devices SET name=$1, type=$2, status=$3, location=$4, group_name=$5, firmware_version=$6,
       ip_address=$7, mac_address=$8, metadata=$9, last_seen=NOW() WHERE id=$10 AND user_id=$11 RETURNING *`,
      [name, type, status, location, group_name, firmware_version, ip_address, mac_address, JSON.stringify(metadata || {}), req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update device' });
  }
});

app.delete('/api/devices/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM devices WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Device deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

// ============ TELEMETRY ROUTES ============

app.get('/api/telemetry', auth, async (req, res) => {
  try {
    const { device_id, metric_type, start_date, end_date, limit: lim, page } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(lim) || 100));
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = `FROM telemetry t JOIN devices d ON t.device_id = d.id WHERE d.user_id = $1`;
    const params = [req.user.id];
    let idx = 2;

    if (device_id) { baseQuery += ` AND t.device_id = $${idx++}`; params.push(device_id); }
    if (metric_type) { baseQuery += ` AND t.metric_type = $${idx++}`; params.push(metric_type); }
    if (start_date) { baseQuery += ` AND t.timestamp >= $${idx++}`; params.push(start_date); }
    if (end_date) { baseQuery += ` AND t.timestamp <= $${idx++}`; params.push(end_date); }

    const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    const query = `SELECT t.*, d.name as device_name ${baseQuery} ORDER BY t.timestamp DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    if (!page) {
      return res.json(result.rows);
    }
    res.json({ data: result.rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get telemetry' });
  }
});

app.get('/api/telemetry/device/:deviceId', auth, async (req, res) => {
  try {
    const { metric_type, hours } = req.query;
    const hoursBack = parseInt(hours) || 24;
    let query = `SELECT * FROM telemetry WHERE device_id = $1 AND timestamp > NOW() - interval '${hoursBack} hours'`;
    const params = [req.params.deviceId];

    if (metric_type) { query += ' AND metric_type = $2'; params.push(metric_type); }
    query += ' ORDER BY timestamp ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get device telemetry' });
  }
});

app.get('/api/telemetry/export', auth, async (req, res) => {
  try {
    const { device_id, metric_type, start_date, end_date, format } = req.query;
    let query = `SELECT t.*, d.name as device_name FROM telemetry t JOIN devices d ON t.device_id = d.id WHERE d.user_id = $1`;
    const params = [req.user.id];
    let idx = 2;

    if (device_id) { query += ` AND t.device_id = $${idx++}`; params.push(device_id); }
    if (metric_type) { query += ` AND t.metric_type = $${idx++}`; params.push(metric_type); }
    if (start_date) { query += ` AND t.timestamp >= $${idx++}`; params.push(start_date); }
    if (end_date) { query += ` AND t.timestamp <= $${idx++}`; params.push(end_date); }

    query += ' ORDER BY t.timestamp DESC LIMIT 10000';
    const result = await pool.query(query, params);

    if (format === 'csv') {
      const headers = 'id,device_id,device_name,metric_type,value,unit,timestamp\n';
      const csv = headers + result.rows.map(r =>
        `${r.id},${r.device_id},${r.device_name},${r.metric_type},${r.value},${r.unit},${r.timestamp}`
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=telemetry_export.csv');
      res.send(csv);
    } else {
      res.json(result.rows);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to export telemetry' });
  }
});

// ============ ALERT ROUTES ============

app.get('/api/alerts', auth, async (req, res) => {
  try {
    const { severity, resolved } = req.query;
    let query = `SELECT a.*, d.name as device_name FROM alerts a JOIN devices d ON a.device_id = d.id WHERE a.user_id = $1`;
    const params = [req.user.id];
    let idx = 2;

    if (severity) { query += ` AND a.severity = $${idx++}`; params.push(severity); }
    if (resolved !== undefined) { query += ` AND a.resolved = $${idx++}`; params.push(resolved === 'true'); }

    query += ' ORDER BY a.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

app.put('/api/alerts/:id/resolve', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE alerts SET resolved = true, resolved_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Alert not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// ============ ALERT RULES ============

app.get('/api/alert-rules', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ar.*, d.name as device_name FROM alert_rules ar JOIN devices d ON ar.device_id = d.id WHERE ar.user_id = $1 ORDER BY ar.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get alert rules' });
  }
});

app.post('/api/alert-rules', auth, async (req, res) => {
  try {
    const { device_id, metric_type, condition, threshold, severity } = req.body;
    const result = await pool.query(
      'INSERT INTO alert_rules (user_id, device_id, metric_type, condition, threshold, severity) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, device_id, metric_type, condition, threshold, severity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create alert rule' });
  }
});

app.put('/api/alert-rules/:id', auth, async (req, res) => {
  try {
    const { active } = req.body;
    const result = await pool.query(
      'UPDATE alert_rules SET active = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [active, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update alert rule' });
  }
});

app.delete('/api/alert-rules/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM alert_rules WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete alert rule' });
  }
});

// ============ AI ANALYTICS ============

app.get('/api/ai-analyses', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, d.name as device_name FROM ai_analyses a LEFT JOIN devices d ON a.device_id = d.id
       WHERE a.user_id = $1 ORDER BY a.created_at DESC`, [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get analyses' });
  }
});

app.post('/api/ai-analyses', auth, aiRateLimiter, async (req, res) => {
  try {
    const { device_id, analysis_type } = req.body;
    let result, aiResult, tokensUsed;

    if (analysis_type === 'fleet_analysis') {
      const devices = await pool.query('SELECT * FROM devices WHERE user_id = $1', [req.user.id]);
      const { content, tokens } = await aiService.fleetAnalysisWithTokens(devices.rows);
      aiResult = content;
      tokensUsed = tokens;
    } else if (analysis_type === 'energy_optimization') {
      const devices = await pool.query('SELECT * FROM devices WHERE user_id = $1', [req.user.id]);
      const telemetry = await pool.query(
        `SELECT t.*, d.name as device_name FROM telemetry t JOIN devices d ON t.device_id = d.id
         WHERE d.user_id = $1 AND t.metric_type IN ('power', 'battery_level') ORDER BY t.timestamp DESC LIMIT 50`,
        [req.user.id]
      );
      const { content, tokens } = await aiService.energyOptimizationWithTokens(devices.rows, telemetry.rows);
      aiResult = content;
      tokensUsed = tokens;
    } else {
      const device = await pool.query('SELECT * FROM devices WHERE id = $1 AND user_id = $2', [device_id, req.user.id]);
      if (device.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
      const telemetry = await pool.query(
        'SELECT * FROM telemetry WHERE device_id = $1 ORDER BY timestamp DESC LIMIT 20', [device_id]
      );

      let analysisResult;
      if (analysis_type === 'predictive_maintenance') {
        analysisResult = await aiService.predictiveMaintenanceWithTokens(device.rows[0], telemetry.rows);
      } else if (analysis_type === 'anomaly_detection') {
        analysisResult = await aiService.anomalyDetectionWithTokens(telemetry.rows, device.rows[0].name);
      } else {
        analysisResult = await aiService.analyzeDeviceWithTokens(device.rows[0], telemetry.rows);
      }
      aiResult = analysisResult.content;
      tokensUsed = analysisResult.tokens;
    }

    // Store parsed result if JSON, else raw text
    let storedResult = aiResult;
    if (typeof aiResult === 'string') {
      try { storedResult = JSON.stringify(JSON.parse(aiResult)); } catch (e) { /* keep raw */ }
    }

    result = await pool.query(
      `INSERT INTO ai_analyses (user_id, device_id, analysis_type, prompt, result, model, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, device_id || null, analysis_type, `Run ${analysis_type}`, storedResult,
       process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022', tokensUsed || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('AI analysis error:', err);
    res.status(500).json({ error: 'Failed to run analysis' });
  }
});

// ============ FIRMWARE ROUTES ============

app.get('/api/firmware', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM firmware ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get firmware' });
  }
});

app.get('/api/firmware-updates', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fu.*, d.name as device_name, f.version as firmware_version, f.device_type
       FROM firmware_updates fu
       JOIN devices d ON fu.device_id = d.id
       JOIN firmware f ON fu.firmware_id = f.id
       WHERE d.user_id = $1
       ORDER BY fu.started_at DESC`, [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get firmware updates' });
  }
});

app.post('/api/firmware-updates', auth, async (req, res) => {
  try {
    const { device_id, firmware_id } = req.body;
    const result = await pool.query(
      'INSERT INTO firmware_updates (device_id, firmware_id, status, progress) VALUES ($1, $2, $3, $4) RETURNING *',
      [device_id, firmware_id, 'pending', 0]
    );

    // Simulate progress
    const updateId = result.rows[0].id;
    const stages = [
      { status: 'downloading', progress: 25 },
      { status: 'downloading', progress: 50 },
      { status: 'installing', progress: 75 },
      { status: 'completed', progress: 100 },
    ];
    stages.forEach((stage, i) => {
      setTimeout(async () => {
        try {
          await pool.query(
            'UPDATE firmware_updates SET status = $1, progress = $2, completed_at = $3 WHERE id = $4',
            [stage.status, stage.progress, stage.status === 'completed' ? new Date() : null, updateId]
          );
          broadcast('firmware_update', { id: updateId, ...stage });
        } catch (e) { /* silent */ }
      }, (i + 1) * 3000);
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to start firmware update' });
  }
});

// ============ EDGE INFERENCE ROUTES ============

app.get('/api/edge-inferences', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ei.*, d.name as device_name FROM edge_inferences ei
       JOIN devices d ON ei.device_id = d.id WHERE d.user_id = $1
       ORDER BY ei.created_at DESC`, [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get edge inferences' });
  }
});

app.post('/api/edge-inferences', auth, async (req, res) => {
  try {
    const { device_id, model_name, input_data, result: inferenceResult, latency_ms, confidence } = req.body;
    if (!device_id || !model_name) return res.status(400).json({ error: 'device_id and model_name are required' });

    const device = await pool.query('SELECT id FROM devices WHERE id = $1 AND user_id = $2', [device_id, req.user.id]);
    if (device.rows.length === 0) return res.status(404).json({ error: 'Device not found' });

    const dbResult = await pool.query(
      `INSERT INTO edge_inferences (device_id, model_name, input_data, result, latency_ms, confidence)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [device_id, model_name, JSON.stringify(input_data || {}), JSON.stringify(inferenceResult || {}),
       latency_ms || null, confidence || null]
    );

    const withDevice = await pool.query(
      `SELECT ei.*, d.name as device_name FROM edge_inferences ei
       JOIN devices d ON ei.device_id = d.id WHERE ei.id = $1`, [dbResult.rows[0].id]
    );
    res.status(201).json(withDevice.rows[0]);
  } catch (err) {
    logger.error('Edge inference create error:', err);
    res.status(500).json({ error: 'Failed to create edge inference' });
  }
});

app.get('/api/edge-inferences/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ei.*, d.name as device_name FROM edge_inferences ei
       JOIN devices d ON ei.device_id = d.id WHERE ei.id = $1 AND d.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Edge inference not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get edge inference' });
  }
});

// ============ AI FLEET QUERY ============

app.post('/api/ai/fleet-query', auth, aiRateLimiter, async (req, res) => {
  try {
    const { query: naturalQuery } = req.body;
    if (!naturalQuery) return res.status(400).json({ error: 'query is required' });

    const systemPrompt = `You are a SQL generator for an IoT platform. Convert natural language queries into PostgreSQL SELECT statements.
Only use these tables: devices, telemetry, alerts.
devices columns: id, user_id, name, type, status, location, group_name, firmware_version, ip_address, mac_address, last_seen, metadata, created_at
telemetry columns: id, device_id, metric_type, value, unit, timestamp
alerts columns: id, device_id, user_id, type, severity, message, resolved, created_at, resolved_at
Always filter devices by user_id = :user_id placeholder (use $1 parameter).
Return ONLY a JSON object: {"sql": "SELECT ...", "params": ["value1"]}
Never use INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE. Only SELECT.`;

    const userPrompt = `Convert to SQL: "${naturalQuery}"\nUser ID for filtering: ${req.user.id}`;

    const sqlResponse = await aiService.makeRequest([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    let generated_sql, sqlParams;
    try {
      const parsed = typeof sqlResponse === 'string' ? JSON.parse(sqlResponse) : sqlResponse;
      generated_sql = parsed.sql;
      sqlParams = parsed.params || [req.user.id];
    } catch (e) {
      return res.status(500).json({ error: 'AI failed to generate valid SQL' });
    }

    // Security: only allow SELECT, only allowed tables
    const upperSql = generated_sql.toUpperCase();
    if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/.test(upperSql)) {
      return res.status(400).json({ error: 'Only SELECT queries are allowed' });
    }
    if (!/^SELECT\b/.test(upperSql.trim())) {
      return res.status(400).json({ error: 'Only SELECT queries are allowed' });
    }

    const results = await pool.query(generated_sql, sqlParams);
    res.json({ results: results.rows, generated_sql, count: results.rowCount });
  } catch (err) {
    logger.error('Fleet query error:', err);
    res.status(500).json({ error: 'Fleet query failed', message: err.message });
  }
});

// ============ DASHBOARD STATS ============

app.get('/api/dashboard/stats', auth, async (req, res) => {
  try {
    const deviceCount = await pool.query('SELECT COUNT(*) FROM devices WHERE user_id = $1', [req.user.id]);
    const onlineCount = await pool.query("SELECT COUNT(*) FROM devices WHERE user_id = $1 AND status = 'online'", [req.user.id]);
    const alertCount = await pool.query('SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND resolved = false', [req.user.id]);
    const telemetryCount = await pool.query(
      `SELECT COUNT(*) FROM telemetry t JOIN devices d ON t.device_id = d.id WHERE d.user_id = $1 AND t.timestamp > NOW() - interval '24 hours'`,
      [req.user.id]
    );

    const recentTelemetry = await pool.query(
      `SELECT t.metric_type, AVG(t.value) as avg_value, MIN(t.value) as min_value, MAX(t.value) as max_value
       FROM telemetry t JOIN devices d ON t.device_id = d.id
       WHERE d.user_id = $1 AND t.timestamp > NOW() - interval '24 hours'
       GROUP BY t.metric_type ORDER BY t.metric_type`,
      [req.user.id]
    );

    const devicesByGroup = await pool.query(
      'SELECT group_name, COUNT(*) as count FROM devices WHERE user_id = $1 GROUP BY group_name ORDER BY count DESC',
      [req.user.id]
    );

    res.json({
      totalDevices: parseInt(deviceCount.rows[0].count),
      onlineDevices: parseInt(onlineCount.rows[0].count),
      activeAlerts: parseInt(alertCount.rows[0].count),
      telemetryToday: parseInt(telemetryCount.rows[0].count),
      metricAverages: recentTelemetry.rows,
      devicesByGroup: devicesByGroup.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// ============ SMART HOME AGENT ROUTES ============

app.post('/api/smart-agents/optimize-energy', auth, aiRateLimiter, async (req, res) => {
  try {
    const { devices, monthly_bill, preferences } = req.body;
    const result = await aiService.makeRequest([{ role: 'user', content: `Optimize home energy usage. Devices: ${JSON.stringify(devices)}. Monthly bill: $${monthly_bill || 150}. Preferences: ${preferences || 'comfort and savings balance'}. Return JSON with: savings_potential_percent, monthly_savings_dollars, device_recommendations (array with device, current_usage, recommended_change, savings), schedule_optimization, peak_hour_strategy, total_annual_savings.` }]);
    res.json(typeof result === 'string' ? { analysis: result } : result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/smart-agents/learn-habits', auth, aiRateLimiter, async (req, res) => {
  try {
    const { routine_description, household_size, work_schedule } = req.body;
    const result = await aiService.makeRequest([{ role: 'user', content: `Learn household habits and suggest automations. Routine: ${routine_description}. Household size: ${household_size || 2}. Work schedule: ${work_schedule || '9-5'}. Return JSON with: detected_patterns (array), suggested_automations (array with name, trigger, action, devices, benefit), comfort_score, efficiency_improvements, smart_scenes (array with name, time, devices_config).` }]);
    res.json(typeof result === 'string' ? { analysis: result } : result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/smart-agents/security-check', auth, aiRateLimiter, async (req, res) => {
  try {
    const { devices, time_of_day, occupancy } = req.body;
    const result = await aiService.makeRequest([{ role: 'user', content: `Perform smart home security assessment. Devices: ${JSON.stringify(devices)}. Time: ${time_of_day || 'evening'}. Occupancy: ${occupancy || 'home'}. Return JSON with: security_score (0-100), vulnerabilities (array), recommendations (array with priority, action, devices), emergency_protocols, camera_coverage_assessment, lock_status_review.` }]);
    res.json(typeof result === 'string' ? { analysis: result } : result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ DIGITAL TWIN / DEVICE SHADOW ROUTES ============

// GET device shadow (desired + reported state)
app.get('/api/devices/:id/shadow', auth, async (req, res) => {
  try {
    // Ensure shadow columns exist
    await pool.query(`
      ALTER TABLE devices ADD COLUMN IF NOT EXISTS desired_state JSONB DEFAULT '{}';
      ALTER TABLE devices ADD COLUMN IF NOT EXISTS reported_state JSONB DEFAULT '{}';
    `).catch(() => {});
    const result = await pool.query(
      'SELECT id, name, type, status, desired_state, reported_state, metadata, updated_at FROM devices WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const device = result.rows[0];
    const desired = device.desired_state || {};
    const reported = device.reported_state || {};
    // Compute delta
    const delta = {};
    for (const key of new Set([...Object.keys(desired), ...Object.keys(reported)])) {
      if (JSON.stringify(desired[key]) !== JSON.stringify(reported[key])) {
        delta[key] = { desired: desired[key], reported: reported[key] };
      }
    }
    res.json({ device_id: device.id, name: device.name, desired_state: desired, reported_state: reported, delta, in_sync: Object.keys(delta).length === 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update desired state (config push)
app.put('/api/devices/:id/shadow/desired', auth, async (req, res) => {
  try {
    await pool.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS desired_state JSONB DEFAULT '{}'`).catch(() => {});
    const { state } = req.body;
    if (!state || typeof state !== 'object') return res.status(400).json({ error: 'state object required' });
    const result = await pool.query(
      "UPDATE devices SET desired_state = desired_state || $1::jsonb, metadata = metadata || jsonb_build_object('last_config_push', NOW()::text) WHERE id = $2 RETURNING id, name, desired_state",
      [JSON.stringify(state), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    broadcast('shadow_update', { device_id: parseInt(req.params.id), type: 'desired', state });
    res.json({ message: 'Desired state updated', device: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update reported state (device reports back)
app.put('/api/devices/:id/shadow/reported', auth, async (req, res) => {
  try {
    await pool.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS reported_state JSONB DEFAULT '{}'`).catch(() => {});
    const { state } = req.body;
    if (!state || typeof state !== 'object') return res.status(400).json({ error: 'state object required' });
    const result = await pool.query(
      "UPDATE devices SET reported_state = reported_state || $1::jsonb, last_seen = NOW() WHERE id = $2 RETURNING id, name, desired_state, reported_state",
      [JSON.stringify(state), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    broadcast('shadow_update', { device_id: parseInt(req.params.id), type: 'reported', state });
    res.json({ message: 'Reported state updated', device: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST AI drift analysis — AI explains config drift and recommends remediation
app.post('/api/devices/:id/shadow/analyze-drift', auth, aiRateLimiter, async (req, res) => {
  try {
    await pool.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS desired_state JSONB DEFAULT '{}'; ALTER TABLE devices ADD COLUMN IF NOT EXISTS reported_state JSONB DEFAULT '{}'`).catch(() => {});
    const device = await pool.query('SELECT * FROM devices WHERE id = $1', [req.params.id]);
    if (device.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const d = device.rows[0];
    const desired = d.desired_state || {};
    const reported = d.reported_state || {};
    const result = await aiService.makeRequest([
      { role: 'system', content: 'You are an IoT device shadow analyst. Analyze configuration drift between desired and reported state. Return JSON with: drift_severity (none/low/medium/high), drifted_fields (array with field, desired, reported, risk), root_cause_hypothesis (string), remediation_steps (array), auto_recoverable (boolean).' },
      { role: 'user', content: `Device: ${d.name} (${d.type}), Status: ${d.status}\nDesired: ${JSON.stringify(desired)}\nReported: ${JSON.stringify(reported)}\nAnalyze drift and return JSON only.` }
    ]);
    // Save to ai_analyses
    await pool.query(
      'INSERT INTO ai_analyses (user_id, device_id, analysis_type, result, model) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, d.id, 'shadow-drift', typeof result === 'string' ? result : JSON.stringify(result), aiService.model]
    ).catch(() => {});
    res.json({ device_id: d.id, drift_analysis: result, desired_state: desired, reported_state: reported });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET fleet shadow summary — all devices with drift status
app.get('/api/fleet/shadow-summary', auth, async (req, res) => {
  try {
    await pool.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS desired_state JSONB DEFAULT '{}'; ALTER TABLE devices ADD COLUMN IF NOT EXISTS reported_state JSONB DEFAULT '{}'`).catch(() => {});
    const result = await pool.query("SELECT id, name, type, status, desired_state, reported_state FROM devices WHERE user_id = $1 ORDER BY name", [req.user.id]);
    const devices = result.rows.map(d => {
      const desired = d.desired_state || {};
      const reported = d.reported_state || {};
      const deltaKeys = [...new Set([...Object.keys(desired), ...Object.keys(reported)])].filter(k => JSON.stringify(desired[k]) !== JSON.stringify(reported[k]));
      return { ...d, drift_count: deltaKeys.length, in_sync: deltaKeys.length === 0 };
    });
    res.json({ devices, total: devices.length, in_sync: devices.filter(d => d.in_sync).length, drifted: devices.filter(d => !d.in_sync).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ AI: Cluster / Firmware Recommendation / Edge Inference Deployment ============

app.post('/api/ai/device-cluster-analysis', auth, aiRateLimiter, async (req, res) => {
  try {
    const devicesRes = await pool.query('SELECT * FROM devices WHERE user_id = $1', [req.user.id]);
    const devices = devicesRes.rows;
    if (devices.length === 0) return res.status(400).json({ error: 'No devices to cluster' });
    const telemetryRes = await pool.query(
      `SELECT t.* FROM telemetry t JOIN devices d ON t.device_id = d.id
       WHERE d.user_id = $1 ORDER BY t.timestamp DESC LIMIT 200`,
      [req.user.id]
    );
    const { content, tokens } = await aiService.deviceClusterAnalysisWithTokens(devices, telemetryRes.rows);
    let stored = content;
    try { stored = JSON.stringify(JSON.parse(content)); } catch (e) { /* keep raw */ }
    const result = await pool.query(
      `INSERT INTO ai_analyses (user_id, device_id, analysis_type, prompt, result, model, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, null, 'device_cluster_analysis', 'Cluster fleet by behavior', stored,
       process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022', tokens || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Cluster analysis error:', err);
    res.status(500).json({ error: 'Failed to run cluster analysis' });
  }
});

app.post('/api/ai/firmware-recommendation', auth, aiRateLimiter, async (req, res) => {
  try {
    const { device_id, latest_firmware } = req.body;
    if (!device_id) return res.status(400).json({ error: 'device_id required' });
    const deviceRes = await pool.query('SELECT * FROM devices WHERE id = $1 AND user_id = $2', [device_id, req.user.id]);
    if (deviceRes.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const telemetryRes = await pool.query(
      'SELECT * FROM telemetry WHERE device_id = $1 ORDER BY timestamp DESC LIMIT 40', [device_id]
    );

    let firmwareSpec = latest_firmware || null;
    if (!firmwareSpec) {
      try {
        const fwRes = await pool.query(
          `SELECT * FROM firmware WHERE device_type = $1 ORDER BY id DESC LIMIT 1`,
          [deviceRes.rows[0].type]
        );
        if (fwRes.rows.length > 0) firmwareSpec = { version: fwRes.rows[0].version, notes: fwRes.rows[0].notes };
      } catch (e) { /* firmware table may differ */ }
    }

    const { content, tokens } = await aiService.firmwareRecommendationWithTokens(deviceRes.rows[0], telemetryRes.rows, firmwareSpec);
    let stored = content;
    try { stored = JSON.stringify(JSON.parse(content)); } catch (e) { /* keep raw */ }
    const result = await pool.query(
      `INSERT INTO ai_analyses (user_id, device_id, analysis_type, prompt, result, model, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, device_id, 'firmware_recommendation', 'Firmware advisory', stored,
       process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022', tokens || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Firmware recommendation error:', err);
    res.status(500).json({ error: 'Failed to run firmware recommendation' });
  }
});

app.post('/api/ai/edge-inference-deployment', auth, aiRateLimiter, async (req, res) => {
  try {
    const { device_id, model } = req.body;
    if (!device_id || !model || !model.name) {
      return res.status(400).json({ error: 'device_id and model.name required' });
    }
    const deviceRes = await pool.query('SELECT * FROM devices WHERE id = $1 AND user_id = $2', [device_id, req.user.id]);
    if (deviceRes.rows.length === 0) return res.status(404).json({ error: 'Device not found' });

    const { content, tokens } = await aiService.edgeInferenceDeploymentWithTokens(deviceRes.rows[0], model);
    let stored = content;
    try { stored = JSON.stringify(JSON.parse(content)); } catch (e) { /* keep raw */ }
    const result = await pool.query(
      `INSERT INTO ai_analyses (user_id, device_id, analysis_type, prompt, result, model, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, device_id, 'edge_inference_deployment', `Deploy ${model.name}`, stored,
       process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022', tokens || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Edge inference deployment error:', err);
    res.status(500).json({ error: 'Failed to plan edge inference deployment' });
  }
});

// ---------- Apply pass 5 backlog: 3 advisory AI endpoints ---------- //

app.post('/api/ai/smart-agent-orchestration', auth, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    const { goal, device_ids } = req.body || {};
    let devicesQuery = 'SELECT * FROM devices WHERE user_id = $1';
    const params = [req.user.id];
    if (Array.isArray(device_ids) && device_ids.length) {
      devicesQuery += ' AND id = ANY($2::int[])';
      params.push(device_ids);
    }
    const devicesRes = await pool.query(devicesQuery, params);
    if (devicesRes.rows.length === 0) return res.status(400).json({ error: 'No devices for orchestration' });
    let automations = [];
    try {
      const r = await pool.query('SELECT * FROM automations WHERE user_id = $1 LIMIT 100', [req.user.id]);
      automations = r.rows;
    } catch (e) { /* table may not exist */ }
    const { content, tokens } = await aiService.smartAgentOrchestrationWithTokens(devicesRes.rows, automations, goal);
    let stored = content;
    try { stored = JSON.stringify(JSON.parse(content)); } catch (e) { /* keep raw */ }
    const result = await pool.query(
      `INSERT INTO ai_analyses (user_id, device_id, analysis_type, prompt, result, model, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, null, 'smart_agent_orchestration', goal || 'fleet orchestration', stored,
       process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022', tokens || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Smart agent orchestration error:', err);
    res.status(500).json({ error: 'Failed to plan orchestration' });
  }
});

app.post('/api/ai/health-monitor-summary', auth, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    const devicesRes = await pool.query('SELECT * FROM devices WHERE user_id = $1', [req.user.id]);
    if (devicesRes.rows.length === 0) return res.status(400).json({ error: 'No devices to summarize' });
    let alerts = [];
    try {
      const r = await pool.query(
        `SELECT a.* FROM alerts a JOIN devices d ON a.device_id = d.id WHERE d.user_id = $1 AND (a.resolved_at IS NULL OR a.resolved IS NOT TRUE) ORDER BY a.created_at DESC LIMIT 100`,
        [req.user.id]
      );
      alerts = r.rows;
    } catch (e) { /* table shape may differ */ }
    const telemetryRes = await pool.query(
      `SELECT t.* FROM telemetry t JOIN devices d ON t.device_id = d.id WHERE d.user_id = $1 ORDER BY t.timestamp DESC LIMIT 200`,
      [req.user.id]
    );
    const { content, tokens } = await aiService.healthMonitorSummaryWithTokens(devicesRes.rows, alerts, telemetryRes.rows);
    let stored = content;
    try { stored = JSON.stringify(JSON.parse(content)); } catch (e) { /* keep raw */ }
    const result = await pool.query(
      `INSERT INTO ai_analyses (user_id, device_id, analysis_type, prompt, result, model, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, null, 'health_monitor_summary', 'Fleet health summary', stored,
       process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022', tokens || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Health monitor summary error:', err);
    res.status(500).json({ error: 'Failed to summarize fleet health' });
  }
});

app.post('/api/ai/energy-efficiency-advisor', auth, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    const { tariff } = req.body || {};
    const devicesRes = await pool.query('SELECT * FROM devices WHERE user_id = $1', [req.user.id]);
    if (devicesRes.rows.length === 0) return res.status(400).json({ error: 'No devices to advise on' });
    const telemetryRes = await pool.query(
      `SELECT t.* FROM telemetry t JOIN devices d ON t.device_id = d.id WHERE d.user_id = $1 ORDER BY t.timestamp DESC LIMIT 250`,
      [req.user.id]
    );
    const { content, tokens } = await aiService.energyEfficiencyAdvisorWithTokens(devicesRes.rows, telemetryRes.rows, tariff || null);
    let stored = content;
    try { stored = JSON.stringify(JSON.parse(content)); } catch (e) { /* keep raw */ }
    const result = await pool.query(
      `INSERT INTO ai_analyses (user_id, device_id, analysis_type, prompt, result, model, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, null, 'energy_efficiency_advisor', 'Energy efficiency advisor', stored,
       process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022', tokens || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Energy efficiency advisor error:', err);
    res.status(500).json({ error: 'Failed to advise on energy efficiency' });
  }
});

app.use('/api/agentic-device-health', require('./routes/agenticDeviceHealth'));
app.use('/api/federated-learning', require('./routes/federatedLearning'));

// Initialize and start
async function start() {
  try {
    await initDb();
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();


app.use('/api/gap-no-automated-rule-tuning-from-historical', route_gap_no_automated_rule_tuning_from_historical);
app.use('/api/gap-no-predictive-bandwidthcost-optimizer-fo', route_gap_no_predictive_bandwidthcost_optimizer_fo);
app.use('/api/gap-no-videoaudio-anomaly-detection-for-av', route_gap_no_videoaudio_anomaly_detection_for_av);
app.use('/api/gap-no-mqtt-broker-integration-only-http', route_gap_no_mqtt_broker_integration_only_http);
app.use('/api/gap-no-ota-firmware-delivery-pipeline-only', route_gap_no_ota_firmware_delivery_pipeline_only);
app.use('/api/gap-no-multi-tenant-fleet-partitioning', route_gap_no_multi_tenant_fleet_partitioning);
app.use('/api/gap-no-audit-log-0-references', route_gap_no_audit_log_0_references);
app.use('/api/gap-no-notification-engine-0-references', route_gap_no_notification_engine_0_references);
app.use('/api/gap-no-webhook-dispatch-for-alerts-to', route_gap_no_webhook_dispatch_for_alerts_to);

// === Custom Views (mounted BEFORE 404 handler) ===
app.use('/api/custom-views', require('../routes/customViews'));

// 404 fallback for unmatched /api routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});
