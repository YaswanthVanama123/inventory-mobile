import {API_BASE_URL} from '../config/api';

class TruckCheckoutService {
  /**
   * Search RouteStarItems with stock info for checkout dropdown
   */
  async searchItems(
    token: string,
    query: string = '',
    forSell: boolean = true,
    limit: number = 100
  ) {
    try {
      const queryParams = new URLSearchParams();
      if (query) queryParams.append('q', query);
      queryParams.append('forSell', forSell.toString());
      queryParams.append('limit', limit.toString());

      const url = `${API_BASE_URL}/truck-checkouts/items/search?${queryParams.toString()}`;
      console.log('[TruckCheckout] Searching items:', url);

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
      console.log('[TruckCheckout] Items found:', result.data?.length || 0);

      if (result.success && result.data) {
        return result.data;
      }

      return [];
    } catch (error: any) {
      console.error('[TruckCheckout] Search items error:', error.message);
      throw error;
    }
  }

  /**
   * Get current stock for a specific item
   */
  async getItemStock(token: string, itemName: string) {
    try {
      const url = `${API_BASE_URL}/truck-checkouts/stock/${encodeURIComponent(
        itemName
      )}`;
      console.log('[TruckCheckout] Getting stock for:', itemName);

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

      return null;
    } catch (error: any) {
      console.error('[TruckCheckout] Get stock error:', error.message);
      throw error;
    }
  }

  /**
   * Create new checkout with validation and auto-discrepancy
   */
  async createCheckout(token: string, checkoutData: any) {
    try {
      const url = `${API_BASE_URL}/truck-checkouts/create-new`;
      console.log('[TruckCheckout] Creating checkout:', checkoutData);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[TruckCheckout] Checkout result:', result);

      return result;
    } catch (error: any) {
      console.error('[TruckCheckout] Create checkout error:', error.message);
      throw error;
    }
  }

  /**
   * Get all checkouts with filtering
   */
  async getCheckouts(
    token: string,
    filters: {
      status?: string;
      employeeName?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.employeeName)
        queryParams.append('employeeName', filters.employeeName);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());

      const url = `${API_BASE_URL}/truck-checkouts?${queryParams.toString()}`;
      console.log('[TruckCheckout] Getting checkouts:', url);

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

      return {checkouts: [], total: 0};
    } catch (error: any) {
      console.error('[TruckCheckout] Get checkouts error:', error.message);
      throw error;
    }
  }

  /**
   * Get active checkouts
   */
  async getActiveCheckouts(token: string) {
    try {
      const url = `${API_BASE_URL}/truck-checkouts/active`;
      console.log('[TruckCheckout] Getting active checkouts');

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

      return [];
    } catch (error: any) {
      console.error('[TruckCheckout] Get active checkouts error:', error.message);
      throw error;
    }
  }

  /**
   * Get checkout sales tracking
   */
  async getSalesTracking(
    token: string,
    filters: {
      employeeName?: string;
      truckNumber?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.employeeName)
        queryParams.append('employeeName', filters.employeeName);
      if (filters.truckNumber)
        queryParams.append('truckNumber', filters.truckNumber);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const url = `${API_BASE_URL}/truck-checkouts/sales-tracking?${queryParams.toString()}`;
      console.log('[TruckCheckout] Getting sales tracking:', url);

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

      return {checkouts: [], summary: {}};
    } catch (error: any) {
      console.error('[TruckCheckout] Get sales tracking error:', error.message);
      throw error;
    }
  }

  /**
   * Get all employees with their checkout statistics
   */
  async getAllEmployeesWithStats(
    token: string,
    filters: {
      startDate?: string;
      endDate?: string;
      search?: string;
    } = {}
  ) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.search) queryParams.append('search', filters.search);

      const url = `${API_BASE_URL}/truck-checkouts/employees/stats?${queryParams.toString()}`;
      console.log('[TruckCheckout] Getting employees with stats:', url);

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

      return [];
    } catch (error: any) {
      console.error('[TruckCheckout] Get employees with stats error:', error.message);
      throw error;
    }
  }
}

export default new TruckCheckoutService();
