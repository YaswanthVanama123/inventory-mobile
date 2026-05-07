import api from './api';

/**
 * Activity Log Service
 * Handles all activity log related API calls
 */

class ActivityLogService {
  /**
   * Get activity logs with filtering
   */
  async getActivityLogs(params = {}) {
    try {
      const response = await api.get('/activity-logs', { params });
      return response.data.data;
    } catch (error) {
      console.error('Get activity logs error:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(params = {}) {
    try {
      const response = await api.get('/activity-logs/stats', { params });
      return response.data.data;
    } catch (error) {
      console.error('Get activity stats error:', error);
      throw error;
    }
  }

  /**
   * Get current user's activity logs
   */
  async getMyActivities(params = {}) {
    try {
      const response = await api.get('/activity-logs/my-activities', { params });
      return response.data.data;
    } catch (error) {
      console.error('Get my activities error:', error);
      throw error;
    }
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(limit = 20) {
    try {
      const response = await api.get('/activity-logs/recent', {
        params: { limit }
      });
      return response.data.data;
    } catch (error) {
      console.error('Get recent activities error:', error);
      throw error;
    }
  }

  /**
   * Get activity breakdown
   */
  async getActivityBreakdown(params = {}) {
    try {
      const response = await api.get('/activity-logs/breakdown', { params });
      return response.data.data;
    } catch (error) {
      console.error('Get activity breakdown error:', error);
      throw error;
    }
  }

  /**
   * Get top active users
   */
  async getTopActiveUsers(limit = 10, params = {}) {
    try {
      const response = await api.get('/activity-logs/top-users', {
        params: { limit, ...params }
      });
      return response.data.data;
    } catch (error) {
      console.error('Get top active users error:', error);
      throw error;
    }
  }

  /**
   * Get failed activities
   */
  async getFailedActivities(params = {}) {
    try {
      const response = await api.get('/activity-logs/failed', { params });
      return response.data.data;
    } catch (error) {
      console.error('Get failed activities error:', error);
      throw error;
    }
  }

  /**
   * Export activity logs
   */
  async exportActivityLogs(params = {}, format = 'json') {
    try {
      const response = await api.get('/activity-logs/export', {
        params: { ...params, format }
      });
      return response.data.data;
    } catch (error) {
      console.error('Export activity logs error:', error);
      throw error;
    }
  }
}

export default new ActivityLogService();
