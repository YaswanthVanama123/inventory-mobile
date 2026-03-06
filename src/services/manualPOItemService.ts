import {API_BASE_URL} from '../config/api';

export interface ManualPOItem {
  sku: string;
  name: string;
  description?: string;
  mappedCategoryItemId?: string;
  mappedCategoryItemName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

class ManualPOItemService {
  async getManualPOItems(token: string): Promise<ManualPOItem[]> {
    const response = await fetch(`${API_BASE_URL}/manual-po-items`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch manual PO items');
    const result = await response.json();
    return result.data || result;
  }

  async getActiveManualPOItems(token: string): Promise<ManualPOItem[]> {
    const response = await fetch(`${API_BASE_URL}/manual-po-items/active`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch active manual PO items');
    const result = await response.json();
    return result.data || result;
  }

  async createManualPOItem(token: string, data: Partial<ManualPOItem>): Promise<ManualPOItem> {
    const response = await fetch(`${API_BASE_URL}/manual-po-items`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create manual PO item');
    const result = await response.json();
    return result.data || result;
  }

  async updateManualPOItem(token: string, sku: string, data: Partial<ManualPOItem>): Promise<ManualPOItem> {
    const response = await fetch(`${API_BASE_URL}/manual-po-items/${encodeURIComponent(sku)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update manual PO item');
    const result = await response.json();
    return result.data || result;
  }

  async deleteManualPOItem(token: string, sku: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/manual-po-items/${encodeURIComponent(sku)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete manual PO item');
  }
}

export default new ManualPOItemService();
