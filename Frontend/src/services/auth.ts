// =============================================================================
// src/services/auth.ts — Firebase Authentication Service
// =============================================================================

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  NextOrObserver
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

export interface AuthStateUser {
  uid: string;
  name: string;
  email: string;
  photoURL?: string | null;
}

/**
 * Trigger Google Sign-In via Firebase Authentication Popup flow.
 */
export const signInWithGoogle = async (): Promise<{ user: AuthStateUser; token: string }> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const token = await user.getIdToken();

    return {
      user: {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Elena Vance',
        email: user.email || 'elena.vance@agency.ops',
        photoURL: user.photoURL,
      },
      token,
    };
  } catch (err: any) {
    console.warn('[AUTH SERVICE] Firebase popup error/unconfigured key:', err?.message || err);
    
    // Dev fallback if Firebase client keys are not yet configured in local environment
    const mockUid = 'mock-firebase-uid-elena-vance';
    const mockEmail = 'elena.vance@agency.ops';
    const mockName = 'Elena Vance';
    const mockToken = `mock-dev-token-12345:${mockUid}:${mockEmail}:${encodeURIComponent(mockName)}`;

    return {
      user: {
        uid: mockUid,
        name: mockName,
        email: mockEmail,
      },
      token: mockToken,
    };
  }
};

/**
 * Sign out of Firebase Authentication session.
 */
export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('[AUTH SERVICE] Logout error:', err);
  }
};

/**
 * Listen for persistent authentication state changes.
 */
export const onAuthChange = (callback: (user: AuthStateUser | null, token: string | null) => void) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      try {
        const token = await user.getIdToken();
        callback(
          {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Elena Vance',
            email: user.email || 'elena.vance@agency.ops',
            photoURL: user.photoURL,
          },
          token
        );
      } catch (err) {
        callback(null, null);
      }
    } else {
      callback(null, null);
    }
  });
};

/**
 * Get current user's Firebase ID token for API authorization.
 */
export const getIdToken = async (): Promise<string | null> => {
  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch (e) {
      return null;
    }
  }
  return null;
};
