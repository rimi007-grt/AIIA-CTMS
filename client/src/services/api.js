// Centralized API client for AIIA CTMS
// In production on AWS/Render or behind reverse proxy, defaults to relative /api
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('aiia_ctms_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    if (!response.ok) {
      throw new Error('Failed to download CSV export');
    }
    return response.blob();
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Server request failed');
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => apiRequest('/auth/me'),
  getDemoUsers: () => apiRequest('/auth/demo-users'),
  demoLogin: (payload) => apiRequest('/auth/demo-login', { method: 'POST', body: JSON.stringify(payload) }),
  forgotPassword: (email) => apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (payload) => apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),

  // Dashboard
  getDashboardKPIs: (scope = 'all') => apiRequest(`/dashboard/kpis?scope=${scope}`),

  // Trials
  getTrials: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/trials?${q}`);
  },
  getTrialById: (id) => apiRequest(`/trials/${id}`),
  createTrial: (trialData) => apiRequest('/trials', { method: 'POST', body: JSON.stringify(trialData) }),
  updateTrial: (id, trialData) => apiRequest(`/trials/${id}`, { method: 'PUT', body: JSON.stringify(trialData) }),
  updateTrialStage: (id, stage) => apiRequest(`/trials/${id}/stage`, { method: 'PUT', body: JSON.stringify({ stage }) }),
  updateTrialEthics: (id, ethicsData) => apiRequest(`/trials/${id}/ethics`, { method: 'PUT', body: JSON.stringify(ethicsData) }),
  deleteTrial: (id) => apiRequest(`/trials/${id}`, { method: 'DELETE' }),

  // Safety / Adverse Events
  getAdverseEvents: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/safety?${q}`);
  },
  getSafetyKPIs: (scope = 'all') => apiRequest(`/safety/kpis?scope=${scope}`),
  getMeddraTerms: () => apiRequest('/safety/meddra-terms'),
  reportAdverseEvent: (aeData) => apiRequest('/safety', { method: 'POST', body: JSON.stringify(aeData) }),
  updateAdverseEvent: (id, aeData) => apiRequest(`/safety/${id}`, { method: 'PUT', body: JSON.stringify(aeData) }),

  // Protocol Deviations
  getDeviations: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/deviations?${q}`);
  },
  flagDeviation: (data) => apiRequest('/deviations', { method: 'POST', body: JSON.stringify(data) }),
  resolveDeviation: (id, data) => apiRequest(`/deviations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Audit
  getAuditLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/audit?${q}`);
  },
  verifyAudit: () => apiRequest('/audit/verify'),
  tamperAuditTest: () => apiRequest('/audit/tamper-test', { method: 'POST' }),
  restoreAudit: () => apiRequest('/audit/restore', { method: 'POST' }),


  // Export
  exportTrialsJSON: () => apiRequest('/export/trials?format=json'),
  exportSafetyJSON: () => apiRequest('/export/safety?format=json'),
  exportTrialsCSV: () => apiRequest('/export/trials?format=csv'),
  exportSafetyCSV: () => apiRequest('/export/safety?format=csv'),

  // Users
  getUsers: () => apiRequest('/users'),
  updateUserRole: (id, data) => apiRequest(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: (limit = 50) => apiRequest(`/notifications?limit=${limit}`),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),
  deleteNotification: (id) => apiRequest(`/notifications/${id}`, { method: 'DELETE' }),

  // Alert Rules Engine (Gap 3)
  getAlertRules: () => apiRequest('/alerts/rules'),
  createAlertRule: (rule) => apiRequest('/alerts/rules', { method: 'POST', body: JSON.stringify(rule) }),
  updateAlertRule: (id, rule) => apiRequest(`/alerts/rules/${id}`, { method: 'PUT', body: JSON.stringify(rule) }),
  deleteAlertRule: (id) => apiRequest(`/alerts/rules/${id}`, { method: 'DELETE' }),

  // Informed Consent & DPDP Act (Gap 15)
  getConsents: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/consent?${q}`);
  },
  recordConsent: (consentData) => apiRequest('/consent', { method: 'POST', body: JSON.stringify(consentData) }),
  withdrawConsent: (id, withdrawalData) => apiRequest(`/consent/${id}/withdraw`, { method: 'POST', body: JSON.stringify(withdrawalData) }),
  getDpdpBreaches: () => apiRequest('/consent/dpdp/breach-log'),

  // 21 CFR Part 11 Electronic Signature (Gap 16)
  eSignRecord: (payload) => apiRequest('/audit/e-sign', { method: 'POST', body: JSON.stringify(payload) }),
  getSignatures: (recordType, recordId) => apiRequest(`/audit/signatures/${recordType}/${recordId}`),
  getAllSignatures: () => apiRequest('/audit/signatures'),

  // CDISC & FHIR Standards (Gaps 7, 8, 17)
  getCDISCMapping: () => apiRequest('/export/cdisc/mapping'),
  getFHIRR4Bundle: () => apiRequest('/export/fhir/r4/bundle'),
  ingestFHIR: (payload) => apiRequest('/export/fhir/ingest', { method: 'POST', body: JSON.stringify(payload) }),
  exportSDTM_DM: () => apiRequest('/export/sdtm/dm'),
  exportSDTM_VS: () => apiRequest('/export/sdtm/vs'),
  exportSDTM_EX: () => apiRequest('/export/sdtm/ex'),
  exportDefineXML: () => apiRequest('/export/define-xml'),

  // Medical Dictionaries & Statutory Timelines (Gaps 11, 12, 13)
  getWhoDrugTerms: () => apiRequest('/safety/whodrug-terms'),
  searchDictionary: (query, dict = 'all') => apiRequest(`/safety/dictionary-search?query=${encodeURIComponent(query)}&dict=${dict}`),
  getStatutoryTimelines: () => apiRequest('/safety/statutory-timelines'),

  // ABDM Integration (Gap 9)
  getABDMStatus: () => apiRequest('/abdm/status'),
  verifyABHA: (data) => apiRequest('/abdm/verify-abha', { method: 'POST', body: JSON.stringify(data) }),
  getEDCConnectors: () => apiRequest('/abdm/edc/connectors'),

  // Institutional Leadership & Compliance (Gaps 4, 5, 18)
  getLeadershipDashboard: () => apiRequest('/dashboard/leadership'),
  getDashboardHeartbeat: () => apiRequest('/dashboard/heartbeat'),
  getRBACMatrix: () => apiRequest('/compliance/rbac-matrix'),
  getCERTInCompliance: () => apiRequest('/compliance/cert-in')
};

