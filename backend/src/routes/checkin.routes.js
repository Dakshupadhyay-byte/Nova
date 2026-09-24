// =============================================================================
// src/routes/checkin.routes.js
// =============================================================================

'use strict';

const { Router } = require('express');
const { createCheckin } = require('../controllers/checkin.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// POST /api/checkin → upserts a wellness check-in for authenticated user
router.post('/', authMiddleware, createCheckin);

module.exports = router;
