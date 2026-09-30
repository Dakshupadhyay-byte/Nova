// =============================================================================
// src/routes/simulation.routes.js — What-If Simulator Routes
// =============================================================================

'use strict';

const { Router } = require('express');
const { whatIfSimulation } = require('../controllers/simulation.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// POST /api/simulation/what-if
// Authentication is enforced by authMiddleware.
// User ID is derived from req.user.id — never from the request body.
router.post('/what-if', authMiddleware, whatIfSimulation);

module.exports = router;
