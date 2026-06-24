import {API_BASE_URL} from '../config/api';

class SalesReportService {
  async getSalesReport(token: string, params: {search?: string} = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      const qs = queryParams.toString();
      const response = await fetch(`${API_BASE_URL}/routestar-items/sales-report${qs ? `?${qs}` : ''}`, {
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
