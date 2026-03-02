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
  async getGroupedItems(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/customerconnect/items/grouped`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch grouped items');
      }

      const data = await response.json();
      return data.data?.items || data.items || [];
    } catch (error) {
      console.error('Grouped Items Service Error:', error);
      throw error;
    }
  }

  async getGroupedSalesItems(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/routestar/items/grouped`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch grouped sales items');
      }

      const data = await response.json();
      return data.data?.items || data.items || [];
    } catch (error) {
      console.error('Grouped Sales Items Service Error:', error);
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
}

export default new InventoryService();
