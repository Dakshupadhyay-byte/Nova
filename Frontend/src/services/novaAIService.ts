// =============================================================================
// src/services/novaAIService.ts — NOVA AI Frontend Service
// =============================================================================
//
// All AI communication is routed through the backend (POST /api/ai/chat).
// The backend holds the Gemini API key — never expose it client-side.
// The backend verifies the Firebase token and only serves the authenticated
// user's own data.
// =============================================================================

import { getIdToken } from './auth';
import { RoadmapAIAction } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface AIMessage {
  id: string;
  role: 'user' | 'nova';
  content: string;
  timestamp: Date;
  action?: RoadmapAIAction | null;
  actionState?: 'pending' | 'loading' | 'confirmed' | 'cancelled' | 'error';
  actionError?: string | null;
}

export interface AIChatResponse {
  success: boolean;
  reply: string | null;
  action: RoadmapAIAction | null;
  error: string | null;
}

/**
 * Send a chat message to NOVA AI and receive a response.
 * The backend authenticates the request via Firebase token and
 * fetches the user's real NOVA data to provide context to Gemini.
 */
export async function sendMessage(message: string): Promise<AIChatResponse> {
  try {
    const token = await getIdToken();

    if (!token) {
      return {
        success: false,
        reply: null,
        action: null,
        error: 'You must be signed in to use NOVA AI.',
      };
    }

    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: message.trim() }),
    });

    const json = await response.json();

    if (!response.ok || !json.success) {
      const errMsg = json?.error?.message || 'NOVA AI is unavailable. Please try again.';
      return { success: false, reply: null, action: null, error: errMsg };
    }

    return {
      success: true,
      reply: json.data.reply,
      action: json.data.action || null,
      error: null,
    };
  } catch (err: any) {
    console.error('[NOVA AI SERVICE]', err?.message || err);
    return {
      success: false,
      reply: null,
      action: null,
      error: "I couldn't reach NOVA AI right now. Please check your connection and try again.",
    };
  }
}

/** Generate a unique message ID */
export function createMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Suggested starter prompts shown in the empty state */
export const SUGGESTED_PROMPTS = [
  'What is my Roadmap mission today?',
  'Move today\'s Roadmap mission to tomorrow',
  'How was my focus this week?',
  'Does my sleep affect my focus?',
  'What days am I most productive?',
  'What is my average energy level?',
] as const;
