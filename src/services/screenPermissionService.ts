import {API_BASE_URL} from '../config/api';

export interface Screen {
  _id: string;
  name: string;
  displayName: string;
  path: string;
  icon?: string;
  category: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithPermissions {
  _id: string;
  name: string;
  email: string;
  role: string;
  totalScreensCount: number;
  additionalScreensCount: number;
}

class ScreenPermissionService {
  // Get all screens
  // Server-paginated screens (search + category + page/limit applied on the backend).
  async getScreensPaged(
    token: string,
    params: {search?: string; category?: string; page?: number; limit?: number} = {},
  ): Promise<{screens: Screen[]; total: number; pages: number}> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.category) queryParams.append('category', params.category);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));
    const qs = queryParams.toString();
    const url = `${API_BASE_URL}/screen-permissions/screens${qs ? `?${qs}` : ''}`;
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
    const data = result.data || {};
    const screens = data.screens || (Array.isArray(data) ? data : []);
    return {
      screens: Array.isArray(screens) ? screens : [],
      total: data.total ?? (Array.isArray(screens) ? screens.length : 0),
      pages: data.pages ?? 1,
    };
  }

  async getAllScreens(token: string, params: {search?: string} = {}): Promise<Screen[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      const qs = queryParams.toString();
      const url = `${API_BASE_URL}/screen-permissions/screens${qs ? `?${qs}` : ''}`;
      console.log('[ScreenPermissionService] Fetching all screens from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[ScreenPermissionService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ScreenPermissionService] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[ScreenPermissionService] Screens count:', result.data?.length || 0);

      return result.data || [];
    } catch (error: any) {
      console.error('[ScreenPermissionService] Get all screens error:', error.message);
      throw error;
    }
  }

  // Get a single screen by ID
  async getScreenById(token: string, screenId: string): Promise<Screen> {
    try {
      const url = `${API_BASE_URL}/screen-permissions/screens/${screenId}`;
      console.log('[ScreenPermissionService] Fetching screen:', screenId);

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
      console.error('[ScreenPermissionService] Get screen error:', error.message);
      throw error;
    }
  }

  // Create a new screen
  async createScreen(token: string, screenData: Partial<Screen>): Promise<Screen> {
    try {
      const url = `${API_BASE_URL}/screen-permissions/screens`;
      console.log('[ScreenPermissionService] Creating screen:', screenData.name);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(screenData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('[ScreenPermissionService] Create screen error:', error.message);
      throw error;
    }
  }

  // Update a screen
  async updateScreen(token: string, screenId: string, screenData: Partial<Screen>): Promise<Screen> {
    try {
      const url = `${API_BASE_URL}/screen-permissions/screens/${screenId}`;
      console.log('[ScreenPermissionService] Updating screen:', screenId);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(screenData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('[ScreenPermissionService] Update screen error:', error.message);
      throw error;
    }
  }

  // Delete a screen
  async deleteScreen(token: string, screenId: string): Promise<void> {
    try {
      const url = `${API_BASE_URL}/screen-permissions/screens/${screenId}`;
      console.log('[ScreenPermissionService] Deleting screen:', screenId);

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
    } catch (error: any) {
      console.error('[ScreenPermissionService] Delete screen error:', error.message);
      throw error;
    }
  }

  // Get default screens (the ones every employee gets automatically)
  async getDefaultScreens(token: string): Promise<Screen[]> {
    try {
      const url = `${API_BASE_URL}/screen-permissions/screens/default`;
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
      return result.data || [];
    } catch (error: any) {
      console.error('[ScreenPermissionService] Get default screens error:', error.message);
      throw error;
    }
  }

  // Update default screens
  async updateDefaultScreens(token: string, screenIds: string[]): Promise<void> {
    try {
      const url = `${API_BASE_URL}/screen-permissions/screens/default`;
      console.log('[ScreenPermissionService] Updating default screens');

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({screenIds}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
    } catch (error: any) {
      console.error('[ScreenPermissionService] Update default screens error:', error.message);
      throw error;
    }
  }

  // Initialize screens
  async initializeScreens(token: string): Promise<void> {
    try {
      const url = `${API_BASE_URL}/screen-permissions/screens/initialize`;
      console.log('[ScreenPermissionService] Initializing screens');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
    } catch (error: any) {
      console.error('[ScreenPermissionService] Initialize screens error:', error.message);
      throw error;
    }
  }

  // Get my screens (logged-in user)
  async getMyScreens(token: string): Promise<Screen[]> {
    try {
      const url = `${API_BASE_URL}/screen-permissions/my-screens`;
      console.log('[ScreenPermissionService] Fetching my screens');

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
      return result.data || [];
    } catch (error: any) {
      console.error('[ScreenPermissionService] Get my screens error:', error.message);
      throw error;
    }
  }

  // Get all users with their permissions summary
  async getAllUsersWithPermissions(token: string): Promise<UserWithPermissions[]> {
    try {
      const url = `${API_BASE_URL}/screen-permissions/users`;
      console.log('[ScreenPermissionService] Fetching users with permissions');

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
      return result.data || [];
    } catch (error: any) {
      console.error('[ScreenPermissionService] Get users with permissions error:', error.message);
      throw error;
    }
  }

  // Get screens for a specific user
  async getUserScreens(token: string, userId: string): Promise<Screen[]> {
    try {
      const url = `${API_BASE_URL}/screen-permissions/users/${userId}/screens`;
      console.log('[ScreenPermissionService] Fetching screens for user:', userId);

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
      return result.data || [];
    } catch (error: any) {
      console.error('[ScreenPermissionService] Get user screens error:', error.message);
      throw error;
    }
  }

  // Update user-specific permissions
  async updateUserPermissions(token: string, userId: string, screenIds: string[]): Promise<void> {
    try {
      const url = `${API_BASE_URL}/screen-permissions/users/${userId}/permissions`;
      console.log('[ScreenPermissionService] Updating permissions for user:', userId);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({screenIds}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
    } catch (error: any) {
      console.error('[ScreenPermissionService] Update user permissions error:', error.message);
      throw error;
    }
  }
}

export default new ScreenPermissionService();
