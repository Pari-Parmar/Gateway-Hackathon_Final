/**
 * FRONTLINE AI — Clean API Service Module
 *
 * All customer message analysis, sentiment detection, guardrails, and decision logic
 * are executed dynamically by Google Gemini 2.0 Flash AI Model on the backend server.
 * No hardcoded classification logic is stored in this frontend client module.
 */

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    if (hostname.includes('vercel.app') || window.location.port === '' || window.location.port === '443') {
      return '/api';
    }
    return `http://${hostname}:3001/api`;
  }
  return '/api';
};

const API_BASE = getApiBase();

async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Server error' }));
    throw new Error(errorBody.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

export const api = {
  /**
   * Send customer message to Backend API for real-time Gemini AI Model Triage.
   */
  analyze: (message) =>
    apiCall('/analyze', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  /**
   * Fetch aggregate system stats from backend SQLite database.
   */
  stats: () => apiCall('/stats'),

  /**
   * Fetch live triage queue from backend SQLite database.
   */
  queue: (limit = 100) => apiCall(`/queue?limit=${limit}`),

  /**
   * Execute live model evaluation benchmark on 40 test cases.
   */
  evaluate: (maxCases) =>
    apiCall('/evaluate', {
      method: 'POST',
      body: JSON.stringify({ maxCases }),
    }),

  /**
   * Fetch system & Gemini API operational health diagnostics.
   */
  health: () => apiCall('/health'),
};

export default api;
