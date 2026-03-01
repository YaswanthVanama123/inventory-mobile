import {API_BASE_URL} from '../config/api';

interface InvoiceParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

class InvoiceService {
  async getInvoices(token: string, params: InvoiceParams = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.paymentStatus) queryParams.append('paymentStatus', params.paymentStatus);
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);

      const url = `${API_BASE_URL}/invoices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

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
        totalPages: result.data?.totalPages || result.totalPages || 1,
        total: result.data?.total || result.total || 0,
        currentPage: result.data?.currentPage || result.currentPage || 1,
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

      // Handle different response structures
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

      // Handle different response structures
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
}

export default new InvoiceService();
