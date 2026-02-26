const API_BASE_URL = 'http://192.168.1.18:5001/api';

class SalesReportService {
  async getSalesReport(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/routestar-items/sales-report`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sales report');
      }

      const result = await response.json();
      return {
        items: result.data?.items || result.items || [],
        totals: result.data?.totals || result.totals || {},
      };
    } catch (error) {
      console.error('Sales Report Service Error:', error);
      throw error;
    }
  }
}

export default new SalesReportService();
