const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TOKEN_KEY = 'privadas_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const err = await res.json();
      message = err.message || message;
    } catch {}
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ access_token: string; user: import('@/types').User }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export type CreateUserPayload = {
  name: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  role?: string;
  houseId?: string;
};

export type UpdateUserPayload = Partial<
  Omit<CreateUserPayload, 'password'> & { password?: string; isActive?: boolean }
>;

export const usersApi = {
  getAll: () => request<import('@/types').User[]>('/users'),
  getOne: (id: string) => request<import('@/types').User>(`/users/${id}`),
  create: (data: CreateUserPayload) =>
    request<import('@/types').User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateUserPayload) =>
    request<import('@/types').User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),
};

// ─── Houses ───────────────────────────────────────────────────────────────────
export type CreateHousePayload = {
  houseNumber: string;
  address?: string;
  status?: 'active' | 'inactive';
};

export type UpdateHousePayload = Partial<CreateHousePayload>;

export const housesApi = {
  getAll: () => request<import('@/types').House[]>('/houses'),
  getOne: (id: string) => request<import('@/types').House>(`/houses/${id}`),
  create: (data: CreateHousePayload) =>
    request<import('@/types').House>('/houses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateHousePayload) =>
    request<import('@/types').House>(`/houses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    request<void>(`/houses/${id}`, { method: 'DELETE' }),
};

// ─── Dues ────────────────────────────────────────────────────────────────────
export const duesApi = {
  getConfig: () => request<import('@/types').DuesConfig>('/dues/config'),
  setConfig: (data: { amount: number }) =>
    request<import('@/types').DuesConfig>('/dues/config', { method: 'POST', body: JSON.stringify(data) }),
  getAll: () => request<import('@/types').DuesPayment[]>('/dues'),
  generate: (data: { month: number; year: number }) =>
    request<import('@/types').DuesPayment[]>('/dues/generate', { method: 'POST', body: JSON.stringify(data) }),
  create: (data: { userId: string; month: number; year: number; status?: string; notes?: string; paidAt?: string }) =>
    request<import('@/types').DuesPayment>('/dues', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { status?: string; notes?: string; paidAt?: string }) =>
    request<import('@/types').DuesPayment>(`/dues/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getSummary: (month: number, year: number) =>
    request<import('@/types').DuesSummary>(`/dues/summary?month=${month}&year=${year}`),
};
