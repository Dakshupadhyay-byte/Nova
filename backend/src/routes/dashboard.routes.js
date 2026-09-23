// =============================================================================
// src/routes/dashboard.routes.js — Dashboard Routes
// =============================================================================

'use strict';

const { Router } = require('express');
const { getDashboard } = require('../controllers/dashboard.controller');

const router = Router();

// GET /api/dashboard/:userId → getDashboard
// Returns aggregated wellness and session stats for a user's dashboard view.
router.get('/:userId', getDashboard);

module.exports = router;

