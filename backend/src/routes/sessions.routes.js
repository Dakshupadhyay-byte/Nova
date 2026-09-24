// =============================================================================
// src/routes/sessions.routes.js
// =============================================================================

'use strict';

const { Router } = require('express');
const { createSession } = require('../controllers/sessions.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// POST /api/sessions → records a new focus session for authenticated user
router.post('/', authMiddleware, createSession);

module.exports = router;
