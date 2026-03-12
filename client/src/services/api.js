import axios from 'axios';

// In development, Vite proxies /api to http://localhost:5000
// In production, set VITE_API_URL to your backend URL
const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30s — Groq API calls can take a few seconds
});

// Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('voxpath_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== Sessions ====================

export const createSession = (data) =>
  api.post('/sessions', data).then((res) => res.data);

export const getSession = (id) =>
  api.get(`/sessions/${id}`).then((res) => res.data);

export const updateSession = (id, data) =>
  api.put(`/sessions/${id}`, data).then((res) => res.data);

export const getAllSessions = () =>
  api.get('/sessions').then((res) => res.data);

// ==================== Scoring ====================

export const scoreAnswer = (question, answer) =>
  api.post('/score', { question, answer }).then((res) => res.data);

export const analyzeFillers = (transcript, durationSeconds) =>
  api.post('/score/filler', { transcript, durationSeconds }).then((res) => res.data);

// ==================== Reports ====================

export const generateReport = (sessionId) =>
  api.post('/reports', { sessionId }).then((res) => res.data);

export const getReport = (sessionId) =>
  api.get(`/reports/${sessionId}`).then((res) => res.data);

// ==================== Health ====================

export const checkHealth = () =>
  api.get('/health').then((res) => res.data);

// ==================== Auth ====================

export const loginUser = (email, password) =>
  api.post('/auth/login', { email, password }).then((res) => res.data);

export const registerUser = (name, email, password) =>
  api.post('/auth/register', { name, email, password }).then((res) => res.data);

export default api;
