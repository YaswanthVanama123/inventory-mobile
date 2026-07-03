import {API_BASE_URL} from '../config/api';

/**
 * Activity Log Service
 * Handles all activity log related API calls
 */

class ActivityLogService {
  /**
   * Get activity logs with filtering
   */
  async getActivityLogs(token: string, params: any = {}) {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await fetch(
        `${API_BASE_URL}/activity-logs?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Get activity logs error:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(token: string, params: any = {}) {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await fetch(
        `${API_BASE_URL}/activity-logs/stats?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch activity stats');
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Get activity stats error:', error);
      throw error;
    }
  }

  /**
   * Get current user's activity logs
   */
  async getMyActivities(token: string, params: any = {}) {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await fetch(
        `${API_BASE_URL}/activity-logs/my-activities?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch my activities');
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Get my activities error:', error);
      throw error;
    }
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(token: string, limit: number = 20) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/activity-logs/recent?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch recent activities');
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Get recent activities error:', error);
      throw error;
    }
  }

  /**
   * Get activity breakdown
   */
  async getActivityBreakdown(token: string, params: any = {}) {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await fetch(
        `${API_BASE_URL}/activity-logs/breakdown?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch activity breakdown');
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Get activity breakdown error:', error);
      throw error;
    }
  }

  /**
   * Get top active users
   */
  async getTopActiveUsers(token: string, limit: number = 10, params: any = {}) {
    try {
      const queryParams = new URLSearchParams({...params, limit: limit.toString()});
      const response = await fetch(
        `${API_BASE_URL}/activity-logs/top-users?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch top active users');
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Get top active users error:', error);
      throw error;
    }
  }

  /**
   * Get failed activities
   */
  async getFailedActivities(token: string, params: any = {}) {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await fetch(
        `${API_BASE_URL}/activity-logs/failed?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch failed activities');
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Get failed activities error:', error);
      throw error;
    }
  }

  /**
   * Get employee activities (tabbed view).
   * tab: 'all' | 'sales' | 'stock' | 'deletions'
   * Endpoints: /activities, /activities/sales, /activities/stock, /activities/deletions
   * Response data keys differ by tab: activities | sales | activities | deletions.
   * Returns a normalized {activities, pagination}.
   */
  async getEmployeeActivities(
    token: string,
    tab: 'all' | 'sales' | 'stock' | 'deletions',
    params: any = {},
  ): Promise<{activities: any[]; pagination: any}> {
    const endpointMap: Record<string, string> = {
      all: '/activities',
      sales: '/activities/sales',
      stock: '/activities/stock',
      deletions: '/activities/deletions',
    };
    const endpoint = endpointMap[tab] || '/activities';
    // Only forward non-empty params.
    const cleaned: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = String(value);
      }
    });
    const queryParams = new URLSearchParams(cleaned);
    const response = await fetch(
      `${API_BASE_URL}${endpoint}?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }
    const json = await response.json();
    const data = json.data || {};
    const activities = data.activities || data.sales || data.deletions || [];
    return {activities, pagination: data.pagination || {}};
  }

  /**
   * Get the employee list used to populate the activity filter dropdown.
   * Uses the /activities/page-data endpoint which returns a `users` array.
   */
  async getActivityEmployees(token: string): Promise<any[]> {
    const response = await fetch(
      `${API_BASE_URL}/activities/page-data?page=1&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
    if (!response.ok) {
      throw new Error('Failed to fetch activity employees');
    }
    const json = await response.json();
    return json.data?.users || [];
  }

  /**
   * Export activity logs
   */
  async exportActivityLogs(token: string, params: any = {}, format: string = 'json') {
    try {
      const queryParams = new URLSearchParams({...params, format});
      const response = await fetch(
        `${API_BASE_URL}/activity-logs/export?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to export activity logs');
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Export activity logs error:', error);
      throw error;
    }
  }
}

export default new ActivityLogService();
