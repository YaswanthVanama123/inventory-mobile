import {API_BASE_URL} from '../config/api';

export interface ItemUsage {
  itemName: string;
  itemCode: string;
  category: string;
  totalQuantity: number;
  totalInvoices: number;
  lastUsedDate: string;
  averageQuantityPerInvoice: number;
}

export interface InvoiceUsageStats {
  totalItems: number;
  totalInvoices: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

class ItemsInvoiceUsageService {
  // Get items invoice usage report
  async getItemsUsage(
    token: string,
    params: {
      startDate?: string;
      endDate?: string;
      category?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{items: ItemUsage[]; stats: InvoiceUsageStats; pagination: any}> {
    try {
      const queryParams = new URLSearchParams();

      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.category) queryParams.append('category', params.category);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const url = `${API_BASE_URL}/routestar/items-invoice-usage?${queryParams.toString()}`;
      console.log('[ItemsInvoiceUsageService] Fetching items usage from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[ItemsInvoiceUsageService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ItemsInvoiceUsageService] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[ItemsInvoiceUsageService] Items count:', result.data?.items?.length || 0);

      return {
        items: result.data?.items || [],
        stats: result.data?.stats || {
          totalItems: 0,
          totalInvoices: 0,
          dateRange: {startDate: '', endDate: ''},
        },
        pagination: result.data?.pagination || {
          total: 0,
          page: 1,
          limit: 50,
          pages: 0,
        },
      };
    } catch (error: any) {
      console.error('[ItemsInvoiceUsageService] Service Error:', error.message);
      throw error;
    }
  }

  // Export items usage to CSV
  async exportToCSV(
    token: string,
    params: {
      startDate?: string;
      endDate?: string;
      category?: string;
    } = {}
  ): Promise<Blob> {
    try {
      const queryParams = new URLSearchParams();

      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.category) queryParams.append('category', params.category);
      queryParams.append('format', 'csv');

      const url = `${API_BASE_URL}/routestar/items-invoice-usage/export?${queryParams.toString()}`;
      console.log('[ItemsInvoiceUsageService] Exporting to CSV');

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      return await response.blob();
    } catch (error: any) {
      console.error('[ItemsInvoiceUsageService] Export error:', error.message);
      throw error;
    }
  }
}

export default new ItemsInvoiceUsageService();
