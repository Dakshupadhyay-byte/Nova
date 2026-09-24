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
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// POST /api/auth/google & POST /api/auth/sync
router.post('/google', googleAuth);
router.post('/sync', googleAuth);

// GET /api/auth/me → returns current authenticated database user profile
router.get('/me', authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user },
    error: null,
  });
});

module.exports = router;

