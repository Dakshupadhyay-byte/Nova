// =============================================================================
// src/middleware/errorHandler.js — Centralized Error-Handling Middleware
// =============================================================================
//
// WHY A DEDICATED ERROR HANDLER?
// ────────────────────────────────
// Without a centralized handler, every route needs its own catch block that
// formats and sends an error response. That leads to inconsistent error shapes,
// duplicated formatting logic, and forgotten cases that crash the server.
// One handler here gives you: consistent JSON error format, environment-aware
// detail (stack traces in dev, none in prod), and a single place to wire in
// external monitoring (Sentry, Datadog, etc.).
//
// HOW DOES EXPRESS KNOW THIS IS AN ERROR HANDLER?
// ────────────────────────────────────────────────
// Express differentiates error-handling middleware from normal middleware by
// the ARITY (number of arguments) of the function. A function with exactly
// FOUR parameters — (err, req, res, next) — is treated as an error handler.
// It is ONLY invoked when:
//   a) next(err) is called with an argument from any middleware/route, OR
//   b) a synchronous throw propagates up through Express internals.
//
// Normal middleware: (req, res, next)    → 3 args → request handler
// Error middleware:  (err, req, res, next) → 4 args → error handler
//
// IMPORTANT: Register this middleware LAST in app.js, after all routes.
// Express processes middleware in registration order; if this were first,
// it would never receive errors from routes registered after it.
// =============================================================================

'use strict';

/**
 * Centralized Express error-handling middleware.
 *
 * Called automatically by Express whenever next(err) is invoked, or a
 * synchronous error is thrown inside a route handler.
 *
 * @param {Error}    err  - The error object passed to next(err)
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next - Must be declared even if unused;
 *   omitting it would reduce arity to 3 and Express would treat this as a
 *   normal middleware, breaking error handling entirely.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // ── Log the error server-side first ────────────────────────────────────────
  // Always log to stderr. In production, route stderr to a log aggregator.
  // We log regardless of environment because ops teams need the full picture.
  console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err);

  // ── Determine HTTP status code ──────────────────────────────────────────────
  // If the error object carries a statusCode (set by your own throw logic),
  // use it. Otherwise default to 500 (Internal Server Error).
  // Express itself sets err.status for things like 404 from express.Router.
  const statusCode = err.statusCode || err.status || 500;

  // ── Build the response payload ──────────────────────────────────────────────
  // In development we expose the stack trace — invaluable for debugging.
  // In production we only send a generic message — stack traces leak
  // implementation details that attackers can exploit.
  const isDev = process.env.NODE_ENV === 'development';

  const payload = {
    success: false,
    error: {
      message: err.message || 'An unexpected error occurred',
      // Expose the stack only in development
      ...(isDev && { stack: err.stack }),
    },
  };

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;

