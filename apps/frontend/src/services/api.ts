const API_BASE_URL = 'http://localhost:3000/api';

export interface User {
  id: string;
  username: string;
  email: string;
  telegramUsername?: string;
  notificationHour?: number;
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

export interface SubscriptionPayment {
  id: string;
  user_id: string;
  subscription_id?: string | null;
  subscription_name: string;
  amount: number;
  currency: string;
  payment_date: string;
  billing_month: number;
  billing_year: number;
  billing_period: string;
  payment_method?: string | null;
  status: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  subscription?: Subscription | null;
}

export interface MonthlyBreakdownItem {
  period: string;
  year: number;
  month: number;
  total_amount: number;
  transaction_count: number;
}

export interface ExpenseReportResponse {
  total_spent: number;
  target_currency: string;
  paid_count: number;
  subscriptions_count: number;
  currency_breakdown: Record<string, number>;
  monthly_breakdown: MonthlyBreakdownItem[];
  payments: SubscriptionPayment[];
}

export interface CreatePaymentPayload {
  subscription_id?: string;
  subscription_name: string;
  amount: number;
  currency: string;
  payment_date: string;
  billing_month: number;
  billing_year: number;
  payment_method?: string;
  status?: string;
  notes?: string;
  allow_duplicate?: boolean;
}

export interface UpdatePaymentPayload extends Partial<CreatePaymentPayload> {}

export interface ReportQueryParams {
  startDate?: string;
  endDate?: string;
  startMonth?: string;
  endMonth?: string;
  subscriptionId?: string;
  status?: string;
  targetCurrency?: string;
}

export const getToken = (): string | null => localStorage.getItem('token');
export const setToken = (token: string): void => localStorage.setItem('token', token);
export const removeToken = (): void => localStorage.removeItem('token');

function buildQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

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
    let statusCode = response.status;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // ignore
    }
    const err = new Error(errorMessage) as Error & { status?: number };
    err.status = statusCode;
    throw err;
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
  payments: {
    list: (params?: ReportQueryParams) =>
      request<SubscriptionPayment[]>(`/payments${buildQueryString(params)}`),
    get: (id: string) => request<SubscriptionPayment>(`/payments/${id}`),
    create: (body: CreatePaymentPayload) =>
      request<SubscriptionPayment>('/payments', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdatePaymentPayload) =>
      request<SubscriptionPayment>(`/payments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/payments/${id}`, {
        method: 'DELETE',
      }),
    getReport: (params?: ReportQueryParams) =>
      request<ExpenseReportResponse>(`/payments/report${buildQueryString(params)}`),
    downloadReportCsv: async (params?: ReportQueryParams): Promise<void> => {
      const token = getToken();
      const headers = new Headers();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const response = await fetch(
        `${API_BASE_URL}/payments/report/export/csv${buildQueryString(params)}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error('Error al descargar el archivo CSV.');
      }
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'reporte-pagos.csv';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    downloadReportPdf: async (params?: ReportQueryParams): Promise<void> => {
      const token = getToken();
      const headers = new Headers();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const response = await fetch(
        `${API_BASE_URL}/payments/report/export/pdf${buildQueryString(params)}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error('Error al descargar el archivo PDF.');
      }
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'reporte-pagos.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
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
    update: (body: { telegramUsername?: string; username?: string; email?: string; notificationHour?: number }) => request<User>('/users', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    changePassword: (body: { currentPassword?: string; newPassword?: string; repeatPassword?: string }) => request<{ message: string }>('/users/change-password', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    delete: () => request<void>('/users', {
      method: 'DELETE',
    }),
  },
};
