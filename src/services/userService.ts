import {API_BASE_URL} from '../config/api';

class UserService {
  async getAll(
    token: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
      isActive?: boolean;
    } = {}
  ) {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.role) queryParams.append('role', params.role);
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

      const url = `${API_BASE_URL}/users?${queryParams.toString()}`;
      console.log('[UserService] Fetching users from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[UserService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[UserService] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[UserService] Users count:', result.data?.users?.length || 0);

      if (result.success && result.data) {
        const users = result.data.users || [];

        // Calculate stats from users array
        const stats = {
          total: users.length,
          active: users.filter((u: any) => u.isActive).length,
          inactive: users.filter((u: any) => !u.isActive).length,
          admins: users.filter((u: any) => u.role === 'admin').length,
          employees: users.filter((u: any) => u.role === 'employee').length,
        };

        return {
          users,
          pagination: result.data.pagination || {
            total: 0,
            page: 1,
            limit: 50,
            pages: 0,
          },
          stats,
        };
      }

      return {
        users: [],
        pagination: {total: 0, page: 1, limit: 50, pages: 0},
        stats: {total: 0, active: 0, inactive: 0, admins: 0, employees: 0},
      };
    } catch (error: any) {
      console.error('[UserService] Service Error:', error.message);
      throw error;
    }
  }

  async getById(token: string, userId: string) {
    try {
      const url = `${API_BASE_URL}/users/${userId}`;
      console.log('[UserService] Fetching user:', userId);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('[UserService] Get user error:', error.message);
      throw error;
    }
  }

  async create(
    token: string,
    userData: {
      username: string;
      email: string;
      password: string;
      fullName: string;
      role: string;
      truckNumber?: string;
    }
  ) {
    try {
      const url = `${API_BASE_URL}/users`;
      console.log('[UserService] Creating user:', userData.username);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('[UserService] Create user error:', error.message);
      throw error;
    }
  }

  async update(
    token: string,
    userId: string,
    userData: {
      email?: string;
      fullName?: string;
      role?: string;
      isActive?: boolean;
      truckNumber?: string;
    }
  ) {
    try {
      const url = `${API_BASE_URL}/users/${userId}`;
      console.log('[UserService] Updating user:', userId);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('[UserService] Update user error:', error.message);
      throw error;
    }
  }

  async deleteUser(token: string, userId: string) {
    try {
      const url = `${API_BASE_URL}/users/${userId}`;
      console.log('[UserService] Deleting user:', userId);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('[UserService] Delete user error:', error.message);
      throw error;
    }
  }

  async resetPassword(token: string, userId: string, newPassword: string) {
    try {
      const url = `${API_BASE_URL}/users/${userId}/reset-password`;
      console.log('[UserService] Resetting password for user:', userId);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({newPassword}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('[UserService] Reset password error:', error.message);
      throw error;
    }
  }

  async updateOwnTruckNumber(token: string, truckNumber: string) {
    try {
      const url = `${API_BASE_URL}/users/me/truck-number`;
      console.log('[UserService] Updating own truck number');

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({truckNumber}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('[UserService] Update truck number error:', error.message);
      throw error;
    }
  }
}

export default new UserService();
