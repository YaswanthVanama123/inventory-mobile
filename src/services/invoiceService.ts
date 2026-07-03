import {API_BASE_URL} from '../config/api';

interface InvoiceParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  invoiceType?: string;
  stockProcessed?: string;
  dateFrom?: string;
  dateTo?: string;
  dateField?: string;
}

class InvoiceService {
  async getInvoices(token: string, params: InvoiceParams = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.invoiceType) queryParams.append('invoiceType', params.invoiceType);
      if (params.stockProcessed !== undefined && params.stockProcessed !== '') {
        queryParams.append('stockProcessed', params.stockProcessed);
      }
      if (params.dateFrom) queryParams.append('startDate', params.dateFrom);
      if (params.dateTo) queryParams.append('endDate', params.dateTo);
      if (params.dateField) queryParams.append('dateField', params.dateField);
      const url = `${API_BASE_URL}/routestar/invoices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      const result = await response.json();
      return {
        invoices: result.data?.invoices || result.invoices || [],
        totalPages: result.data?.pagination?.pages || result.data?.totalPages || result.totalPages || 1,
        total: result.data?.pagination?.total || result.data?.total || result.total || 0,
        currentPage: result.data?.pagination?.page || result.data?.currentPage || result.currentPage || 1,
      };
    } catch (error) {
      console.error('Invoice Service Error:', error);
      throw error;
    }
  }
  async getInvoiceById(token: string, id: string) {
    try {
      console.log('Fetching invoice with ID:', id);
      const url = `${API_BASE_URL}/invoices/${id}`;
      console.log('Invoice Detail URL:', url);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('Invoice Detail Response Status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Invoice Detail Error Response:', errorText);
        throw new Error(`Failed to fetch invoice: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      console.log('Invoice Detail Response:', JSON.stringify(result, null, 2));
      if (result.data && result.data.invoice) {
        return result.data.invoice;
      } else if (result.data) {
        return result.data;
      } else if (result.invoice) {
        return result.invoice;
      } else {
        return result;
      }
    } catch (error) {
      console.error('Invoice Detail Service Error:', error);
      throw error;
    }
  }
  async getInvoiceByNumber(token: string, invoiceNumber: string) {
    try {
      console.log('Fetching invoice with number:', invoiceNumber);
      const url = `${API_BASE_URL}/routestar/invoices/${invoiceNumber}`;
      console.log('RouteStar Invoice Detail URL:', url);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('RouteStar Invoice Detail Response Status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('RouteStar Invoice Detail Error Response:', errorText);
        throw new Error(`Failed to fetch invoice: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      console.log('RouteStar Invoice Detail Response:', JSON.stringify(result, null, 2));
      if (result.success && result.data) {
        return result.data;
      } else if (result.data && result.data.invoice) {
        return result.data.invoice;
      } else if (result.data) {
        return result.data;
      } else if (result.invoice) {
        return result.invoice;
      } else {
        return result;
      }
    } catch (error) {
      console.error('RouteStar Invoice Detail Service Error:', error);
      throw error;
    }
  }
  async downloadPDF(token: string, id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/invoices/${id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      return response.blob();
    } catch (error) {
      console.error('PDF Download Service Error:', error);
      throw error;
    }
  }
  async syncPendingInvoices(token: string, limit: number = 0, direction: 'new' | 'old' = 'new') {
    try {
      const url = `${API_BASE_URL}/routestar/sync/pending`;
      console.log('[SyncPendingInvoices] Syncing pending invoices:', {limit, direction});
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({limit, direction}),
      });
      console.log('[SyncPendingInvoices] Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SyncPendingInvoices] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      console.log('[SyncPendingInvoices] Response data:', result);
      if (result.success) {
        return result;
      }
      throw new Error('Invalid response format');
    } catch (error: any) {
      console.error('[SyncPendingInvoices] Service Error:', error.message);
      throw error;
    }
  }
  async syncClosedInvoices(token: string, limit: number = 0, direction: 'new' | 'old' = 'new') {
    try {
      const url = `${API_BASE_URL}/routestar/sync/closed`;
      console.log('[SyncClosedInvoices] Syncing closed invoices:', {limit, direction});
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({limit, direction}),
      });
      console.log('[SyncClosedInvoices] Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SyncClosedInvoices] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      console.log('[SyncClosedInvoices] Response data:', result);
      if (result.success) {
        return result;
      }
      throw new Error('Invalid response format');
    } catch (error: any) {
      console.error('[SyncClosedInvoices] Service Error:', error.message);
      throw error;
    }
  }
  async syncAllInvoiceDetails(token: string, invoiceType: 'pending' | 'closed', limit: number = 0) {
    try {
      const url = `${API_BASE_URL}/routestar/sync/all-details`;
      console.log('[SyncAllInvoiceDetails] Syncing all invoice details:', {invoiceType, limit});
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({invoiceType, limit}),
      });
      console.log('[SyncAllInvoiceDetails] Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SyncAllInvoiceDetails] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      console.log('[SyncAllInvoiceDetails] Response data:', result);
      if (result.success) {
        return result;
      }
      throw new Error('Invalid response format');
    } catch (error: any) {
      console.error('[SyncAllInvoiceDetails] Service Error:', error.message);
      throw error;
    }
  }
  async syncPendingInvoiceDetails(token: string, limit: number = 0) {
    try {
      const url = `${API_BASE_URL}/routestar/sync/pending-details`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({limit}),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const json = await response.json();
      const payload = json.data || json;
      return {success: json.success !== false, data: payload};
    } catch (error: any) {
      console.error('[SyncPendingInvoiceDetails] Service Error:', error.message);
      throw error;
    }
  }
  async syncClosedInvoiceDetails(token: string, limit: number = 0) {
    try {
      const url = `${API_BASE_URL}/routestar/sync/closed-details`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({limit}),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const json = await response.json();
      const payload = json.data || json;
      return {success: json.success !== false, data: payload};
    } catch (error: any) {
      console.error('[SyncClosedInvoiceDetails] Service Error:', error.message);
      throw error;
    }
  }
  async getInvoiceRange(token: string, invoiceType?: 'pending' | 'closed') {
    try {
      const queryParams = new URLSearchParams();
      if (invoiceType) queryParams.append('invoiceType', invoiceType);
      const url = `${API_BASE_URL}/routestar/invoice-range${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
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
      const json = await response.json();
      const data = json.data || json;
      return {
        highest: data?.highest ?? null,
        lowest: data?.lowest ?? null,
        totalInvoices: data?.totalInvoices ?? 0,
      };
    } catch (error: any) {
      console.error('[GetInvoiceRange] Service Error:', error.message);
      throw error;
    }
  }
  async deleteAllPendingInvoices(token: string) {
    try {
      const url = `${API_BASE_URL}/routestar/invoices/pending/all`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const json = await response.json();
      const payload = json.data || json;
      return {success: json.success !== false, data: payload};
    } catch (error: any) {
      console.error('[DeleteAllPendingInvoices] Service Error:', error.message);
      throw error;
    }
  }
  async deleteAllClosedInvoices(token: string) {
    try {
      const url = `${API_BASE_URL}/routestar/invoices/closed/all`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const json = await response.json();
      const payload = json.data || json;
      return {success: json.success !== false, data: payload};
    } catch (error: any) {
      console.error('[DeleteAllClosedInvoices] Service Error:', error.message);
      throw error;
    }
  }
  async deleteBulkClosedInvoicesByNumbers(token: string, invoiceNumbers: string[]) {
    try {
      const url = `${API_BASE_URL}/routestar/invoices/bulk-delete-by-numbers`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({invoiceNumbers}),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const json = await response.json();
      const payload = json.data || json;
      return {success: json.success !== false, data: payload};
    } catch (error: any) {
      console.error('[DeleteBulkClosedInvoices] Service Error:', error.message);
      throw error;
    }
  }
  async deleteManualInvoice(token: string, invoiceNumber: string) {
    try {
      const url = `${API_BASE_URL}/routestar/invoices/manual/${encodeURIComponent(invoiceNumber)}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const json = await response.json();
      const payload = json.data || json;
      return {success: json.success !== false, data: payload};
    } catch (error: any) {
      console.error('[DeleteManualInvoice] Service Error:', error.message);
      throw error;
    }
  }
  async syncInvoiceDetails(token: string, invoiceNumber: string) {
    try {
      const url = `${API_BASE_URL}/routestar/sync/details/${encodeURIComponent(invoiceNumber)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const json = await response.json();
      const payload = json.data || json;
      return {success: json.success !== false, data: payload};
    } catch (error: any) {
      console.error('[SyncInvoiceDetails] Service Error:', error.message);
      throw error;
    }
  }
}
export default new InvoiceService();
