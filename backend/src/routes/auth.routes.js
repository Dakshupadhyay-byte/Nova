// =============================================================================
// src/routes/auth.routes.js — Google Authentication & Webhook Credentials Routes
// =============================================================================
//
// Mounted in app.js as: app.use('/api/auth', authRouter)
// =============================================================================

'use strict';

const { Router } = require('express');
const {
  googleAuth,
  generateWebhookToken,
  revokeWebhookTokens,
} = require('../controllers/auth.controller');
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

// POST /api/auth/webhook-token → generates long-lived Webhook API Key
router.post('/webhook-token', authMiddleware, generateWebhookToken);

// POST /api/auth/webhook-token/revoke → revokes active Webhook API Keys
router.post('/webhook-token/revoke', authMiddleware, revokeWebhookTokens);

module.exports = router;
