// =============================================================================
// src/routes/checkin.routes.js
// =============================================================================

'use strict';

const { Router } = require('express');
const { createCheckin } = require('../controllers/checkin.controller');

const router = Router();

// POST /api/checkin → upserts a wellness check-in (insert or update by date)
router.post('/', createCheckin);

module.exports = router;
