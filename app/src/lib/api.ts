const BASE = '/api';

let token: string | null = localStorage.getItem('dockform_token');

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('dockform_token', t);
  else localStorage.removeItem('dockform_token');
}

export function getToken() { return token; }

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...opts.headers as Record<string, string> };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) => request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (email: string, password: string, fullName?: string) => request<{ token: string; user: any }>('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, fullName }) }),

  // Dashboard
  dashboard: () => request<{ stats: any; recentForms: any[] }>('/dashboard'),

  // CRUD
  getCompanies: () => request<any[]>('/companies'),
  createCompany: (data: any) => request<any>('/companies', { method: 'POST', body: JSON.stringify(data) }),

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
  createUser: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),

  getForms: () => request<any[]>('/forms'),
  getForm: (id: string) => request<any>(`/forms/${id}`),
  createForm: (data: any) => request<any>('/forms', { method: 'POST', body: JSON.stringify(data) }),
  updateForm: (id: string, data: any) => request<any>(`/forms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteForm: (id: string) => request<void>(`/forms/${id}`, { method: 'DELETE' }),

  getResponses: () => request<any[]>('/responses'),
  createResponse: (data: any) => request<any>('/responses', { method: 'POST', body: JSON.stringify(data) }),
};
