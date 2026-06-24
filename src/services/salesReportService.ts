import {API_BASE_URL} from '../config/api';

class SalesReportService {
  async getSalesReport(
    token: string,
    params: {search?: string; page?: number; limit?: number} = {},
  ) {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', String(params.page));
      if (params.limit) queryParams.append('limit', String(params.limit));
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
      const data = result.data || {};
      return {
        items: data.items || result.items || [],
        totals: data.totals || result.totals || {},
        total: data.total ?? (data.items || []).length,
        pages: data.pages ?? 1,
      };
    } catch (error) {
      console.error('Sales Report Service Error:', error);
      throw error;
    }
  }
}
export default new SalesReportService();
