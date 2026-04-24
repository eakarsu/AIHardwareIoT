const pool = require('./db');

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'offline',
        location VARCHAR(255),
        group_name VARCHAR(100),
        firmware_version VARCHAR(50),
        ip_address VARCHAR(45),
        mac_address VARCHAR(17),
        last_seen TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS telemetry (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
        metric_type VARCHAR(100) NOT NULL,
        value DOUBLE PRECISION NOT NULL,
        unit VARCHAR(50),
        timestamp TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON telemetry(device_id, timestamp);

      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) DEFAULT 'info',
        message TEXT NOT NULL,
        resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS alert_rules (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
        metric_type VARCHAR(100) NOT NULL,
        condition VARCHAR(10) NOT NULL,
        threshold DOUBLE PRECISION NOT NULL,
        severity VARCHAR(50) DEFAULT 'warning',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS firmware (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL,
        device_type VARCHAR(100) NOT NULL,
        release_notes TEXT,
        size INTEGER,
        checksum VARCHAR(64),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS firmware_updates (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
        firmware_id INTEGER REFERENCES firmware(id),
        status VARCHAR(50) DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ai_analyses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        device_id INTEGER,
        analysis_type VARCHAR(100) NOT NULL,
        prompt TEXT,
        result TEXT,
        model VARCHAR(100),
        tokens_used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = initDb;

if (require.main === module) {
  initDb().then(() => process.exit(0)).catch(() => process.exit(1));
}
