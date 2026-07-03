import {AuthResponse, LoginCredentials} from '../types';
import {API_BASE_URL} from '../config/api';

class AuthService {
  private async request(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw {
          userMessage: data.message || 'Request failed',
          status: response.status,
          ...data,
        };
      }
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }
  async loginAdmin(
    username: string,
    password: string,
  ): Promise<AuthResponse> {
    try {
      const response = await this.request('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({username, password}),
      });
      return {
        success: true,
        token: response.data?.token,
        user: response.data?.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.userMessage || 'Invalid credentials',
      };
    }
  }
  async loginEmployee(
    username: string,
    password: string,
  ): Promise<AuthResponse> {
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({username, password}),
      });
      return {
        success: true,
        token: response.data?.token,
        user: response.data?.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.userMessage || 'Invalid credentials',
      };
    }
  }
  async changePassword(
    token: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{success: boolean; error?: string}> {
    try {
      await this.request('/auth/change-password', {
        method: 'PUT',
        headers: {Authorization: `Bearer ${token}`},
        body: JSON.stringify({currentPassword, newPassword}),
      });
      return {success: true};
    } catch (error: any) {
      return {success: false, error: error.userMessage || 'Failed to change password'};
    }
  }
  async logout(): Promise<void> {
  }
}
export default new AuthService();
