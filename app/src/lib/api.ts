const BASE = '/api';

let token: string | null = localStorage.getItem('dockform_token');

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('dockform_token', t);
  else localStorage.removeItem('dockform_token');
}

export function getToken() { return token; }

// Decodes the JWT payload locally (no network call, no signature verification) purely to
// rehydrate the client's own auth state (userId/roleKey/companyId) on a cold boot -- the
// server independently verifies the signature on every request, so this never grants
// access on its own; it only lets the offline-first shell render as "logged in" instead of
// bouncing to the login screen just because there's no connection to re-check with.
export function decodeToken(t: string): { userId: string; roleKey: string; companyId: string | null } | null {
  try {
    const payload = t.split('.')[1];
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const json = atob(base64);
    const decoded = JSON.parse(json);
    if (!decoded.userId) return null;
    return { userId: decoded.userId, roleKey: decoded.roleKey || 'viewer', companyId: decoded.companyId ?? null };
  } catch {
    return null;
  }
}

// Fires once, the first time any request gets a 401 (expired/invalid token) -- rather than
// every call site checking this individually. Bounces to the login screen without touching
// anything an offline queue may have pending, so a stale token surfaced by a background
// sync attempt doesn't silently drop queued work.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...opts.headers as Record<string, string> };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    if (res.status === 401 && token) {
      setToken(null);
      onUnauthorized?.();
    }
    const body = await res.json().catch(() => ({}));
    const message = [body.error, body.detail].filter(Boolean).join(': ');
    throw new Error(message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) => request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (email: string, password: string, fullName?: string, inviteToken?: string) => request<{ token: string; user: any; pending?: boolean; message?: string }>('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, fullName, inviteToken }) }),
  forgotPassword: (email: string) => request<{ ok: boolean }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) => request<{ ok: boolean }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

  // Dashboard
  dashboard: () => request<{ stats: any; recentForms: any[] }>('/dashboard'),

  // CRUD
  getCompanies: () => request<any[]>('/companies'),
  createCompany: (data: any) => request<any>('/companies', { method: 'POST', body: JSON.stringify(data) }),
  updateCompanyStatus: (id: string, status: string) => request<any>(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getPlants: () => request<any[]>('/plants'),
  createPlant: (data: any) => request<any>('/plants', { method: 'POST', body: JSON.stringify(data) }),

  getDepartments: () => request<any[]>('/departments'),
  createDepartment: (data: any) => request<any>('/departments', { method: 'POST', body: JSON.stringify(data) }),

  getTeams: () => request<any[]>('/teams'),
  createTeam: (data: any) => request<any>('/teams', { method: 'POST', body: JSON.stringify(data) }),

  getRoles: () => request<any[]>('/roles'),

  getPermissions: () => request<Record<string, any[]>>('/permissions'),
  updatePermission: (id: string, data: any) => request<any>(`/permissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getUsers: () => request<any[]>('/users'),
  inviteUser: (email: string, fullName: string, roleId?: string) => request<any>('/users', { method: 'POST', body: JSON.stringify({ email, fullName, roleId }) }),
  updateUserStatus: (id: string, status: string) => request<any>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateUserAvailability: (id: string, availabilityStatus: string) => request<any>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ availabilityStatus }) }),
  updateUserDetails: (id: string, data: { fullName?: string; email?: string; roleId?: string; plantId?: string | null; departmentId?: string | null; teamId?: string | null }) =>
    request<any>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),

  getTrades: () => request<{ id: string; name: string; status: string }[]>('/trades'),
  createTrade: (name: string) => request<{ id: string; name: string; status: string }>('/trades', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteTrade: (id: string) => request<void>(`/trades/${id}`, { method: 'DELETE' }),
  getUserTrades: (userId: string) => request<{ id: string; name: string }[]>(`/trades/user/${userId}`),
  setUserTrades: (userId: string, tradeIds: string[]) => request<void>(`/trades/user/${userId}`, { method: 'PUT', body: JSON.stringify({ tradeIds }) }),

  getForms: () => request<any[]>('/forms'),
  getForm: (id: string) => request<any>(`/forms/${id}`),
  createForm: (data: any) => request<any>('/forms', { method: 'POST', body: JSON.stringify(data) }),
  updateForm: (id: string, data: any) => request<any>(`/forms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateFormAssignment: (id: string, assignedUserIds: string[]) => request<any>(`/forms/${id}/assignment`, { method: 'PATCH', body: JSON.stringify({ assignedUserIds }) }),
  deleteForm: (id: string) => request<void>(`/forms/${id}`, { method: 'DELETE' }),

  uploadPhoto: (dataUrl: string) => request<{ key: string; url: string }>('/uploads', { method: 'POST', body: JSON.stringify({ dataUrl }) }),

  getResponses: () => request<any[]>('/responses'),
  getResponsesPage: (params: { page: number; limit: number; search?: string; status?: string; formId?: string }) => {
    const q = new URLSearchParams();
    q.set('page', String(params.page));
    q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    if (params.formId) q.set('formId', params.formId);
    return request<{ items: any[]; total: number }>(`/responses/page?${q.toString()}`);
  },
  getFullResponsesForForm: (formId: string) => request<any[]>(`/responses/full?formId=${encodeURIComponent(formId)}`),
  getResponse: (id: string) => request<any>(`/responses/${id}`),
  createResponse: (data: any) => request<any>('/responses', { method: 'POST', body: JSON.stringify(data) }),
  updateResponse: (id: string, data: any) => request<any>(`/responses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getResponseComments: (id: string) => request<{ id: string; fieldId: string | null; instanceId: string | null; text: string; authorName: string; resolved: boolean; createdAt: string }[]>(`/responses/${id}/comments`),

  analyzePhoto: (photo: string, context?: string) => request<{ comment: string }>('/ai/analyze-photo', { method: 'POST', body: JSON.stringify({ photo, context }) }),
  comparePhotos: (before: string, after: string, context?: string) => request<{ comment: string }>('/ai/compare-photos', { method: 'POST', body: JSON.stringify({ before, after, context }) }),
  scoreChecklistPhoto: (photo: string, items: { id: string; text: string; direction: 'present' | 'absent' }[], context?: string) =>
    request<{ results: { itemId: string; found: boolean; note: string }[] }>('/ai/score-checklist-photo', { method: 'POST', body: JSON.stringify({ photo, items, context }) }),
  generateForm: (prompt: string, context?: string, previousFields?: any[]) =>
    request<{ summary: string; fields: any[] }>('/ai/generate-form', { method: 'POST', body: JSON.stringify({ prompt, context, previousFields }) }),

  // Email (best-effort, errors silently ignored)
  sendWelcomeEmail: (to: string, fullName: string) =>
    fetch(`${BASE}/email/welcome`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, fullName }) }).catch(() => {}),
  sendAccountApprovedEmail: (to: string, fullName: string, plan: string) =>
    fetch(`${BASE}/email/account-approved`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, fullName, plan }) }).catch(() => {}),
  sendAccountSuspendedEmail: (to: string, fullName: string) =>
    fetch(`${BASE}/email/account-suspended`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, fullName }) }).catch(() => {}),
  sendFormAssignedEmail: (to: string, fullName: string, formName: string, assignedBy: string, formId?: string) =>
    fetch(`${BASE}/email/form-assigned`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, fullName, formName, assignedBy, formId }) }).catch(() => {}),
  sendInviteEmail: (to: string, fullName: string) =>
    fetch(`${BASE}/email/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, fullName }) }).catch(() => {}),
};
