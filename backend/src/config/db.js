// =============================================================================
// src/config/db.js — PostgreSQL Connection Pool
// =============================================================================
//
// WHY A POOL INSTEAD OF A SINGLE CLIENT?
// ────────────────────────────────────────
// A web server handles many concurrent HTTP requests. If you used a single
// pg.Client, every request would have to wait for the previous query to finish
// before it could run — a serial bottleneck. A pool maintains a collection of
// reusable database connections (default: up to 10). Each incoming query grabs
// a free connection, runs, then returns it to the pool. This means tens of
// simultaneous DB operations can proceed in parallel without your app opening
// a new TCP connection to Postgres for every one of them — connections are
// expensive (handshake, auth, SSL negotiation).
//
// HOW pg.Pool WORKS UNDER THE HOOD:
//   1. On first query, Pool creates a new pg.Client connection up to `max`.
//   2. If all connections are busy, new queries queue and wait up to
//      `idleTimeoutMillis` for one to become free.
//   3. Idle connections are released after `idleTimeoutMillis` ms.
//   4. If a connection is checked out for longer than `connectionTimeoutMillis`,
//      Pool throws an error rather than waiting forever.
// =============================================================================

'use strict';

// Load dotenv ONLY if this file is the first to require it.
// In practice, dotenv is loaded once in server.js before anything else.
// We leave this guard here so db.js can be used standalone (e.g., in tests).
require('dotenv').config();

const { Pool } = require('pg');

// ─── Pool Configuration ───────────────────────────────────────────────────────
// pg.Pool accepts either a connection string or an object of named options.
// We use named options so each variable is explicit and can be sourced from env.
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // max: the maximum number of simultaneous connections this pool will hold.
  // A typical Postgres server default is max_connections = 100. For a single
  // app instance, 10 is safe and rarely a bottleneck.
  max: 10,

  // idleTimeoutMillis: how long (ms) a connection can sit unused before the
  // pool closes it. Prevents stale connections piling up on a quiet server.
  idleTimeoutMillis: 30_000, // 30 seconds

  // connectionTimeoutMillis: how long (ms) to wait when all connections are
  // busy before throwing "timeout acquiring connection" error. Fail fast
  // rather than hanging the HTTP request forever.
  connectionTimeoutMillis: 5_000, // 5 seconds
});

// ─── Pool Event Listeners ─────────────────────────────────────────────────────
// pg.Pool emits lifecycle events you can hook for observability.

// 'connect' fires when a NEW physical connection to Postgres is established.
// Useful for debugging — you'll see this only when the pool grows, not per query.
pool.on('connect', () => {
  console.log('[DB] New connection established in pool');
});

// 'error' fires when an IDLE client in the pool encounters an unexpected error
// (e.g., Postgres restarted and the TCP connection dropped). Without this
// listener, the error would be an unhandled promise rejection and crash Node.
pool.on('error', (err) => {
  console.error('[DB] Unexpected idle client error:', err.message);
  // In production you might alert here (Sentry, PagerDuty, etc.)
  // We don't process.exit() — the pool will try to recover.
});

// ─── Query Helper ─────────────────────────────────────────────────────────────
// Wrapping pool.query() lets us:
//   • Log slow or failing queries from one place
//   • Swap the underlying DB driver later without touching every controller
//   • Add query timing / tracing in one spot
//
// Usage in a controller:
//   const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
//
// $1, $2, … are positional placeholders — pg sends them as a parameterised
// query to Postgres, which prevents SQL injection at the protocol level.
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };

