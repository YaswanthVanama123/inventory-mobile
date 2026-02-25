const API_BASE_URL = 'http://192.168.1.18:5001/api';

class StockService {
  async getStockSummary(token: string) {
    try {
      console.log('[StockService] getStockSummary called');
      console.log('[StockService] API URL:', `${API_BASE_URL}/stock/summary`);
      const response = await fetch(`${API_BASE_URL}/stock/summary`, {
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

      // The API might return { success: true, data: { useStock, sellStock } }
      // or just { useStock, sellStock }
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
      return data.skus || data || [];
    } catch (error) {
      console.error('Category Sales Service Error:', error);
      throw error;
    }
  }
}

export default new StockService();
