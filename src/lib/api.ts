/**
 * Django REST API client for الجسد الواحد
 */

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';

const ACCESS_KEY = 'aljasad_access';
const REFRESH_KEY = 'aljasad_refresh';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const data = await res.json();
    if (data.access) {
      localStorage.setItem(ACCESS_KEY, data.access);
      if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh);
      return data.access as string;
    }
    return null;
  } catch {
    clearTokens();
    return null;
  }
}

type RequestOptions = RequestInit & { auth?: boolean; skipRefresh?: boolean };

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { auth = false, skipRefresh = false, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders || {});

  if (!headers.has('Content-Type') && rest.body && !(rest.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth || getAccessToken()) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  let res = await fetch(url, { ...rest, headers });

  // Try one token refresh on 401
  if (res.status === 401 && !skipRefresh && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(url, { ...rest, headers });
    }
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const detail =
      (data as { detail?: string })?.detail ||
      (typeof data === 'object' && data !== null
        ? JSON.stringify(data)
        : `HTTP ${res.status}`);
    throw new ApiError(String(detail), res.status, data);
  }

  return data as T;
}

/** Unwrap DRF paginated or plain list responses */
export function unwrapList<T>(data: T[] | { results: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { results: T[] }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

// ── Auth ──────────────────────────────────────────────────────────

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin';
  phone?: string;
  createdAt: string;
  isSuperuser?: boolean;
  isStaff?: boolean;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipRefresh: true,
    }),

  register: (payload: {
    email: string;
    password: string;
    password_confirm: string;
    displayName?: string;
    phone?: string;
  }) =>
    apiRequest<AuthResponse>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipRefresh: true,
    }),

  google: (payload: {
    credential?: string;
    id_token?: string;
    access_token?: string;
    code?: string;
    redirect_uri?: string;
  }) =>
    apiRequest<AuthResponse>('/auth/google/', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipRefresh: true,
    }),

  profile: () =>
    apiRequest<AuthUser>('/auth/profile/', { auth: true }),

  updateProfile: (payload: Partial<{ displayName: string; photoURL: string; phone: string }>) =>
    apiRequest<AuthUser>('/auth/profile/', {
      method: 'PATCH',
      auth: true,
      body: JSON.stringify(payload),
    }),

  changePassword: (old_password: string, new_password: string) =>
    apiRequest<{ message: string }>('/auth/password/change/', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ old_password, new_password }),
    }),

  googleConfig: () =>
    apiRequest<{
      googleClientId: string | null;
      googleEnabled: boolean;
      authMode?: string;
    }>('/auth/google/config/'),

  logout: () =>
    apiRequest<{ message: string }>('/auth/logout/', { method: 'POST', auth: true }).catch(() => ({
      message: 'ok',
    })),
};

// ── Projects & Donations ──────────────────────────────────────────

export interface ApiProject {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  imageUrl: string;
  creatorId: string;
  creatorName: string;
  isPublic: boolean;
  status: 'pending' | 'active' | 'inactive' | 'completed' | 'rejected';
  createdAt: string;
  endDate?: string | null;
  donorCount: number;
  adminNotes?: string;
}

export interface ApiDonation {
  id: string;
  projectId: string;
  projectTitle: string;
  amount: number;
  donorId?: string | null;
  donorName?: string;
  donorPhone?: string;
  isAnonymous: boolean;
  createdAt: string;
  status: 'success' | 'pending' | 'failed';
  paymentMethod?: string;
  bankAccountId?: number | null;
  bankAccountName?: string;
  hasReceipt?: boolean;
  receiptImage?: string | null;
  reviewedAt?: string | null;
}

export const projectsApi = {
  list: (params?: { category?: string; status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return apiRequest<ApiProject[] | { results: ApiProject[] }>(
      `/projects/${qs ? `?${qs}` : ''}`,
    ).then(unwrapList);
  },

  get: (id: string) => apiRequest<ApiProject>(`/projects/${id}/`),

  create: (payload: {
    title: string;
    description: string;
    category: string;
    targetAmount: number;
    isPublic: boolean;
    imageUrl?: string;
  }) =>
    apiRequest<ApiProject>('/projects/', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    }),

  mine: () =>
    apiRequest<ApiProject[] | { results: ApiProject[] }>('/projects/mine/', { auth: true }).then(
      unwrapList,
    ),
};

export const donationsApi = {
  list: (projectId?: string) => {
    const qs = projectId ? `?projectId=${projectId}` : '';
    return apiRequest<ApiDonation[] | { results: ApiDonation[] }>(`/donations/${qs}`).then(
      unwrapList,
    );
  },

  mine: () =>
    apiRequest<ApiDonation[] | { results: ApiDonation[] }>('/donations/mine/', { auth: true }).then(
      unwrapList,
    ),

  create: (payload: {
    projectId: number | string;
    amount: number;
    isAnonymous?: boolean;
    receiptImage: string;
    bankAccountId?: number | null;
    donorName?: string;
    donorPhone?: string;
  }) =>
    apiRequest<ApiDonation>('/donations/create/', {
      method: 'POST',
      auth: !!getAccessToken(),
      body: JSON.stringify({
        projectId: Number(payload.projectId),
        amount: payload.amount,
        isAnonymous: payload.isAnonymous ?? false,
        receiptImage: payload.receiptImage,
        bankAccountId: payload.bankAccountId ?? null,
        donorName: payload.donorName,
        donorPhone: payload.donorPhone,
      }),
    }),
};

