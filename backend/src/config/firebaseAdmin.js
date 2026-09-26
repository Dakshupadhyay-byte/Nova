// =============================================================================
// src/config/firebaseAdmin.js — Firebase Admin SDK Initialization
// =============================================================================
'use strict';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let firebaseAdminApp = null;
let isDevMock = false;

const initFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  try {
    if (serviceAccountPath && fs.existsSync(path.resolve(serviceAccountPath))) {
      const serviceAccount = require(path.resolve(serviceAccountPath));
      firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id,
      });
      console.log('[FIREBASE ADMIN] Initialized with Service Account JSON file.');
      return firebaseAdminApp;
    }

    if (privateKey && clientEmail && projectId) {
      firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        projectId,
      });
      console.log('[FIREBASE ADMIN] Initialized with Environment Credentials.');
      return firebaseAdminApp;
    }

    if (projectId) {
      // Initialize with application default credentials or project ID
      firebaseAdminApp = admin.initializeApp({
        projectId,
      });
      console.log(`[FIREBASE ADMIN] Initialized with Project ID: ${projectId}`);
      return firebaseAdminApp;
    }

    console.warn('[FIREBASE ADMIN] Warning: No FIREBASE_PROJECT_ID or credentials set in env.');
    console.warn('[FIREBASE ADMIN] Enabling Dev Mock Mode for local testing fallback.');
    isDevMock = true;
    return null;
  } catch (err) {
    console.error('[FIREBASE ADMIN] Initialization error:', err.message);
    isDevMock = true;
    return null;
  }
};

initFirebaseAdmin();

/**
 * Verifies a Firebase ID token string.
 * Uses Firebase Admin SDK in production / configured environments.
 * Falls back to dev decoded token handling if in dev mock mode.
 *
 * @param {string} idToken
 * @returns {Promise<import('firebase-admin/auth').DecodedIdToken>}
 */
const verifyFirebaseToken = async (idToken) => {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('ID Token must be a non-empty string.');
  }

  // Real Firebase Admin SDK verification only. No mock fallbacks.
  if (!admin.apps.length) {
    throw new Error('Firebase Admin SDK is not initialized.');
  }

  return await admin.auth().verifyIdToken(idToken);
};

module.exports = {
  admin,
  verifyFirebaseToken,
  isDevMock: () => isDevMock,
};
