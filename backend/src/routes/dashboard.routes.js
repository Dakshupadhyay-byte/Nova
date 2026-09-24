// =============================================================================
// src/routes/dashboard.routes.js — Dashboard Routes
// =============================================================================

'use strict';

const { Router } = require('express');
const { getDashboard } = require('../controllers/dashboard.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// GET /api/dashboard → getDashboard for current authenticated user
router.get('/', authMiddleware, getDashboard);
// GET /api/dashboard/:userId → getDashboard
router.get('/:userId', authMiddleware, getDashboard);

module.exports = router;

