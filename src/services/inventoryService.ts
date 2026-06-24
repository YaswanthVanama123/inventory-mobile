import {API_BASE_URL} from '../config/api';

interface InventoryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  lowStock?: boolean;
  adequateStock?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

class InventoryService {
  async getGroupedItems(
    token: string,
    params: {search?: string; page?: number; limit?: number} = {},
  ): Promise<{items: any[]; total: number; pages: number; totals: {totalQuantity: number; totalValue: number}}> {
    try {
      const qp = new URLSearchParams();
      if (params.search) qp.append('search', params.search);
      if (params.page) qp.append('page', String(params.page));
      if (params.limit) qp.append('limit', String(params.limit));
      const qs = qp.toString();
      const response = await fetch(`${API_BASE_URL}/customerconnect/items/grouped${qs ? `?${qs}` : ''}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch grouped items');
      }
      const data = await response.json();
      const payload = data.data || data;
      const items = payload.items || [];
      const pg = payload.pagination || {};
      return {
        items,
        total: pg.total ?? items.length,
        pages: pg.pages ?? 1,
        totals: payload.totals || {totalQuantity: 0, totalValue: 0},
      };
    } catch (error) {
      console.error('Grouped Items Service Error:', error);
      throw error;
    }
  }
  async getGroupedSalesItems(
    token: string,
    params: {search?: string; page?: number; limit?: number} = {},
  ): Promise<{items: any[]; total: number; pages: number; totals: {totalQuantity: number; totalValue: number}}> {
    try {
      const qp = new URLSearchParams();
      if (params.search) qp.append('search', params.search);
      if (params.page) qp.append('page', String(params.page));
      if (params.limit) qp.append('limit', String(params.limit));
      const qs = qp.toString();
      const response = await fetch(`${API_BASE_URL}/routestar/items/grouped${qs ? `?${qs}` : ''}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch grouped sales items');
      }
      const data = await response.json();
      const payload = data.data || data;
      const items = payload.items || [];
      const pg = payload.pagination || {};
      return {
        items,
        total: pg.total ?? items.length,
        pages: pg.pages ?? 1,
        totals: payload.totals || {totalQuantity: 0, totalValue: 0},
      };
    } catch (error) {
      console.error('Grouped Sales Items Service Error:', error);
      throw error;
    }
  }
  async getOrdersForItem(token: string, sku: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/customerconnect/items/${encodeURIComponent(sku)}/orders`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch orders for item');
      }
      const data = await response.json();
      return data.data?.entries || data.entries || [];
    } catch (error) {
      console.error('Orders For Item Service Error:', error);
      throw error;
    }
  }
  async getInvoicesForItem(token: string, itemName: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/routestar/items/${encodeURIComponent(itemName)}/invoices`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch invoices for item');
      }
      const data = await response.json();
      return data.data?.entries || data.entries || [];
    } catch (error) {
      console.error('Invoices For Item Service Error:', error);
      throw error;
    }
  }
  async getInventoryItems(token: string, params: InventoryParams = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.category) queryParams.append('category', params.category);
      if (params.lowStock) queryParams.append('lowStock', 'true');
      if (params.adequateStock) queryParams.append('adequateStock', 'true');
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      const url = `${API_BASE_URL}/inventory${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch inventory items');
      }
      const data = await response.json();
      return {
        items: data.items || data || [],
        totalPages: data.totalPages || 1,
        total: data.total || 0,
        currentPage: data.currentPage || 1,
      };
    } catch (error) {
      console.error('Inventory Service Error:', error);
      throw error;
    }
  }
  async getItemDetails(token: string, itemId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/${itemId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch item details');
      }
      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Item Details Service Error:', error);
      throw error;
    }
  }
  getImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) {
      return 'https://via.placeholder.com/150?text=No+Image';
    }
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    if (imagePath.startsWith('/uploads')) {
      const backendUrl = 'http://192.168.1.18:5001';
      return `${backendUrl}${imagePath}`;
    }
    return imagePath;
  }
  async verifyOrderItem(
    token: string,
    orderNumber: string,
    itemIndex: number,
    userId: string,
    sku: string,
    receivedQty?: number,
    notes?: string
  ) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/customerconnect/orders/${orderNumber}/items/${itemIndex}/verify`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            sku,
            receivedQty,
            notes: notes || '',
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify order item');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Verify Order Item Service Error:', error);
      throw error;
    }
  }
}
export default new InventoryService();
