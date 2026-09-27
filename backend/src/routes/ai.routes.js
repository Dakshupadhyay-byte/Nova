// =============================================================================
// src/routes/ai.routes.js — AI Companion Routes
// =============================================================================
//
// Mounted in app.js as: app.use('/api/ai', aiRouter)
//
// Routes:
//   POST /api/ai/chat → authMiddleware → aiChat
//
// authMiddleware is applied per-route (not globally) — consistent with the
// pattern used in checkin.routes.js and sessions.routes.js.
// =============================================================================

'use strict';

const { Router }     = require('express');
const { aiChat }     = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// POST /api/ai/chat
// Requires a valid Firebase ID token in Authorization: Bearer <token>.
// The authenticated req.user.id is used by the controller for personalization.
router.post('/chat', authMiddleware, aiChat);

module.exports = router;
