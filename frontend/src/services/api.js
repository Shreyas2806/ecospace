/**
 * @fileoverview Centralised Axios API client for EcoSphere AI.
 *
 * All HTTP communication with the backend goes through this module.
 * Components should import named service functions rather than calling
 * axios directly, keeping network concerns out of UI logic.
 *
 * @module services/api
 */

import axios from 'axios';

// ── Axios instance ────────────────────────────────────────────────────────────

/** Shared Axios instance pre-configured with the API base URL.
 *
 * Normalisation: Regardless of whether VITE_API_URL is set to
 *   "https://backend.onrender.com"  or
 *   "https://backend.onrender.com/api"
 * the baseURL will always resolve to the /api-suffixed form so that service
 * paths like "/auth/register" correctly reach "/api/auth/register".
 */
const _rawBase = import.meta.env.VITE_API_URL || 'https://ecosphere-backend-inlv.onrender.com';
const _apiBase = _rawBase.replace(/\/api\/?$/, '').replace(/\/$/, '') + '/api';

const apiClient = axios.create({
  baseURL: _apiBase,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Request interceptor — attaches the JWT token from localStorage to every
 * outgoing request if one is available.
 */
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Register a new user account.
 * @param {{ name: string, email: string, password: string, role?: string }} payload
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const registerUser = (payload) => apiClient.post('/auth/register', payload);

/**
 * Authenticate with email and password.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const loginUser = (credentials) => apiClient.post('/auth/login', credentials);

/**
 * Request a password-reset email.
 * @param {string} email
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const forgotPassword = (email) => apiClient.post('/auth/forgot-password', { email });

/**
 * Fetch the authenticated user's full profile (includes badges and goals).
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const fetchProfile = () => apiClient.get('/auth/profile');

// ── Dashboard ─────────────────────────────────────────────────────────────────

/**
 * Fetch the current user's dashboard summary (emissions, trends, goals).
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const fetchDashboard = () => apiClient.get('/dashboard');

// ── Activities ────────────────────────────────────────────────────────────────

/**
 * Retrieve the user's activity history, optionally filtered by category.
 * @param {string} [category] - Optional category filter.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const fetchActivities = (category) => {
  const params = category ? { category } : {};
  return apiClient.get('/activities', { params });
};

/**
 * Log a new carbon activity.
 * @param {{ category: string, activity_type: string, value: number }} payload
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const logActivity = (payload) => apiClient.post('/activities', payload);

// ── Mobility ──────────────────────────────────────────────────────────────────

/**
 * Compare transport alternatives for a given distance and current mode.
 * @param {{ distance_km: number, current_mode: string }} payload
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const fetchMobilityAlternatives = (payload) => apiClient.post('/mobility/recommend', payload);

// ── Coach ─────────────────────────────────────────────────────────────────────

/**
 * Fetch personalised AI coaching tips for the authenticated user.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const fetchCoachTips = () => apiClient.get('/coach/tips');

// ── Simulator ─────────────────────────────────────────────────────────────────

/**
 * Run the carbon-reduction simulator with the provided parameters.
 * @param {Object} params - Simulation input parameters.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const runSimulation = (params) => apiClient.post('/simulator/simulate', params);

// ── Predictions ───────────────────────────────────────────────────────────────

/**
 * Fetch ML-powered carbon emission forecasts.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const fetchPredictions = () => apiClient.get('/predictions');

// ── Gamification ──────────────────────────────────────────────────────────────

/**
 * Fetch the user's sustainability goals.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const fetchGoals = () => apiClient.get('/gamification/goals');

/**
 * Create a new sustainability goal.
 * @param {{ title: string, category: string, target_reduction_pct: number, target_date: string }} payload
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const createGoal = (payload) => apiClient.post('/gamification/goals', payload);

/**
 * Mark a goal as completed.
 * @param {number} goalId - The goal's primary key.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const completeGoal = (goalId) => apiClient.patch(`/gamification/goals/${goalId}/complete`);

/**
 * Fetch unlocked badges for the authenticated user.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const fetchBadges = () => apiClient.get('/gamification/badges');

/**
 * Fetch the global green-score leaderboard.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const fetchLeaderboard = () => apiClient.get('/gamification/leaderboard');

/**
 * Fetch in-app notifications.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const fetchNotifications = () => apiClient.get('/gamification/notifications');

/**
 * Mark all unread notifications as read.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const markNotificationsRead = () => apiClient.post('/gamification/notifications/read');

// ── Admin ─────────────────────────────────────────────────────────────────────

/**
 * Fetch platform-wide admin analytics (admin role required).
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const fetchAdminAnalytics = () => apiClient.get('/admin/analytics');

/**
 * Fetch all registered users (admin role required).
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const fetchAllUsers = () => apiClient.get('/admin/users');

/**
 * Delete a user account (admin role required).
 * @param {number} userId - Primary key of the user to remove.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const deleteUser = (userId) => apiClient.delete(`/admin/users/${userId}`);

/**
 * Generate a platform-wide activity report (admin role required).
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const generateReport = () => apiClient.get('/admin/report');

export default apiClient;
