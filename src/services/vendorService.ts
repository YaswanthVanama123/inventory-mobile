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
  async getVendors(token: string): Promise<Vendor[]> {
    const response = await fetch(`${API_BASE_URL}/vendors`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch vendors');
    const result = await response.json();
    // Backend returns: { success: true, data: { vendors: [...], total: 1 } }
    const vendors = result.data?.vendors || result.data || result.vendors || [];
    return Array.isArray(vendors) ? vendors : [];
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
