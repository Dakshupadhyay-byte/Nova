// =============================================================================
// src/routes/blueprints.routes.js — Blueprint Roadmap Routes
// =============================================================================
//
// Mounted in app.js as: app.use('/api/blueprints', blueprintsRouter)
//
// Routes:
//   POST /api/blueprints → authMiddleware → createBlueprint
// =============================================================================

'use strict';

const { Router }          = require('express');
const { createBlueprint } = require('../controllers/blueprints.controller');
const authMiddleware      = require('../middleware/authMiddleware');

const router = Router();

// POST /api/blueprints
// Requires valid Firebase ID token. Generates multi-day roadmap with Gemini.
router.post('/', authMiddleware, createBlueprint);

module.exports = router;
