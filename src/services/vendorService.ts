import {API_BASE_URL} from '../config/api';

export interface Vendor {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

class VendorService {
  async getVendors(
    token: string,
    params: {search?: string; page?: number; limit?: number} = {},
  ): Promise<{vendors: Vendor[]; total: number; pages: number}> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));
    const qs = queryParams.toString();
    const response = await fetch(`${API_BASE_URL}/vendors${qs ? `?${qs}` : ''}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch vendors');
    const result = await response.json();
    // Backend returns: { success, data: { vendors: [...], total, page, pages } }
    const data = result.data || {};
    const vendors = data.vendors || result.vendors || (Array.isArray(data) ? data : []);
    return {
      vendors: Array.isArray(vendors) ? vendors : [],
      total: data.total ?? (Array.isArray(vendors) ? vendors.length : 0),
      pages: data.pages ?? 1,
    };
  }

  async getActiveVendors(token: string): Promise<Vendor[]> {
    const response = await fetch(`${API_BASE_URL}/vendors/active`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch active vendors');
    const result = await response.json();
    // Backend returns: { success: true, data: { vendors: [...], total: 1 } }
    const vendors = result.data?.vendors || result.data || result.vendors || [];
    return Array.isArray(vendors) ? vendors : [];
  }

  async createVendor(token: string, data: Partial<Vendor>): Promise<Vendor> {
    const response = await fetch(`${API_BASE_URL}/vendors`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create vendor');
    const result = await response.json();
    return result.data || result;
  }

  async updateVendor(token: string, id: string, data: Partial<Vendor>): Promise<Vendor> {
    const response = await fetch(`${API_BASE_URL}/vendors/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update vendor');
    const result = await response.json();
    return result.data || result;
  }

  async deleteVendor(token: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/vendors/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete vendor');
  }
}

export default new VendorService();
