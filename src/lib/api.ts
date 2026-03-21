const BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
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
  import: (houses: CreateHousePayload[]) =>
    request<{ created: number; skipped: number; skippedNumbers: string[] }>(
      '/houses/import',
      { method: 'POST', body: JSON.stringify({ houses }) },
    ),
  assignResidents: (id: string, userIds: string[]) =>
    request<import('@/types').House>(`/houses/${id}/residents`, {
      method: 'PATCH',
      body: JSON.stringify({ userIds }),
    }),
};

// ─── Meetings ─────────────────────────────────────────────────────────────────
export type CreateMeetingPayload = {
  title: string; description?: string; location: string;
  date: string; startTime: string; endTime?: string; minutes?: string;
};
export const meetingsApi = {
  getAll: () => request<import('@/types').Meeting[]>('/meetings'),
  create: (data: CreateMeetingPayload) => request<import('@/types').Meeting>('/meetings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateMeetingPayload>) => request<import('@/types').Meeting>(`/meetings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/meetings/${id}`, { method: 'DELETE' }),
};

// ─── Events ──────────────────────────────────────────────────────────────────
export type CreateEventPayload = {
  title: string; description?: string; greenArea: string;
  date: string; startTime: string; endTime?: string;
};
export const eventsApi = {
  getAll: () => request<import('@/types').GreenAreaEvent[]>('/events'),
  create: (data: CreateEventPayload) => request<import('@/types').GreenAreaEvent>('/events', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateEventPayload>) => request<import('@/types').GreenAreaEvent>(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/events/${id}`, { method: 'DELETE' }),
};

// ─── Notifications ─────────────────────────────────────────────────────────
export const notificationsApi = {
  getAll: () => request<import('@/types').Notification[]>('/notifications'),
  getUnreadCount: () => request<{ count: number }>('/notifications/unread-count'),
  markAsRead: (id: string) => request<void>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllAsRead: () => request<void>('/notifications/read-all', { method: 'PATCH' }),
};

// ─── Projects ────────────────────────────────────────────────────────────────
export type CreateProjectPayload = {
  name: string;
  description: string;
  completionPercentage?: number;
  status?: import('@/types').ProjectStatus;
  visibleToVecinos?: boolean;
};
export type UpdateProjectPayload = Partial<CreateProjectPayload>;

export const projectsApi = {
  getAll: () => request<import('@/types').Project[]>('/projects'),
  create: (data: CreateProjectPayload) =>
    request<import('@/types').Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateProjectPayload) =>
    request<import('@/types').Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
};

// ─── Dues Promotions ──────────────────────────────────────────────────────────
export type CreatePromotionPayload = {
  name: string;
  description?: string;
  monthCount: number;
  discountPercentage: number;
  validFrom: string;
  validTo: string;
  isActive?: boolean;
};
export const promotionsApi = {
  getActive: () => request<import('@/types').DuesPromotion[]>('/dues/promotions'),
  getAll: () => request<import('@/types').DuesPromotion[]>('/dues/promotions/all'),
  create: (data: CreatePromotionPayload) =>
    request<import('@/types').DuesPromotion>('/dues/promotions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreatePromotionPayload>) =>
    request<import('@/types').DuesPromotion>(`/dues/promotions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/dues/promotions/${id}`, { method: 'DELETE' }),
};

// ─── RSVPs ───────────────────────────────────────────────────────────────────
export type RsvpWithUser = import('@/types').Rsvp & {
  user?: { id: string; name: string; lastName: string; email: string; houseId?: string };
};

export const rsvpsApi = {
  getAll: () => request<import('@/types').Rsvp[]>('/rsvps'),
  upsert: (targetType: 'meeting' | 'event', targetId: string, status: import('@/types').RsvpStatus) =>
    request<import('@/types').Rsvp>('/rsvps', {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId, status }),
    }),
  remove: (targetType: 'meeting' | 'event', targetId: string) =>
    request<void>(`/rsvps/${targetType}/${targetId}`, { method: 'DELETE' }),
  getAttendance: (targetType: 'meeting' | 'event', targetId: string) =>
    request<RsvpWithUser[]>(`/rsvps/${targetType}/${targetId}/attendance`),
};

// ─── Dues ────────────────────────────────────────────────────────────────────
export const duesApi = {
  getConfig: () => request<import('@/types').DuesConfig>('/dues/config'),
  setConfig: (data: { amount: number }) =>
    request<import('@/types').DuesConfig>('/dues/config', { method: 'POST', body: JSON.stringify(data) }),
  getAll: () => request<import('@/types').DuesPayment[]>('/dues'),
  generate: (data: { month: number; year: number }) =>
    request<{ generated: number; exempt: number }>('/dues/generate', { method: 'POST', body: JSON.stringify(data) }),
  create: (data: { userId: string; month: number; year: number; status?: string; notes?: string; paidAt?: string }) =>
    request<import('@/types').DuesPayment>('/dues', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { status?: string; notes?: string; paidAt?: string }) =>
    request<import('@/types').DuesPayment>(`/dues/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getSummary: (month: number, year: number) =>
    request<import('@/types').DuesSummary>(`/dues/summary?month=${month}&year=${year}`),
  importPayments: (payments: { email: string; month: number; year: number; paidAt?: string; notes?: string }[]) =>
    request<{ created: number; updated: number; skipped: number; errors: string[] }>(
      '/dues/import',
      { method: 'POST', body: JSON.stringify({ payments }) },
    ),
};
