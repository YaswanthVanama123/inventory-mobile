import {API_BASE_URL} from '../config/api';

class OrdersService {
  async getOrders(token: string, params: any = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.status) queryParams.append('status', params.status);
      if (params.stockProcessed !== undefined) queryParams.append('stockProcessed', params.stockProcessed.toString());
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.vendor) queryParams.append('vendor', params.vendor);

      const url = `${API_BASE_URL}/customerconnect/orders?${queryParams.toString()}`;
      console.log('[Orders] Fetching from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[Orders] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Orders] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[Orders] Response data:', JSON.stringify(result).substring(0, 200));

      if (result.success) {
        return {
          orders: result.data?.orders || [],
          pagination: result.data?.pagination || {
            page: 1,
            pages: 1,
            total: 0,
          },
        };
      }

      throw new Error('Invalid response format');
    } catch (error: any) {
      console.error('[Orders] Service Error:', error.message);
      console.error('[Orders] Full error:', error);
      throw error;
    }
  }

  async getOrderByNumber(token: string, orderNumber: string) {
    try {
      const url = `${API_BASE_URL}/customerconnect/orders/${orderNumber}`;
      console.log('[OrderDetail] Fetching from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[OrderDetail] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OrderDetail] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[OrderDetail] Response data:', JSON.stringify(result).substring(0, 200));

      if (result.success && result.data) {
        return result.data;
      }

      throw new Error('Invalid response format');
    } catch (error: any) {
      console.error('[OrderDetail] Service Error:', error.message);
      console.error('[OrderDetail] Full error:', error);
      throw error;
    }
  }

  async getOrderStats(token: string) {
    try {
      const url = `${API_BASE_URL}/customerconnect/stats`;
      console.log('[OrderStats] Fetching from:', url);

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

      if (result.success) {
        return result.data || {};
      }

      throw new Error('Invalid response format');
    } catch (error: any) {
      console.error('[OrderStats] Service Error:', error.message);
      throw error;
    }
  }
}

export default new OrdersService();
