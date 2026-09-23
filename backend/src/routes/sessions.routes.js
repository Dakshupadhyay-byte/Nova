// =============================================================================
// src/routes/sessions.routes.js
// =============================================================================

'use strict';

const { Router } = require('express');
const { createSession } = require('../controllers/sessions.controller');

const router = Router();

// POST /api/sessions → records a new focus session
router.post('/', createSession);

module.exports = router;
