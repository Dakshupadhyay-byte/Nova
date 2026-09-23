// =============================================================================
// src/routes/auth.routes.js — Google Authentication Routes
// =============================================================================
//
// Mounted in app.js as: app.use('/api/auth', authRouter)
// So the path registered here ('/google') becomes: POST /api/auth/google
// =============================================================================

'use strict';

const { Router }    = require('express');
const { googleAuth } = require('../controllers/auth.controller');

const router = Router();

// POST /api/auth/google
// Body: { "credential": "<Google ID token string from GIS>" }
// Verifies the Google credential server-side, then finds or creates the user.
router.post('/google', googleAuth);

module.exports = router;

