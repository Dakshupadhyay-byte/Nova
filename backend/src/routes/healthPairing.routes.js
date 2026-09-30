// =============================================================================
// src/routes/healthPairing.routes.js — Health Sync QR Pairing Routes
// =============================================================================
// Mounted in app.js or healthWebhook.routes.js under /api/health/pairing
// - POST /api/health/pairing/create  -> Protected (Firebase Auth)
// - POST /api/health/pairing/claim   -> Public (Pairing Code)
// - GET  /api/health/pairing/status  -> Protected (Firebase Auth)
// - POST /api/health/pairing/revoke  -> Protected (Firebase Auth)
// =============================================================================

'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createPairingSession,
  claimPairingSession,
  getPairingStatus,
  revokePairing,
} = require('../controllers/healthPairing.controller');

const router = Router();

// POST /api/health/pairing/create — Generate short-lived pairing code for QR code
router.post('/create', authMiddleware, createPairingSession);

// POST /api/health/pairing/claim — Claimed by Android app to establish link & obtain credential
router.post('/claim', claimPairingSession);

// GET /api/health/pairing/status — Check if user has active paired Android device
router.get('/status', authMiddleware, getPairingStatus);

// POST /api/health/pairing/revoke — Revoke paired device connection
router.post('/revoke', authMiddleware, revokePairing);

module.exports = router;
