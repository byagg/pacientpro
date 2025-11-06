// Django API integration for authentication and payments
const API_BASE = 'http://localhost:8000/api';

export interface DjangoUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
}

export interface DjangoAuthResponse {
  user: DjangoUser;
  access: string;
  refresh: string;
}

export interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
}

class DjangoAPI {
  private getAuthHeaders(token?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    const authToken = token || this.getAccessToken();
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // Token management
  getAccessToken(): string | null {
    return localStorage.getItem('django_access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('django_refresh_token');
  }

  setTokens(access: string, refresh: string) {
    localStorage.setItem('django_access_token', access);
    localStorage.setItem('django_refresh_token', refresh);
  }

  clearTokens() {
    localStorage.removeItem('django_access_token');
    localStorage.removeItem('django_refresh_token');
    localStorage.removeItem('django_user');
  }

  setUser(user: DjangoUser) {
    localStorage.setItem('django_user', JSON.stringify(user));
  }

  getUser(): DjangoUser | null {
    const userStr = localStorage.getItem('django_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  // Authentication endpoints
  async register(userData: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
  }): Promise<DjangoAuthResponse> {
    const response = await fetch(`${API_BASE}/auth/register/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    const data = await this.handleResponse<DjangoAuthResponse>(response);
    this.setTokens(data.access, data.refresh);
    this.setUser(data.user);
    return data;
  }

  async login(credentials: {
    username: string;
    password: string;
  }): Promise<DjangoAuthResponse> {
    const response = await fetch(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(credentials),
    });

    const data = await this.handleResponse<DjangoAuthResponse>(response);
    this.setTokens(data.access, data.refresh);
    this.setUser(data.user);
    return data;
  }

  async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ refresh: refreshToken }),
    });

    const data = await this.handleResponse<{ access: string }>(response);
    localStorage.setItem('django_access_token', data.access);
    return data.access;
  }

  async getProfile(): Promise<DjangoUser> {
    const response = await fetch(`${API_BASE}/auth/profile/`, {
      headers: this.getAuthHeaders(),
    });

    const user = await this.handleResponse<DjangoUser>(response);
    this.setUser(user);
    return user;
  }

  async updateProfile(userData: Partial<DjangoUser>): Promise<DjangoUser> {
    const response = await fetch(`${API_BASE}/auth/profile/update/`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    const user = await this.handleResponse<DjangoUser>(response);
    this.setUser(user);
    return user;
  }

  logout() {
    this.clearTokens();
  }

  // Payment endpoints
  async createPaymentIntent(amount: number, currency: string = 'eur'): Promise<PaymentIntentResponse> {
    const response = await fetch(`${API_BASE}/payments/create-payment-intent/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ amount, currency }),
    });

    return this.handleResponse<PaymentIntentResponse>(response);
  }

  async confirmPayment(paymentIntentId: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE}/payments/confirm-payment/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ payment_intent_id: paymentIntentId }),
    });

    return this.handleResponse<{ status: string; message: string }>(response);
  }

  // Auto-retry with token refresh on 401
  async apiCall<T>(url: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      if (response.status === 401) {
        // Try to refresh token
        await this.refreshAccessToken();
        // Retry the request
        const retryResponse = await fetch(`${API_BASE}${url}`, {
          ...options,
          headers: {
            ...this.getAuthHeaders(),
            ...options.headers,
          },
        });
        return this.handleResponse<T>(retryResponse);
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        // If refresh also fails, logout
        this.logout();
      }
      throw error;
    }
  }
}

export const djangoAPI = new DjangoAPI();