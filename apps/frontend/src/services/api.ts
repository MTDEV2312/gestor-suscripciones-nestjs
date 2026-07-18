const API_BASE_URL = 'http://localhost:3000/api';

export interface User {
  id: string;
  username: string;
  email: string;
  telegramUsername?: string;
}

export interface Subscription {
  id: string;
  name: string;
  price: number;
  currency: string;
  frequency: 'MONTHLY' | 'YEARLY';
  start_date: string;
  next_renewal_date: string;
  is_active: boolean;
}

export interface DashboardInfo {
  monthlySpending: number;
  yearlySpending: number;
  nextRenewal: { name: string; date: string }[];
}

export const getToken = (): string | null => localStorage.getItem('token');
export const setToken = (token: string): void => localStorage.setItem('token', token);
export const removeToken = (): void => localStorage.removeItem('token');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  auth: {
    login: (body: any) => request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    register: (body: any) => request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  },
  subscriptions: {
    list: () => request<Subscription[]>('/subscriptions'),
    get: (id: string) => request<Subscription>(`/subscriptions/${id}`),
    create: (body: Omit<Subscription, 'id' | 'is_active'>) => request<Subscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    update: (id: string, body: Partial<Subscription>) => request<Subscription>(`/subscriptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    delete: (id: string) => request<void>(`/subscriptions/${id}`, {
      method: 'DELETE',
    }),
  },
  dashboard: {
    getInfo: () => request<DashboardInfo>('/dashboard'),
  },
  user: {
    me: () => request<User>('/users/me'),
    update: (body: { telegramUsername?: string; username?: string; email?: string }) => request<User>('/users', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    delete: () => request<void>('/users', {
      method: 'DELETE',
    }),
  },
};
