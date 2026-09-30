// =============================================================================
// migrate.js — Run database migrations for Health Pairing & Device Connections
// =============================================================================

'use strict';

require('dotenv').config();
const db = require('./src/config/db');

async function runMigration() {
  console.log('[MIGRATION] Applying health pairing schema migrations...');

  const migrationSql = `
    -- 1. Table for persistent Android device connections
    CREATE TABLE IF NOT EXISTS health_device_connections (
      id            BIGSERIAL    PRIMARY KEY,
      user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id     VARCHAR(255) NOT NULL,
      device_name   VARCHAR(150),
      key_hash      VARCHAR(64)  NOT NULL UNIQUE,
      key_prefix    VARCHAR(32)  NOT NULL DEFAULT 'nova_hk_',
      is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      last_sync_at  TIMESTAMPTZ  NULL
    );

    CREATE INDEX IF NOT EXISTS idx_health_device_conn_user_id
        ON health_device_connections (user_id);

    CREATE INDEX IF NOT EXISTS idx_health_device_conn_active
        ON health_device_connections (user_id, is_active)
        WHERE is_active = TRUE;

    CREATE INDEX IF NOT EXISTS idx_health_device_conn_key_hash
        ON health_device_connections (key_hash)
        WHERE is_active = TRUE;

    CREATE INDEX IF NOT EXISTS idx_health_device_conn_user_device
        ON health_device_connections (user_id, device_id);

    COMMENT ON TABLE  health_device_connections              IS 'Active and historic paired Android Health Sync device connections';
    COMMENT ON COLUMN health_device_connections.device_id    IS 'Unique client installation / hardware device identifier';
    COMMENT ON COLUMN health_device_connections.key_hash     IS 'SHA-256 hex digest (64 chars) of device-specific webhook token';
    COMMENT ON COLUMN health_device_connections.is_active    IS 'Whether this connection and its associated credential are valid';
    COMMENT ON COLUMN health_device_connections.last_sync_at  IS 'Timestamp of the most recent health webhook ingestion for this device';

    -- 2. Table for short-lived QR pairing sessions
    CREATE TABLE IF NOT EXISTS health_pairing_sessions (
      id            BIGSERIAL    PRIMARY KEY,
      user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pairing_code  VARCHAR(128) NOT NULL UNIQUE,
      status        VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
      device_id     VARCHAR(255) NULL,
      expires_at    TIMESTAMPTZ  NOT NULL,
      claimed_at    TIMESTAMPTZ  NULL,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_pairing_status CHECK (status IN ('PENDING', 'CLAIMED', 'EXPIRED', 'REVOKED'))
    );

    CREATE INDEX IF NOT EXISTS idx_health_pairing_user_status
        ON health_pairing_sessions (user_id, status);

    CREATE INDEX IF NOT EXISTS idx_health_pairing_code
        ON health_pairing_sessions (pairing_code);

    COMMENT ON TABLE  health_pairing_sessions               IS 'Short-lived single-use pairing sessions for QR code authentication with Android Health Sync';
    COMMENT ON COLUMN health_pairing_sessions.pairing_code  IS 'Cryptographically secure random one-time pairing code';
    COMMENT ON COLUMN health_pairing_sessions.status        IS 'Current lifecycle state: PENDING, CLAIMED, EXPIRED, or REVOKED';
  `;

  await db.query(migrationSql);
  console.log('[MIGRATION] Migration applied successfully!');
  await db.pool.end();
}

runMigration().catch((err) => {
  console.error('[MIGRATION] Migration failed:', err);
  process.exit(1);
});
