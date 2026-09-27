// =============================================================================
// src/routes/ai.routes.js — NOVA AI Chat Route
// =============================================================================
//
// Mounted in app.js as: app.use('/api/ai', aiRouter)
// POST /api/ai/chat
// =============================================================================

'use strict';

const { Router }     = require('express');
const { chat }       = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// POST /api/ai/chat — Authenticated users only
router.post('/chat', authMiddleware, chat);

module.exports = router;
