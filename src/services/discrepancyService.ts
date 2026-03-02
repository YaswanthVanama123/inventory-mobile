import {API_BASE_URL} from '../config/api';
import storageService from './storageService';

interface CreateDiscrepancyData {
  invoiceNumber?: string;
  invoiceId?: string;
  invoiceType?: string;
  itemName: string;
  itemSku: string;
  categoryName: string;
  systemQuantity: number;
  actualQuantity: number;
  discrepancyType: string;
  reason?: string;
  notes?: string;
}

const discrepancyService = {
  // Create new discrepancy
  createDiscrepancy: async (data: CreateDiscrepancyData) => {
    const token = await storageService.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/discrepancies`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create discrepancy');
    }

    return await response.json();
  },

  // Search invoices for discrepancy recording
  searchInvoices: async (searchTerm: string, limit: number = 10) => {
    const token = await storageService.getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/routestar/invoices?search=${searchTerm}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search invoices');
    }

    return await response.json();
  },

  // Get all discrepancies
  getDiscrepancies: async (params: any = {}) => {
    const token = await storageService.getAuthToken();

    // Build query string manually (URLSearchParams not available in React Native)
    const queryParts: string[] = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);
    if (params.status) queryParts.push(`status=${params.status}`);
    if (params.type) queryParts.push(`type=${params.type}`);
    if (params.startDate) queryParts.push(`startDate=${params.startDate}`);
    if (params.endDate) queryParts.push(`endDate=${params.endDate}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const response = await fetch(
      `${API_BASE_URL}/discrepancies${queryString}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get discrepancies');
    }

    return await response.json();
  },

  // Get discrepancy summary
  getSummary: async () => {
    const token = await storageService.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/discrepancies/summary`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get summary');
    }

    return await response.json();
  },

  // Approve discrepancy
  approveDiscrepancy: async (
    id: string,
    notes: string = 'Approved from mobile app'
  ) => {
    const token = await storageService.getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/discrepancies/${id}/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({notes}),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to approve discrepancy');
    }

    return await response.json();
  },

  // Reject discrepancy
  rejectDiscrepancy: async (
    id: string,
    notes: string = 'Rejected from mobile app'
  ) => {
    const token = await storageService.getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/discrepancies/${id}/reject`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({notes}),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reject discrepancy');
    }

    return await response.json();
  },

  // Delete discrepancy
  deleteDiscrepancy: async (id: string) => {
    const token = await storageService.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/discrepancies/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete discrepancy');
    }

    return await response.json();
  },

  // Bulk approve discrepancies
  bulkApproveDiscrepancies: async (
    discrepancyIds: string[],
    notes: string = 'Bulk approved from mobile app'
  ) => {
    const token = await storageService.getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/discrepancies/bulk-approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({discrepancyIds, notes}),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to bulk approve discrepancies');
    }

    return await response.json();
  },
};

export default discrepancyService;
