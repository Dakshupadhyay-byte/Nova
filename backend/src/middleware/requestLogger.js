// =============================================================================
// src/middleware/requestLogger.js — HTTP Request Logger
// =============================================================================
//
// A lightweight request logger to trace every incoming request in development.
// In production you'd swap this for a structured logger like morgan + winston,
// or a tracing SDK (OpenTelemetry), but this gives you immediate visibility
// during local development with zero external dependencies.
//
// WHY MIDDLEWARE ORDER MATTERS:
// ──────────────────────────────
// Express runs middleware in the exact order they are registered via app.use().
// The request logger should be registered FIRST (or very early) in app.js so
// it captures ALL incoming requests — including ones that fail authentication,
// hit 404, or throw errors before reaching route handlers.
// If you registered it after your routes, requests handled by those routes
// would never pass through the logger at all.
// =============================================================================

'use strict';

/**
 * Logs method, URL, and response time for every HTTP request.
 * Designed to be registered as the first app.use() in app.js.
 *
 * @type {import('express').RequestHandler}
 */
const requestLogger = (req, res, next) => {
  // Record when the request arrived
  const start = Date.now();

  // 'finish' is emitted by the Node.js http.ServerResponse when the response
  // has been fully sent (headers + body flushed). We hook it here rather than
  // logging synchronously so we can report the ACTUAL status code and duration.
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    // Color-code status for quick visual scanning in the terminal
    const color =
      statusCode >= 500 ? '\x1b[31m' : // red   — server errors
      statusCode >= 400 ? '\x1b[33m' : // yellow — client errors
      statusCode >= 300 ? '\x1b[36m' : // cyan  — redirects
                          '\x1b[32m';  // green — success

    const reset = '\x1b[0m';
    console.log(`${color}[${method}]${reset} ${originalUrl} → ${color}${statusCode}${reset} (${duration}ms)`);
  });

  // CRITICAL: Always call next() in middleware that is not a terminal handler.
  // Forgetting next() silently hangs the request — no response is ever sent.
  next();
};

module.exports = requestLogger;

