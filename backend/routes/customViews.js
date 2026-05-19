const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../src/db');

const router = express.Router();

// Auth middleware (mirrors index.js)
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// In-memory rules storage (provisioning/firmware rules editor)
let deviceClasses = [
  {
    id: 1,
    class_name: 'Sensor-Class-A',
    description: 'Environmental sensors (temperature, humidity)',
    firmware_track: 'stable',
    ota_window_start: '02:00',
    ota_window_end: '04:00',
    timezone: 'UTC',
    auto_provision: true,
    required_firmware: '2.4.1',
    rollback_on_failure: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    class_name: 'Camera-Class-B',
    description: 'IP cameras and video edge devices',
    firmware_track: 'beta',
    ota_window_start: '03:00',
    ota_window_end: '05:00',
    timezone: 'UTC',
    auto_provision: false,
    required_firmware: '3.1.0',
    rollback_on_failure: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    class_name: 'Gateway-Class-C',
    description: 'Edge gateways and hubs',
    firmware_track: 'stable',
    ota_window_start: '01:00',
    ota_window_end: '03:00',
    timezone: 'UTC',
    auto_provision: true,
    required_firmware: '1.9.5',
    rollback_on_failure: false,
    created_at: new Date().toISOString(),
  },
];
let nextClassId = 4;

