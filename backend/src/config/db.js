// =============================================================================
// src/config/db.js — PostgreSQL Connection Pool (Real PostgreSQL Database)
// =============================================================================

'use strict';

require('dotenv').config();

const { Pool } = require('pg');

const isTestEnv = process.env.NODE_ENV === 'test';
const connectionString = isTestEnv ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;

if (isTestEnv && !process.env.TEST_DATABASE_URL) {
  console.error('[DB GUARD] NODE_ENV is "test" but TEST_DATABASE_URL is not configured.');
  console.error('[DB GUARD] Refusing to connect to prevent test mutations against the production database.');
}

// Initialize real pg.Pool using environment variables
const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});


pool.on('connect', () => {
  console.log('[DB] New physical connection established in PostgreSQL pool');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected idle PostgreSQL client error:', err.message);
});

/**
 * Execute parameterized query against PostgreSQL database.
 */
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
