// =============================================================================
// src/config/db.js — PostgreSQL Connection Pool (Real PostgreSQL Database)
// =============================================================================

'use strict';

require('dotenv').config();

const { Pool } = require('pg');

// Initialize real pg.Pool using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
