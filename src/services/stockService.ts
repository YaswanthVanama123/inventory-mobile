import {API_BASE_URL} from '../config/api';

class StockService {
  async getStockSummary(
    token: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      tab?: 'use' | 'sell';
    } = {},
  ) {
    try {
      const qs = new URLSearchParams();
      if (params.page) qs.append('page', String(params.page));
      if (params.limit) qs.append('limit', String(params.limit));
      if (params.search) qs.append('search', params.search);
      if (params.tab) qs.append('tab', params.tab);
      const query = qs.toString();
      const url = `${API_BASE_URL}/stock/summary${query ? `?${query}` : ''}`;
      console.log('[StockService] getStockSummary called');
      console.log('[StockService] API URL:', url);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[StockService] Response status:', response.status);
      if (!response.ok) {
        throw new Error('Failed to fetch stock summary');
      }
      const result = await response.json();
      console.log('[StockService] Response result:', JSON.stringify(result, null, 2));
      const data = result.data || result;
      console.log('[StockService] Parsed data:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('Stock Summary Service Error:', error);
      throw error;
    }
  }
  async getCategorySKUs(token: string, categoryName: string) {
    try {
      console.log('[StockService] getCategorySKUs called for:', categoryName);
      const response = await fetch(
        `${API_BASE_URL}/stock/category/${encodeURIComponent(categoryName)}/skus`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch category SKUs');
      }
      const result = await response.json();
      console.log('[StockService] Category SKUs result:', result);
      const data = result.data || result;
      return data.skus || data || [];
    } catch (error) {
      console.error('Category SKUs Service Error:', error);
      throw error;
    }
  }
  async getCategorySales(token: string, categoryName: string) {
    try {
      console.log('[StockService] getCategorySales called for:', categoryName);
      const response = await fetch(
        `${API_BASE_URL}/stock/category/${encodeURIComponent(categoryName)}/sales`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch category sales');
      }
      const result = await response.json();
      console.log('[StockService] Category sales result:', result);
      const data = result.data || result;
      return {
        skus: data.skus || [],
        categoryDiscrepancies: data.categoryDiscrepancies || [],
        categorySalesHistory: data.categorySalesHistory || [],
        categoryCheckoutHistory: data.categoryCheckoutHistory || [],
        summary: data.summary || {},
      };
    } catch (error) {
      console.error('Category Sales Service Error:', error);
      throw error;
    }
  }
  async searchStock(token: string, q: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/stock/search?q=${encodeURIComponent(q)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (!response.ok) {
        throw new Error('Failed to search stock');
      }
      const result = await response.json();
      const data = result.data || result;
      return {
        query: data.query || q,
        total: data.total || 0,
        matches: data.matches || [],
      };
    } catch (error) {
      console.error('Stock Search Service Error:', error);
      throw error;
    }
  }
  async getStockReconciliation(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/stock-reconciliation`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch stock reconciliation');
      }
      const result = await response.json();
      const data = result.data || result;
      return {
        items: data.items || [],
        summary: data.summary || null,
      };
    } catch (error) {
      console.error('Stock Reconciliation Service Error:', error);
      throw error;
    }
  }
}
export default new StockService();
