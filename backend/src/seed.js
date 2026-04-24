const pool = require('./db');
const bcrypt = require('bcryptjs');
const initDb = require('./initDb');

async function seed() {
  const client = await pool.connect();
  try {
    await initDb();

    // Check if data already exists
    const existing = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('Database already seeded, skipping...');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const userResult = await client.query(
      `INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['admin@iot-platform.com', hashedPassword, 'Admin User', 'admin']
    );
    const userId = userResult.rows[0].id;

    // Create demo user
    const demoPassword = await bcrypt.hash('demo123', 10);
    await client.query(
      `INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)`,
      ['demo@iot-platform.com', demoPassword, 'Demo User', 'user']
    );

    // 20 Devices
    const devices = [
      { name: 'Temp Sensor A1', type: 'temperature_sensor', status: 'online', location: 'Building A, Floor 1', group_name: 'warehouse-a', firmware_version: '2.1.0', ip: '192.168.1.101', mac: 'AA:BB:CC:DD:01:01' },
      { name: 'Temp Sensor A2', type: 'temperature_sensor', status: 'online', location: 'Building A, Floor 2', group_name: 'warehouse-a', firmware_version: '2.1.0', ip: '192.168.1.102', mac: 'AA:BB:CC:DD:01:02' },
      { name: 'Humidity Monitor B1', type: 'humidity_sensor', status: 'online', location: 'Building B, Floor 1', group_name: 'warehouse-b', firmware_version: '1.8.3', ip: '192.168.1.103', mac: 'AA:BB:CC:DD:02:01' },
      { name: 'Pressure Gauge F1', type: 'pressure_sensor', status: 'warning', location: 'Factory Floor, Zone 1', group_name: 'factory-floor', firmware_version: '3.0.1', ip: '192.168.1.104', mac: 'AA:BB:CC:DD:03:01' },
      { name: 'Motion Detector SR1', type: 'motion_detector', status: 'online', location: 'Server Room, Entrance', group_name: 'server-room', firmware_version: '1.5.0', ip: '192.168.1.105', mac: 'AA:BB:CC:DD:04:01' },
      { name: 'Security Camera N1', type: 'camera', status: 'online', location: 'Outdoor North Gate', group_name: 'outdoor-north', firmware_version: '4.2.1', ip: '192.168.1.106', mac: 'AA:BB:CC:DD:05:01' },
      { name: 'Edge Node E1', type: 'edge_compute_node', status: 'online', location: 'Server Room, Rack 3', group_name: 'server-room', firmware_version: '5.0.0', ip: '192.168.1.107', mac: 'AA:BB:CC:DD:06:01' },
      { name: 'Gateway GW1', type: 'gateway', status: 'online', location: 'Building A, Basement', group_name: 'warehouse-a', firmware_version: '3.2.0', ip: '192.168.1.108', mac: 'AA:BB:CC:DD:07:01' },
      { name: 'Smart Meter SM1', type: 'smart_meter', status: 'online', location: 'Building A, Utility Room', group_name: 'warehouse-a', firmware_version: '2.0.5', ip: '192.168.1.109', mac: 'AA:BB:CC:DD:08:01' },
      { name: 'Air Quality AQ1', type: 'air_quality_sensor', status: 'online', location: 'Lab 1', group_name: 'lab-1', firmware_version: '1.3.2', ip: '192.168.1.110', mac: 'AA:BB:CC:DD:09:01' },
      { name: 'Vibration Sensor V1', type: 'vibration_sensor', status: 'warning', location: 'Factory Floor, Zone 2', group_name: 'factory-floor', firmware_version: '2.5.1', ip: '192.168.1.111', mac: 'AA:BB:CC:DD:10:01' },
      { name: 'Light Sensor L1', type: 'light_sensor', status: 'online', location: 'Outdoor South Garden', group_name: 'outdoor-south', firmware_version: '1.1.0', ip: '192.168.1.112', mac: 'AA:BB:CC:DD:11:01' },
      { name: 'Flow Meter FM1', type: 'flow_meter', status: 'offline', location: 'Cold Storage, Pipe 3', group_name: 'cold-storage', firmware_version: '2.3.0', ip: '192.168.1.113', mac: 'AA:BB:CC:DD:12:01' },
      { name: 'GPS Tracker GT1', type: 'gps_tracker', status: 'online', location: 'Loading Dock, Vehicle 1', group_name: 'loading-dock', firmware_version: '1.7.2', ip: '192.168.1.114', mac: 'AA:BB:CC:DD:13:01' },
      { name: 'Relay Controller RC1', type: 'relay_controller', status: 'online', location: 'Assembly Line, Station 5', group_name: 'assembly-line', firmware_version: '3.1.0', ip: '192.168.1.115', mac: 'AA:BB:CC:DD:14:01' },
      { name: 'Env Station ES1', type: 'environmental_station', status: 'online', location: 'Outdoor North, Roof', group_name: 'outdoor-north', firmware_version: '2.8.0', ip: '192.168.1.116', mac: 'AA:BB:CC:DD:15:01' },
      { name: 'Temp Sensor QC1', type: 'temperature_sensor', status: 'maintenance', location: 'Quality Control Lab', group_name: 'quality-control', firmware_version: '2.0.9', ip: '192.168.1.117', mac: 'AA:BB:CC:DD:16:01' },
      { name: 'Humidity Monitor MB1', type: 'humidity_sensor', status: 'online', location: 'Maintenance Bay', group_name: 'maintenance-bay', firmware_version: '1.8.3', ip: '192.168.1.118', mac: 'AA:BB:CC:DD:17:01' },
      { name: 'HVAC Controller HC1', type: 'pressure_sensor', status: 'online', location: 'HVAC Main Unit', group_name: 'hvac-system', firmware_version: '4.0.0', ip: '192.168.1.119', mac: 'AA:BB:CC:DD:18:01' },
      { name: 'Perimeter Sensor PS1', type: 'motion_detector', status: 'offline', location: 'Security Perimeter, Gate 2', group_name: 'security-perimeter', firmware_version: '1.5.0', ip: '192.168.1.120', mac: 'AA:BB:CC:DD:19:01' },
    ];

    const deviceIds = [];
    for (const d of devices) {
      const result = await client.query(
        `INSERT INTO devices (user_id, name, type, status, location, group_name, firmware_version, ip_address, mac_address, last_seen, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - interval '${Math.floor(Math.random() * 60)} minutes', $10) RETURNING id`,
        [userId, d.name, d.type, d.status, d.location, d.group_name, d.firmware_version, d.ip, d.mac,
         JSON.stringify({ manufacturer: 'IoTCorp', model: d.type.toUpperCase(), batch: 'B2024' })]
      );
      deviceIds.push(result.rows[0].id);
    }

    // 300+ Telemetry points
    const metricConfigs = [
      { type: 'temperature', unit: '°C', min: 18, max: 35 },
      { type: 'humidity', unit: '%', min: 30, max: 80 },
      { type: 'pressure', unit: 'hPa', min: 990, max: 1030 },
      { type: 'motion', unit: 'events', min: 0, max: 50 },
      { type: 'power', unit: 'W', min: 5, max: 150 },
      { type: 'cpu_usage', unit: '%', min: 10, max: 95 },
      { type: 'memory_usage', unit: '%', min: 20, max: 85 },
      { type: 'battery_level', unit: '%', min: 15, max: 100 },
      { type: 'signal_strength', unit: 'dBm', min: -90, max: -30 },
      { type: 'air_quality', unit: 'AQI', min: 20, max: 200 },
      { type: 'vibration', unit: 'mm/s', min: 0, max: 15 },
      { type: 'luminosity', unit: 'lux', min: 50, max: 1500 },
      { type: 'flow_rate', unit: 'L/min', min: 0, max: 100 },
      { type: 'co2_level', unit: 'ppm', min: 300, max: 1200 },
      { type: 'noise_level', unit: 'dB', min: 30, max: 90 },
    ];

    console.log('Seeding telemetry data...');
    for (let i = 0; i < deviceIds.length; i++) {
      const deviceMetrics = metricConfigs.slice(0, 3 + Math.floor(Math.random() * 5));
      for (const metric of deviceMetrics) {
        for (let j = 0; j < 15; j++) {
          const value = (metric.min + Math.random() * (metric.max - metric.min)).toFixed(2);
          const timestamp = new Date(Date.now() - j * 600000 - Math.random() * 300000);
          await client.query(
            `INSERT INTO telemetry (device_id, metric_type, value, unit, timestamp) VALUES ($1, $2, $3, $4, $5)`,
            [deviceIds[i], metric.type, parseFloat(value), metric.unit, timestamp]
          );
        }
      }
    }

    // 20 Alerts
    const alertTypes = ['threshold_exceeded', 'device_offline', 'anomaly_detected', 'battery_low', 'firmware_outdated'];
    const severities = ['critical', 'warning', 'info'];
    const alertMessages = [
      'Temperature exceeded threshold of 30°C',
      'Device went offline unexpectedly',
      'Anomalous vibration pattern detected',
      'Battery level below 20%',
      'Firmware update available',
      'High CPU usage detected (>90%)',
      'Memory usage critical (>85%)',
      'Signal strength degraded',
      'Air quality index above safe level',
      'Unexpected motion detected in restricted area',
      'Pressure reading outside normal range',
      'Humidity spike detected',
      'Power consumption anomaly',
      'CO2 levels elevated',
      'Noise level exceeds workplace limit',
      'Sensor calibration drift detected',
      'Network latency increased',
      'Connection timeout occurred',
      'Data transmission error rate high',
      'Storage capacity near limit',
    ];

    for (let i = 0; i < 20; i++) {
      const deviceIdx = Math.floor(Math.random() * deviceIds.length);
      await client.query(
        `INSERT INTO alerts (device_id, user_id, type, severity, message, resolved, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - interval '${Math.floor(Math.random() * 48)} hours')`,
        [
          deviceIds[deviceIdx],
          userId,
          alertTypes[Math.floor(Math.random() * alertTypes.length)],
          severities[Math.floor(Math.random() * severities.length)],
          alertMessages[i],
          i < 12 ? false : true,
        ]
      );
    }

    // 15 Alert Rules
    const ruleConfigs = [
      { metric: 'temperature', condition: '>', threshold: 30, severity: 'warning' },
      { metric: 'temperature', condition: '>', threshold: 40, severity: 'critical' },
      { metric: 'humidity', condition: '>', threshold: 75, severity: 'warning' },
      { metric: 'humidity', condition: '<', threshold: 20, severity: 'warning' },
      { metric: 'pressure', condition: '<', threshold: 995, severity: 'critical' },
      { metric: 'cpu_usage', condition: '>', threshold: 90, severity: 'critical' },
      { metric: 'memory_usage', condition: '>', threshold: 85, severity: 'warning' },
      { metric: 'battery_level', condition: '<', threshold: 20, severity: 'critical' },
      { metric: 'battery_level', condition: '<', threshold: 40, severity: 'warning' },
      { metric: 'signal_strength', condition: '<', threshold: -80, severity: 'warning' },
      { metric: 'air_quality', condition: '>', threshold: 150, severity: 'critical' },
      { metric: 'vibration', condition: '>', threshold: 10, severity: 'warning' },
      { metric: 'co2_level', condition: '>', threshold: 1000, severity: 'warning' },
      { metric: 'noise_level', condition: '>', threshold: 85, severity: 'critical' },
      { metric: 'power', condition: '>', threshold: 120, severity: 'warning' },
    ];

    for (let i = 0; i < ruleConfigs.length; i++) {
      const r = ruleConfigs[i];
      const deviceIdx = i % deviceIds.length;
      await client.query(
        `INSERT INTO alert_rules (user_id, device_id, metric_type, condition, threshold, severity, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, deviceIds[deviceIdx], r.metric, r.condition, r.threshold, r.severity, true]
      );
    }

    // 15 Firmware versions
    const deviceTypes = ['temperature_sensor', 'humidity_sensor', 'pressure_sensor', 'motion_detector', 'camera',
      'edge_compute_node', 'gateway', 'smart_meter', 'air_quality_sensor', 'vibration_sensor',
      'light_sensor', 'flow_meter', 'gps_tracker', 'relay_controller', 'environmental_station'];
    const firmwareIds = [];
    for (let i = 0; i < 15; i++) {
      const version = `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`;
      const result = await client.query(
        `INSERT INTO firmware (version, device_type, release_notes, size, checksum, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - interval '${Math.floor(Math.random() * 90)} days') RETURNING id`,
        [
          version,
          deviceTypes[i],
          `Release ${version}: Bug fixes, performance improvements, security patches for ${deviceTypes[i]}`,
          Math.floor(Math.random() * 50000) + 10000,
          Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
        ]
      );
      firmwareIds.push(result.rows[0].id);
    }

    // 15 Firmware updates
    const updateStatuses = ['pending', 'downloading', 'installing', 'completed', 'failed', 'rolled_back'];
    for (let i = 0; i < 15; i++) {
      const status = updateStatuses[Math.floor(Math.random() * updateStatuses.length)];
      const progress = status === 'completed' ? 100 : status === 'failed' ? Math.floor(Math.random() * 80) : Math.floor(Math.random() * 100);
      await client.query(
        `INSERT INTO firmware_updates (device_id, firmware_id, status, progress, started_at, completed_at)
         VALUES ($1, $2, $3, $4, NOW() - interval '${Math.floor(Math.random() * 24)} hours', $5)`,
        [
          deviceIds[i % deviceIds.length],
          firmwareIds[i % firmwareIds.length],
          status,
          progress,
          status === 'completed' ? new Date() : null,
        ]
      );
    }

    // 15 AI Analyses
    const analysisTypes = ['device_analysis', 'predictive_maintenance', 'anomaly_detection', 'fleet_analysis', 'energy_optimization'];
    const analysisResults = [
      '## Device Health: Good\n\nAll sensors operating within normal parameters. Temperature readings stable at 22-24°C. Recommend continuing current monitoring schedule.',
      '## Predictive Maintenance Report\n\n**Risk Level: Low**\n\nNo immediate maintenance required. Suggest calibration check in 15 days. Battery replacement estimated in 45 days.',
      '## Anomaly Detection Results\n\n**2 anomalies detected:**\n1. Temperature spike at 14:32 UTC (32.5°C vs avg 23°C)\n2. Unusual vibration pattern at 16:45 UTC\n\nBoth events correlate with scheduled equipment testing.',
      '## Fleet Analysis\n\n**Fleet Health Score: 87/100**\n\n- 85% devices online\n- 2 devices need attention\n- Average uptime: 99.2%\n\nRecommend firmware update for 5 devices.',
      '## Energy Optimization\n\n**Potential Savings: 15%**\n\n1. Enable sleep mode on 3 idle sensors\n2. Reduce polling frequency on stable sensors\n3. Batch data uploads during off-peak hours',
    ];

    for (let i = 0; i < 15; i++) {
      const analysisType = analysisTypes[i % analysisTypes.length];
      await client.query(
        `INSERT INTO ai_analyses (user_id, device_id, analysis_type, prompt, result, model, tokens_used, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - interval '${Math.floor(Math.random() * 72)} hours')`,
        [
          userId,
          deviceIds[i % deviceIds.length],
          analysisType,
          `Analyze ${analysisType.replace('_', ' ')} for device`,
          analysisResults[i % analysisResults.length],
          'anthropic/claude-sonnet-4-20250514',
          Math.floor(Math.random() * 1500) + 500,
        ]
      );
    }

    // 15 Edge AI inference records
    await client.query(`
      CREATE TABLE IF NOT EXISTS edge_inferences (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
        model_type VARCHAR(100) NOT NULL,
        model_version VARCHAR(50),
        input_data JSONB,
        result JSONB,
        inference_time_ms DOUBLE PRECISION,
        accuracy DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const modelTypes = ['anomaly_detection', 'predictive_maintenance', 'image_classification', 'object_detection', 'sensor_fusion', 'pattern_recognition'];
    for (let i = 0; i < 15; i++) {
      const modelType = modelTypes[i % modelTypes.length];
      await client.query(
        `INSERT INTO edge_inferences (device_id, model_type, model_version, input_data, result, inference_time_ms, accuracy, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - interval '${Math.floor(Math.random() * 24)} hours')`,
        [
          deviceIds[i % deviceIds.length],
          modelType,
          `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}`,
          JSON.stringify({ sensor_data: Array.from({ length: 10 }, () => (Math.random() * 100).toFixed(2)) }),
          JSON.stringify({ prediction: modelType === 'anomaly_detection' ? 'normal' : 'positive', confidence: (0.85 + Math.random() * 0.14).toFixed(3), label: modelType }),
          (5 + Math.random() * 95).toFixed(2),
          (0.80 + Math.random() * 0.19).toFixed(3),
        ]
      );
    }

    console.log('Seed data inserted successfully!');
    console.log('  - 2 users (admin@iot-platform.com / admin123)');
    console.log('  - 20 devices');
    console.log('  - 300+ telemetry records');
    console.log('  - 20 alerts');
    console.log('  - 15 alert rules');
    console.log('  - 15 firmware versions');
    console.log('  - 15 firmware updates');
    console.log('  - 15 AI analyses');
    console.log('  - 15 edge inference records');
  } catch (err) {
    console.error('Seed error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().then(() => process.exit(0)).catch(() => process.exit(1));
