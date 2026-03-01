import {API_BASE_URL} from '../config/api';

class FetchHistoryService {
  async getHistory(
    token: string,
    params: {
      page?: number;
      limit?: number;
      source?: string;
      status?: string;
      fetchType?: string;
      days?: number;
    } = {}
  ) {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.source) queryParams.append('source', params.source);
      if (params.status) queryParams.append('status', params.status);
      if (params.fetchType) queryParams.append('fetchType', params.fetchType);
      if (params.days) queryParams.append('days', params.days.toString());

      const url = `${API_BASE_URL}/fetch-history?${queryParams.toString()}`;
      console.log('[FetchHistory] Fetching history from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[FetchHistory] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FetchHistory] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[FetchHistory] History count:', result.history?.length || 0);

      if (result.success) {
        return {
          history: result.history || [],
          pagination: result.pagination || {
            total: 0,
            page: 1,
            limit: 50,
            pages: 0,
          },
        };
      }

      return {
        history: [],
        pagination: {total: 0, page: 1, limit: 50, pages: 0},
      };
    } catch (error: any) {
      console.error('[FetchHistory] Service Error:', error.message);
      throw error;
    }
  }

  async getActiveFetches(token: string, source?: string) {
    try {
      const queryParams = new URLSearchParams();
      if (source) queryParams.append('source', source);

      const url = `${API_BASE_URL}/fetch-history/active?${queryParams.toString()}`;
      console.log('[FetchHistory] Fetching active:', url);

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
      return result.activeFetches || [];
    } catch (error: any) {
      console.error('[FetchHistory] Get active error:', error.message);
      throw error;
    }
  }

  async getStatistics(token: string, source?: string, days: number = 10) {
    try {
      const queryParams = new URLSearchParams();
      if (source) queryParams.append('source', source);
      queryParams.append('days', days.toString());

      const url = `${API_BASE_URL}/fetch-history/statistics?${queryParams.toString()}`;
      console.log('[FetchHistory] Fetching statistics:', url);

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
      return result.summary || {
        activeCount: 0,
        todayCount: 0,
        successRate: 100,
        totalCompleted: 0,
        totalFailed: 0,
      };
    } catch (error: any) {
      console.error('[FetchHistory] Get statistics error:', error.message);
      throw error;
    }
  }

  async getFetchDetails(token: string, id: string) {
    try {
      const url = `${API_BASE_URL}/fetch-history/${id}`;
      console.log('[FetchHistory] Fetching details:', id);

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
      return result.fetch;
    } catch (error: any) {
      console.error('[FetchHistory] Get details error:', error.message);
      throw error;
    }
  }

  async cancelFetch(token: string, id: string) {
    try {
      const url = `${API_BASE_URL}/fetch-history/${id}/cancel`;
      console.log('[FetchHistory] Cancelling fetch:', id);

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

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('[FetchHistory] Cancel fetch error:', error.message);
      throw error;
    }
  }
}

export default new FetchHistoryService();