// ── Admin control API ─────────────────────────────────────────

export interface AdminDashboardStats {
  projects: {
    total: number;
    pending: number;
    active: number;
    inactive: number;
    completed: number;
    rejected: number;
  };
  donations: {
    total: number;
    pending: number;
    success: number;
    failed: number;
    verifiedSum: number;
    pendingSum: number;
  };
  transfers: {
    total: number;
    pending: number;
    pendingSum: number;
    approved: number;
  };
  users: { total: number; active: number; staff: number; superusers: number };
  notificationsUnread: number;
  messagesNew: number;
  byCategory: { category: string; count: number; raised: number }[];
  dailyDonations: { day: string | null; total: number; count: number }[];
  bankAccounts: number;
}

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  role: string;
  isActive: boolean;
  isStaff: boolean;
  isSuperuser: boolean;
  dateJoined: string;
  lastLogin: string | null;
  projectsCount: number;
  donationsCount: number;
}

export interface AdminNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  relatedId: number | null;
  createdAt: string;
}

export interface AdminTransfer {
  id: number;
  donationType: string;
  amount: number;
  donorName: string;
  donorPhone: string;
  status: string;
  receiptImage: string;
  projectId: number | null;
  projectTitle: string;
  bankAccountName: string;
  createdAt: string;
  adminNotes: string;
}

export interface AdminReport {
  generatedAt: string;
  siteName: string;
  summary: {
    projectsTotal: number;
    projectsActive: number;
    projectsPending: number;
    donationsVerified: number;
    donationsPending: number;
    totalRaised: number;
    usersTotal: number;
  };
  projects: {
    id: number;
    title: string;
    category: string;
    status: string;
    target: number;
    raised: number;
    progress: number;
    donors: number;
    creator: string;
    createdAt: string;
  }[];
  recentDonations: {
    id: number;
    project: string;
    amount: number;
    donor: string;
    status: string;
    createdAt: string;
  }[];
  byCategory: { category: string; count: number; raised: number; target: number }[];
}

export const adminApi = {
  dashboard: () => apiRequest<AdminDashboardStats>('/admin/dashboard/', { auth: true }),
  projects: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return apiRequest<ApiProject[]>(`/admin/projects/${qs ? `?${qs}` : ''}`, { auth: true });
  },
  projectAction: (id: string | number, action: string, adminNotes?: string) =>
    apiRequest<ApiProject>(`/admin/projects/${id}/${action}/`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ adminNotes }),
    }),
  donations: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return apiRequest<ApiDonation[]>(`/admin/donations/${qs}`, { auth: true });
  },
  donationAction: (id: string | number, action: string, adminNotes?: string) =>
    apiRequest<ApiDonation>(`/admin/donations/${id}/${action}/`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ adminNotes }),
    }),
  transfers: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return apiRequest<AdminTransfer[]>(`/admin/transfers/${qs}`, { auth: true });
  },
  transferAction: (id: number, action: string, adminNotes?: string) =>
    apiRequest<{ id: number; status: string }>(`/admin/transfers/${id}/${action}/`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ adminNotes }),
    }),
  users: (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiRequest<AdminUser[]>(`/admin/users/${qs}`, { auth: true });
  },
  updateUser: (
    id: string | number,
    payload: Partial<{
      isActive: boolean;
      role: string;
      isStaff: boolean;
      displayName: string;
      phone: string;
    }>,
  ) =>
    apiRequest(`/admin/users/${id}/`, {
      method: 'PATCH',
      auth: true,
      body: JSON.stringify(payload),
    }),
  banks: () => apiRequest<SiteBankAccount[]>('/admin/banks/', { auth: true }),
  createBank: (payload: Partial<SiteBankAccount> & { bankName: string; accountNumber: string }) =>
    apiRequest<SiteBankAccount>('/admin/banks/', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    }),
  updateBank: (id: number, payload: Partial<SiteBankAccount>) =>
    apiRequest<SiteBankAccount>(`/admin/banks/${id}/`, {
      method: 'PATCH',
      auth: true,
      body: JSON.stringify(payload),
    }),
  deleteBank: (id: number) =>
    apiRequest(`/admin/banks/${id}/`, { method: 'DELETE', auth: true }),
  notifications: () =>
    apiRequest<{ unread: number; items: AdminNotification[] }>('/admin/notifications/', {
      auth: true,
    }),
  markNotificationsRead: (payload: { all?: boolean; ids?: number[] }) =>
    apiRequest<{ ok: boolean; unread: number }>('/admin/notifications/', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    }),
  reports: () => apiRequest<AdminReport>('/admin/reports/', { auth: true }),
};

export const healthApi = () => apiRequest<{ status: string }>('/health/');

// ── Site settings (from Django admin) ─────────────────────

export interface SiteBankAccount {
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  branch: string;
  currency: string;
  instructions: string;
  isPrimary: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  aboutText: string;
  mission: string;
  vision: string;
  heroTitle: string;
  heroSubtitle: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  logoUrl: string;
  footerText: string;
  statsDonors: string;
  statsProjects: string;
  statsStates: string;
  maintenanceMode: boolean;
  bankAccounts: SiteBankAccount[];
  announcements: { id: number; title: string; body: string; linkUrl: string }[];
}

export const siteApi = {
  settings: () => apiRequest<SiteSettings>('/settings/'),
  categories: () => apiRequest<string[]>('/categories/'),
};
