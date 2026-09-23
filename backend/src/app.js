// =============================================================================
// src/app.js — Express Application Assembly
// =============================================================================
//
// WHY IS app.js SEPARATE FROM server.js?
// ────────────────────────────────────────
// app.js builds and exports the Express application object WITHOUT binding a
// port. server.js imports this app and calls app.listen(). The separation means:
//
//   • TESTABILITY: Test frameworks (Jest, Supertest) can import `app` and make
//     in-process HTTP requests without actually binding a real port. Tests run
//     faster and don't clash with each other on the same port number.
//
//   • CLARITY: app.js is about "what the app does" (middleware, routes).
//     server.js is about "how the app runs" (port, network, process lifecycle).
//
// MIDDLEWARE ORDER — THIS IS CRITICAL:
// ──────────────────────────────────────
// Express processes middleware in registration order. The rules are:
//   1. Register global middleware (CORS, body parsing, logging) BEFORE routes
//      so every request is processed by them first.
//   2. Register route handlers AFTER global middleware.
//   3. Register the 404 handler AFTER all routes, so it only fires if no
//      route matched.
//   4. Register the error handler LAST — it catches errors forwarded by all
//      route and middleware above it via next(err).
// =============================================================================

'use strict';

const express = require('express');
const cors    = require('cors');

// Import our assembled route modules (each is an express.Router instance)
const sessionsRouter  = require('./routes/sessions.routes');
const checkinRouter   = require('./routes/checkin.routes');
const dashboardRouter = require('./routes/dashboard.routes');
const authRouter      = require('./routes/auth.routes');

// Import middleware
const requestLogger = require('./middleware/requestLogger');
const errorHandler  = require('./middleware/errorHandler');

// ─── Create the app ───────────────────────────────────────────────────────────
const app = express();

// =============================================================================
// GLOBAL MIDDLEWARE  (applied to EVERY request, in order)
// =============================================================================

// ① Request Logger — must be first so it captures ALL requests, even ones
//   that fail before reaching any route.
app.use(requestLogger);

// ② CORS — Cross-Origin Resource Sharing.
//   Allows browsers to make requests from a different domain (e.g., your React
//   frontend on localhost:3000 calling this API on localhost:5000).
//   Without this, browsers enforce the Same-Origin Policy and block the request.
//
//   In development, we allow all origins. In production, lock this down:
//   app.use(cors({ origin: 'https://yourdomain.com' }));
app.use(cors());

// ③ JSON Body Parser — tells Express to parse incoming request bodies that
//   have Content-Type: application/json. The parsed object becomes req.body.
//   Without this, req.body is undefined and POST data is inaccessible.
//   `express.json()` replaced the separate `body-parser` package in Express 4.16+.
app.use(express.json());

// ④ URL-encoded body parser — handles form submissions (Content-Type:
//   application/x-www-form-urlencoded). `extended: false` uses Node's built-in
//   querystring library; `extended: true` uses qs (supports nested objects).
app.use(express.urlencoded({ extended: false }));

// =============================================================================
// ROUTES  (mounted after global middleware so every request is pre-processed)
// =============================================================================

// All routes are namespaced under /api.
// Mounting a router here means the router's paths are RELATIVE to the mount point:
//   router.post('/')    → becomes POST /api/sessions
//   router.get('/:id')  → becomes GET  /api/sessions/:id

app.use('/api/sessions',  sessionsRouter);
app.use('/api/checkin',   checkinRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/auth',      authRouter);   // Google Sign-In authentication

// ─── Health check ─────────────────────────────────────────────────────────────
// A simple endpoint for load balancers and uptime monitors.
// Does NOT go through /api — it's intentionally at the root.
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// =============================================================================
// 404 HANDLER  (registered AFTER routes — only fires if nothing matched above)
// =============================================================================
// Note: this is a NORMAL 3-arg middleware, not an error handler.
// It runs when no route matched. We create an error and pass it to next(),
// which Express then forwards to the error handler below.
app.use((req, _res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
});

// =============================================================================
// CENTRALIZED ERROR HANDLER  (MUST be registered LAST — 4-arg signature)
// =============================================================================
// Express identifies this as an error handler because it has exactly 4 params.
// All errors forwarded via next(err) from any route or middleware above land here.
app.use(errorHandler);

module.exports = app;

