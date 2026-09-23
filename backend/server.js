// =============================================================================
// server.js — HTTP Server Entry Point
// =============================================================================
//
// This file's only jobs are:
//   1. Load environment variables (must happen before anything else reads them)
//   2. Import the assembled Express app
//   3. Start the HTTP server on the configured port
//   4. Handle graceful shutdown (SIGTERM/SIGINT)
//
// It does NOT define routes, middleware, or business logic — that all lives in
// src/app.js. This separation keeps app.js independently importable for tests.
// =============================================================================

'use strict';

// Load .env file contents into process.env.
// IMPORTANT: This must be the very first call in the application entry point,
// before any other require() that might read process.env. If you require db.js
// before dotenv.config(), DB_HOST etc. will all be undefined.
require('dotenv').config();

const http = require('http');
const app  = require('./src/app');

// ─── Configuration ────────────────────────────────────────────────────────────
// Read PORT from environment (set in .env or by the hosting platform like
// Heroku / Railway / Render). Fall back to 5000 for local development.
const PORT = process.env.PORT || 5000;

// ─── Create HTTP server ───────────────────────────────────────────────────────
// We use http.createServer(app) rather than app.listen() directly.
// This gives us a reference to the raw Node.js http.Server, which we need to:
//   • Call server.close() for graceful shutdown
//   • Attach WebSocket servers later (ws, socket.io) to the same port
const server = http.createServer(app);

// ─── Start listening ──────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║          Nova Async API — Server Running         ║
╠══════════════════════════════════════════════════╣
║  Port:        ${String(PORT).padEnd(34)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(34)}║
║  Health:      http://localhost:${String(PORT).padEnd(18)}/health ║
╚══════════════════════════════════════════════════╝
  `);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// When the process receives SIGTERM (from Docker / Kubernetes / hosting
// platforms stopping the container) or SIGINT (Ctrl+C in the terminal),
// we stop accepting new connections, wait for in-flight requests to finish,
// then exit cleanly. This prevents requests being dropped mid-response.

const shutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Graceful shutdown initiated...`);

  server.close((err) => {
    if (err) {
      console.error('[Server] Error during shutdown:', err);
      process.exit(1);
    }
    console.log('[Server] All connections closed. Exiting.');
    process.exit(0);
  });

  // Safety valve: if graceful shutdown takes more than 10s, force exit.
  // This prevents the process from hanging indefinitely if a connection
  // is being kept alive (e.g., a long-polling or SSE client).
  setTimeout(() => {
    console.error('[Server] Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ─── Unhandled Rejection Safety Net ──────────────────────────────────────────
// If a Promise rejects and nothing catches it, this fires.
// In Node 15+ this crashes the process by default — we log and exit cleanly.
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Promise Rejection:', reason);
  shutdown('unhandledRejection');
});

