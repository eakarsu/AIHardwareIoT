const express = require('express');
const cors = require('cors');
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

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'iot-platform-secret-key';

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.simple() })],
});

// Middleware
app.use(cors());
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
    const { type, status, group_name, search } = req.query;
    let query = 'SELECT * FROM devices WHERE user_id = $1';
    const params = [req.user.id];
    let idx = 2;

    if (type) { query += ` AND type = $${idx++}`; params.push(type); }
    if (status) { query += ` AND status = $${idx++}`; params.push(status); }
    if (group_name) { query += ` AND group_name = $${idx++}`; params.push(group_name); }
    if (search) { query += ` AND (name ILIKE $${idx} OR location ILIKE $${idx})`; params.push(`%${search}%`); idx++; }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
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
    const { device_id, metric_type, start_date, end_date, limit: lim } = req.query;
    let query = `SELECT t.*, d.name as device_name FROM telemetry t JOIN devices d ON t.device_id = d.id WHERE d.user_id = $1`;
    const params = [req.user.id];
    let idx = 2;

    if (device_id) { query += ` AND t.device_id = $${idx++}`; params.push(device_id); }
    if (metric_type) { query += ` AND t.metric_type = $${idx++}`; params.push(metric_type); }
    if (start_date) { query += ` AND t.timestamp >= $${idx++}`; params.push(start_date); }
    if (end_date) { query += ` AND t.timestamp <= $${idx++}`; params.push(end_date); }

    query += ' ORDER BY t.timestamp DESC';
    query += ` LIMIT $${idx++}`;
    params.push(parseInt(lim) || 100);

    const result = await pool.query(query, params);
    res.json(result.rows);
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

app.post('/api/ai-analyses', auth, async (req, res) => {
  try {
    const { device_id, analysis_type } = req.body;
    let result, aiResult;

    if (analysis_type === 'fleet_analysis') {
      const devices = await pool.query('SELECT * FROM devices WHERE user_id = $1', [req.user.id]);
      aiResult = await aiService.fleetAnalysis(devices.rows);
    } else if (analysis_type === 'energy_optimization') {
      const devices = await pool.query('SELECT * FROM devices WHERE user_id = $1', [req.user.id]);
      const telemetry = await pool.query(
        `SELECT t.*, d.name as device_name FROM telemetry t JOIN devices d ON t.device_id = d.id
         WHERE d.user_id = $1 AND t.metric_type IN ('power', 'battery_level') ORDER BY t.timestamp DESC LIMIT 50`,
        [req.user.id]
      );
      aiResult = await aiService.energyOptimization(devices.rows, telemetry.rows);
    } else {
      const device = await pool.query('SELECT * FROM devices WHERE id = $1 AND user_id = $2', [device_id, req.user.id]);
      if (device.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
      const telemetry = await pool.query(
        'SELECT * FROM telemetry WHERE device_id = $1 ORDER BY timestamp DESC LIMIT 20', [device_id]
      );

      if (analysis_type === 'predictive_maintenance') {
        aiResult = await aiService.predictiveMaintenance(device.rows[0], telemetry.rows);
      } else if (analysis_type === 'anomaly_detection') {
        aiResult = await aiService.anomalyDetection(telemetry.rows, device.rows[0].name);
      } else {
        aiResult = await aiService.analyzeDevice(device.rows[0], telemetry.rows);
      }
    }

    result = await pool.query(
      `INSERT INTO ai_analyses (user_id, device_id, analysis_type, prompt, result, model, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, device_id || null, analysis_type, `Run ${analysis_type}`, aiResult, process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5', Math.floor(Math.random() * 1000) + 500]
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

app.post('/api/smart-agents/optimize-energy', auth, async (req, res) => {
  try {
    const { devices, monthly_bill, preferences } = req.body;
    const result = await aiService.makeRequest([{ role: 'user', content: `Optimize home energy usage. Devices: ${JSON.stringify(devices)}. Monthly bill: $${monthly_bill || 150}. Preferences: ${preferences || 'comfort and savings balance'}. Return JSON with: savings_potential_percent, monthly_savings_dollars, device_recommendations (array with device, current_usage, recommended_change, savings), schedule_optimization, peak_hour_strategy, total_annual_savings.` }]);
    res.json(typeof result === 'string' ? { analysis: result } : result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/smart-agents/learn-habits', auth, async (req, res) => {
  try {
    const { routine_description, household_size, work_schedule } = req.body;
    const result = await aiService.makeRequest([{ role: 'user', content: `Learn household habits and suggest automations. Routine: ${routine_description}. Household size: ${household_size || 2}. Work schedule: ${work_schedule || '9-5'}. Return JSON with: detected_patterns (array), suggested_automations (array with name, trigger, action, devices, benefit), comfort_score, efficiency_improvements, smart_scenes (array with name, time, devices_config).` }]);
    res.json(typeof result === 'string' ? { analysis: result } : result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/smart-agents/security-check', auth, async (req, res) => {
  try {
    const { devices, time_of_day, occupancy } = req.body;
    const result = await aiService.makeRequest([{ role: 'user', content: `Perform smart home security assessment. Devices: ${JSON.stringify(devices)}. Time: ${time_of_day || 'evening'}. Occupancy: ${occupancy || 'home'}. Return JSON with: security_score (0-100), vulnerabilities (array), recommendations (array with priority, action, devices), emergency_protocols, camera_coverage_assessment, lock_status_review.` }]);
    res.json(typeof result === 'string' ? { analysis: result } : result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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
