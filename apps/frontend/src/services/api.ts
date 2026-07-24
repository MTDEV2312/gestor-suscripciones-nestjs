const API_BASE_URL = 'http://localhost:3000/api';

export interface User {
  id: string;
  username: string;
  email: string;
  telegramUsername?: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  user_id?: string;
}

export interface SubscriptionHistory {
  id: string;
  subscription_id: string;
  old_price?: number;
  new_price: number;
  old_frequency?: 'MONTHLY' | 'YEARLY';
  new_frequency: 'MONTHLY' | 'YEARLY';
  currency: string;
  effective_date: string;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at?: string;
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
  type?: 'SUBSCRIPTION' | 'DOMAIN' | 'HOSTING';
  tags?: Tag[];
  tagIds?: string[];
}

export interface DashboardInfo {
  monthlySpending: number;
  yearlySpending: number;
  nextRenewal: { name: string; date: string }[];
  preferredCurrency?: string;
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
    list: (tagId?: string) => request<Subscription[]>(`/subscriptions${tagId ? `?tagId=${tagId}` : ''}`),
    get: (id: string) => request<Subscription>(`/subscriptions/${id}`),
    getHistory: (id: string) => request<SubscriptionHistory[]>(`/subscriptions/${id}/history`),
    create: (body: Omit<Subscription, 'id' | 'is_active'> & { tagIds?: string[] }) => request<Subscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    update: (id: string, body: Partial<Subscription> & { tagIds?: string[] }) => request<Subscription>(`/subscriptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    delete: (id: string) => request<void>(`/subscriptions/${id}`, {
      method: 'DELETE',
    }),
  },
  tags: {
    list: () => request<Tag[]>('/tags'),
    create: (body: { name: string; color?: string }) => request<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    delete: (id: string) => request<void>(`/tags/${id}`, {
      method: 'DELETE',
    }),
  },
  currency: {
    getAdminRates: () => request<ExchangeRate[]>('/admin/exchange-rates'),
    updateAdminRate: (body: { base_currency: string; target_currency: string; rate: number }) => request<ExchangeRate>('/admin/exchange-rates', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
    convert: (amount: number, from: string, to: string) => request<{ amount: number; from: string; to: string; converted: number }>(`/currency/convert?amount=${amount}&from=${from}&to=${to}`),
  },
  dashboard: {
    getInfo: (currency?: string) => request<DashboardInfo>(`/dashboard${currency ? `?currency=${currency}` : ''}`),
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
