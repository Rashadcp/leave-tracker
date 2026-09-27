// Determine API base URL dynamically for both local development and production
const getApiBase = () => {
  // 1. Explicit environment variable (e.g. if frontend is hosted on Vercel/Netlify separate from API)
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`;
  }
  // 2. In browser on custom domain or non-localhost: use relative '/api' (same origin / proxy)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return '/api';
    }
  }
  // 3. Local development fallback
  return 'http://localhost:5123/api';
};

const PRIMARY_BASE = getApiBase();
const BASES = [PRIMARY_BASE, 'http://localhost:5000/api'];
let activeBaseIndex = 0;

// High-performance in-memory cache for frequent read-heavy metadata
let leaveTypesCache = null;
let leaveTypesCacheExpiry = 0;
let holidaysCache = null;
let holidaysCacheExpiry = 0;
const CACHE_TTL_MS = 60000; // 60 seconds

export const invalidateQuotaCache = () => {
  leaveTypesCache = null;
  leaveTypesCacheExpiry = 0;
};

const apiFetch = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  const fetchOptions = { signal: controller.signal, ...options };

  try {
    const res = await fetch(`${BASES[activeBaseIndex]}${endpoint}`, fetchOptions);
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    // Switch to alternate port if primary fails
    activeBaseIndex = 1 - activeBaseIndex;
    return await fetch(`${BASES[activeBaseIndex]}${endpoint}`, options);
  }
};

export const api = {
  // Auth
  login: async (credentials) => {
    const res = await apiFetch(`/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Login failed');
    return result;
  },

  register: async (data) => {
    const res = await apiFetch(`/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Registration failed');
    return result;
  },

  forgotPassword: async (data) => {
    const res = await apiFetch(`/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to reset password');
    return result;
  },

  // HR user registration approvals
  getPendingUsers: async () => {
    const res = await apiFetch(`/admin/pending-users`);
    if (!res.ok) throw new Error('Failed to fetch pending users');
    return res.json();
  },

  approveUser: async (id, action) => {
    const res = await apiFetch(`/admin/approve-user/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update user approval');
    return result;
  },

  // Users & roles
  getUsers: async () => {
    const res = await apiFetch(`/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  // Dashboard for user
  getDashboard: async (userId) => {
    const res = await apiFetch(`/dashboard/${userId}`);
    if (!res.ok) throw new Error('Failed to load dashboard data');
    return res.json();
  },

  // Leave types with instant in-memory cache
  getLeaveTypes: async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && leaveTypesCache && now < leaveTypesCacheExpiry) {
      return leaveTypesCache;
    }
    const res = await apiFetch(`/leave-types`);
    if (!res.ok) throw new Error('Failed to load leave types');
    const data = await res.json();
    leaveTypesCache = data;
    leaveTypesCacheExpiry = now + CACHE_TTL_MS;
    return data;
  },

  createLeaveType: async (data) => {
    invalidateQuotaCache();
    const res = await apiFetch(`/leave-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to create quota type');
    return result;
  },

  updateLeaveType: async (id, data) => {
    invalidateQuotaCache();
    const res = await apiFetch(`/leave-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update quota type');
    return result;
  },

  deleteLeaveType: async (id) => {
    invalidateQuotaCache();
    const res = await apiFetch(`/leave-types/${id}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to delete quota type');
    return result;
  },

  // Holidays with instant cache
  getHolidays: async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && holidaysCache && now < holidaysCacheExpiry) {
      return holidaysCache;
    }
    const res = await apiFetch(`/holidays`);
    if (!res.ok) throw new Error('Failed to load holidays');
    const data = await res.json();
    holidaysCache = data;
    holidaysCacheExpiry = now + (CACHE_TTL_MS * 5); // 5 min TTL
    return data;
  },

  // Submit leave request
  submitLeave: async (data) => {
    const res = await apiFetch(`/requests/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to submit leave');
    return result;
  },

  // Submit late request
  submitLate: async (data) => {
    const res = await apiFetch(`/requests/late`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to submit late report');
    return result;
  },

  // My requests history
  getMyRequests: async (userId, type = 'all') => {
    const res = await apiFetch(`/requests/my/${userId}?type=${type}`);
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json();
  },

  // Cancel request
  cancelRequest: async (id, requestType, userId) => {
    const res = await apiFetch(`/requests/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType, userId })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to cancel request');
    return result;
  },

  // Approvals: Pending queue
  getPendingApprovals: async () => {
    const res = await apiFetch(`/approvals/pending`);
    if (!res.ok) throw new Error('Failed to fetch pending approvals');
    return res.json();
  },

  // Approver decision (Approve/Reject)
  submitDecision: async (id, data) => {
    const res = await apiFetch(`/approvals/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to submit decision');
    return result;
  },

  // Admin Monthly Consumption
  getAdminConsumption: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.department && params.department !== 'All') query.append('department', params.department);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiFetch(`/admin/consumption${qs}`);
    if (!res.ok) throw new Error('Failed to load consumption metrics');
    return res.json();
  },

  // Admin quick allocation
  updateAllocation: async (data) => {
    const res = await apiFetch(`/admin/allocate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update allocation');
    return result;
  },

  // Admin tracking (leave & late history and statistics)
  getAdminTracking: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.department && params.department !== 'All') query.append('department', params.department);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiFetch(`/admin/tracking${qs}`);
    if (!res.ok) throw new Error('Failed to load tracking data');
    return res.json();
  }
};