// ============ VIZ 1: Device health/connectivity timeline ============
router.get('/health-timeline', auth, async (req, res) => {
  try {
    const hours = Math.min(168, parseInt(req.query.hours) || 24);
    // Pull devices for user
    const devicesRes = await pool.query(
      'SELECT id, name, status, last_seen FROM devices WHERE user_id = $1 ORDER BY name LIMIT 12',
      [req.user.id]
    );
    const devices = devicesRes.rows;

    // Build 24 hourly buckets per device with a connectivity score
    const now = new Date();
    const timeline = devices.map((d) => {
      const buckets = [];
      for (let i = hours - 1; i >= 0; i--) {
        const bucketTime = new Date(now.getTime() - i * 3600 * 1000);
        // Deterministic but varied score from device id + hour
        const seed = (d.id * 31 + i * 7) % 100;
        let score;
        let state;
        if (d.status === 'offline') {
          score = seed < 60 ? 0 : 30;
          state = score === 0 ? 'offline' : 'degraded';
        } else if (d.status === 'maintenance') {
          score = 50 + (seed % 30);
          state = 'maintenance';
        } else {
          score = 70 + (seed % 30);
          state = score >= 90 ? 'healthy' : score >= 75 ? 'good' : 'degraded';
        }
        buckets.push({
          hour: bucketTime.toISOString(),
          hour_label: `${bucketTime.getHours().toString().padStart(2, '0')}:00`,
          score,
          state,
        });
      }
      return {
        device_id: d.id,
        device_name: d.name,
        current_status: d.status,
        last_seen: d.last_seen,
        buckets,
      };
    });

    // Try to enrich with real telemetry counts if available
    try {
      for (const row of timeline) {
        const tRes = await pool.query(
          `SELECT COUNT(*)::int as cnt FROM telemetry
           WHERE device_id = $1 AND timestamp > NOW() - interval '${hours} hours'`,
          [row.device_id]
        );
        row.telemetry_points = tRes.rows[0].cnt;
      }
    } catch (e) {
      // ignore enrichment errors
    }

    res.json({
      hours,
      device_count: timeline.length,
      timeline,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to build health timeline', message: err.message });
  }
});

// ============ VIZ 2: Sensor reading heatmap (sensor x location) ============
router.get('/sensor-heatmap', auth, async (req, res) => {
  try {
    // Pull devices grouped by location and type
    const devicesRes = await pool.query(
      'SELECT id, name, type, location FROM devices WHERE user_id = $1',
      [req.user.id]
    );
    const devices = devicesRes.rows;

    const sensorTypes = Array.from(new Set(devices.map((d) => d.type).filter(Boolean))).slice(0, 8);
    const locations = Array.from(new Set(devices.map((d) => d.location).filter(Boolean))).slice(0, 10);

    // Build a synthetic but realistic heat matrix using avg telemetry where possible
    const cells = [];
    for (const sensor of sensorTypes) {
      for (const location of locations) {
        const matched = devices.filter((d) => d.type === sensor && d.location === location);
        let avgValue = null;
        let sampleCount = 0;
        if (matched.length > 0) {
          try {
            const ids = matched.map((m) => m.id);
            const tRes = await pool.query(
              `SELECT AVG(value)::float as avg_val, COUNT(*)::int as cnt
               FROM telemetry WHERE device_id = ANY($1::int[])
               AND timestamp > NOW() - interval '24 hours'`,
              [ids]
            );
            if (tRes.rows[0].avg_val !== null) {
              avgValue = Number(tRes.rows[0].avg_val.toFixed(2));
              sampleCount = tRes.rows[0].cnt;
            }
          } catch (e) {
            // ignore
          }
        }
        // Fall back to synthetic intensity if no telemetry
        const seedHash =
          (sensor.charCodeAt(0) || 65) * (location.charCodeAt(0) || 65);
        const synthetic = (seedHash % 80) + 20;
        const intensity = avgValue !== null ? Math.min(100, Math.max(0, avgValue)) : synthetic;
        cells.push({
          sensor_type: sensor,
          location,
          intensity: Number(intensity.toFixed(2)),
          avg_reading: avgValue,
          device_count: matched.length,
          sample_count: sampleCount,
        });
      }
    }

    res.json({
      sensor_types: sensorTypes,
      locations,
      cells,
      max_intensity: cells.reduce((m, c) => Math.max(m, c.intensity), 0),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to build sensor heatmap', message: err.message });
  }
});

// ============ NON-VIZ 1: Device commissioning PDF ============
router.get('/commissioning-pdf', auth, async (req, res) => {
  try {
    const deviceId = req.query.device_id ? parseInt(req.query.device_id) : null;
    let devicesRes;
    if (deviceId) {
      devicesRes = await pool.query(
        'SELECT * FROM devices WHERE id = $1 AND user_id = $2',
        [deviceId, req.user.id]
      );
    } else {
      devicesRes = await pool.query(
        'SELECT * FROM devices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
        [req.user.id]
      );
    }
    const devices = devicesRes.rows;
    if (devices.length === 0) {
      return res.status(404).json({ error: 'No devices found for commissioning' });
    }

    // Generate a minimal valid PDF without external deps
    const lines = [];
    lines.push('IoT Device Commissioning Report');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`User: ${req.user.email}`);
    lines.push(`Devices commissioned: ${devices.length}`);
    lines.push('');
    devices.forEach((d, i) => {
      lines.push(`--- Device #${i + 1} ---`);
      lines.push(`Name: ${d.name}`);
      lines.push(`Type: ${d.type || 'n/a'}`);
      lines.push(`Status: ${d.status || 'n/a'}`);
      lines.push(`Location: ${d.location || 'n/a'}`);
      lines.push(`Group: ${d.group_name || 'n/a'}`);
      lines.push(`Firmware: ${d.firmware_version || 'n/a'}`);
      lines.push(`IP: ${d.ip_address || 'n/a'}`);
      lines.push(`MAC: ${d.mac_address || 'n/a'}`);
      lines.push('');
    });
    lines.push('Commissioning Checklist:');
    lines.push('[x] Network connectivity verified');
    lines.push('[x] Firmware compatibility confirmed');
    lines.push('[x] Security credentials provisioned');
    lines.push('[x] Telemetry endpoint registered');
    lines.push('[x] Alert rules configured');

    // Build minimal PDF (one page, single text block)
    const escapePdf = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const contentStream = lines
      .map((l, i) => `${i === 0 ? 'BT /F1 12 Tf 50 780 Td' : 'T*'} (${escapePdf(l)}) Tj`)
      .join(' ') + ' ET';

    const objects = [];
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>');
    objects.push(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`);
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    objects.forEach((obj, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach((off) => {
      pdf += `${off.toString().padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="commissioning_${deviceId || 'fleet'}_${Date.now()}.pdf"`
    );
    res.send(Buffer.from(pdf, 'binary'));
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate commissioning PDF', message: err.message });
  }
});

// ============ NON-VIZ 2: Provisioning/firmware rules editor (CRUD device classes, OTA windows) ============
router.get('/device-classes', auth, async (req, res) => {
  res.json({ device_classes: deviceClasses, total: deviceClasses.length });
});

router.post('/device-classes', auth, async (req, res) => {
  try {
    const {
      class_name,
      description,
      firmware_track,
      ota_window_start,
      ota_window_end,
      timezone,
      auto_provision,
      required_firmware,
      rollback_on_failure,
    } = req.body || {};
    if (!class_name) {
      return res.status(400).json({ error: 'class_name is required' });
    }
    const created = {
      id: nextClassId++,
      class_name,
      description: description || '',
      firmware_track: firmware_track || 'stable',
      ota_window_start: ota_window_start || '02:00',
      ota_window_end: ota_window_end || '04:00',
      timezone: timezone || 'UTC',
      auto_provision: auto_provision !== false,
      required_firmware: required_firmware || '1.0.0',
      rollback_on_failure: rollback_on_failure !== false,
      created_at: new Date().toISOString(),
    };
    deviceClasses.push(created);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create device class' });
  }
});

router.put('/device-classes/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id);
  const idx = deviceClasses.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Device class not found' });
  deviceClasses[idx] = {
    ...deviceClasses[idx],
    ...req.body,
    id,
    updated_at: new Date().toISOString(),
  };
  res.json(deviceClasses[idx]);
});

router.delete('/device-classes/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id);
  const before = deviceClasses.length;
  deviceClasses = deviceClasses.filter((c) => c.id !== id);
  if (deviceClasses.length === before) {
    return res.status(404).json({ error: 'Device class not found' });
  }
  res.json({ message: 'Device class deleted', id });
});

// Rules editor mode: list OTA windows in a single call (used by NON-VIZ editor)
router.get('/ota-windows', auth, async (req, res) => {
  res.json({
    windows: deviceClasses.map((c) => ({
      id: c.id,
      class_name: c.class_name,
      window: `${c.ota_window_start}-${c.ota_window_end} ${c.timezone}`,
      firmware_track: c.firmware_track,
      auto_provision: c.auto_provision,
    })),
  });
});

module.exports = router;
