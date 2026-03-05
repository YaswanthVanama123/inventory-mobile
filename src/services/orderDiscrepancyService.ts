import {API_BASE_URL} from '../config/api';

class OrderDiscrepancyService {
  async getOrderDiscrepancies(
    token: string,
    params: {
      page?: number;
      limit?: number;
      status?: string;
      discrepancyType?: string;
      orderNumber?: string;
    } = {},
  ) {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.status) queryParams.append('status', params.status);
      if (params.discrepancyType)
        queryParams.append('discrepancyType', params.discrepancyType);
      if (params.orderNumber)
        queryParams.append('orderNumber', params.orderNumber);
      const url = `${API_BASE_URL}/order-discrepancies?${queryParams.toString()}`;
      console.log('[OrderDiscrepancy] Fetching from:', url);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('[OrderDiscrepancy] Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OrderDiscrepancy] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      if (result.success) {
        return {
          discrepancies: result.data?.discrepancies || [],
          pagination: result.data?.pagination || {
            page: 1,
            pages: 1,
            total: 0,
          },
        };
      }
      throw new Error('Invalid response format');
    } catch (error: any) {
      console.error('[OrderDiscrepancy] Service Error:', error.message);
      throw error;
    }
  }
  async getOrderDiscrepancyById(token: string, id: string) {
    try {
      const url = `${API_BASE_URL}/order-discrepancies/${id}`;
      console.log('[OrderDiscrepancy] Fetching single:', url);
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
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error('Invalid response format');
    } catch (error: any) {
      console.error('[OrderDiscrepancy] Get by ID Error:', error.message);
      throw error;
    }
  }
  async verifyOrder(
    token: string,
    orderId: string,
    data: {
      allGood: boolean;
      items?: any[];
      notes?: string;
    },
  ) {
    try {
      const url = `${API_BASE_URL}/order-discrepancies/verify/${orderId}`;
      console.log('[OrderDiscrepancy] Verifying order:', orderId);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      console.log('[OrderDiscrepancy] Verify response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OrderDiscrepancy] Verify error:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to verify order');
    } catch (error: any) {
      console.error('[OrderDiscrepancy] Verify order error:', error.message);
      throw error;
    }
  }
  async approveOrderDiscrepancy(
    token: string,
    id: string,
    notes?: string,
  ) {
    try {
      const url = `${API_BASE_URL}/order-discrepancies/${id}/approve`;
      console.log('[OrderDiscrepancy] Approving:', id);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({notes}),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to approve discrepancy');
    } catch (error: any) {
      console.error('[OrderDiscrepancy] Approve error:', error.message);
      throw error;
    }
  }
  async rejectOrderDiscrepancy(
    token: string,
    id: string,
    notes?: string,
  ) {
    try {
      const url = `${API_BASE_URL}/order-discrepancies/${id}/reject`;
      console.log('[OrderDiscrepancy] Rejecting:', id);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({notes}),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to reject discrepancy');
    } catch (error: any) {
      console.error('[OrderDiscrepancy] Reject error:', error.message);
      throw error;
    }
  }
  async getOrderDiscrepancyStats(token: string) {
    try {
      const url = `${API_BASE_URL}/order-discrepancies/stats`;
      console.log('[OrderDiscrepancy] Fetching stats');
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
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error('Invalid response format');
    } catch (error: any) {
      console.error('[OrderDiscrepancy] Stats error:', error.message);
      throw error;
    }
  }
}
export default new OrderDiscrepancyService();
