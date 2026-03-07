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
    // Backend returns: { success: true, data: { items: [...], total: 1 } }
    const items = result.data?.items || result.data || result.items || [];
    return Array.isArray(items) ? items : [];
  }

  async getActiveManualPOItems(token: string): Promise<ManualPOItem[]> {
    const url = `${API_BASE_URL}/manual-po-items/active`;
    console.log('[ManualPOItemService] Fetching from:', url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[ManualPOItemService] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ManualPOItemService] Error response:', errorText);
      throw new Error('Failed to fetch active manual PO items');
    }

    const result = await response.json();
    console.log('[ManualPOItemService] Raw result:', JSON.stringify(result, null, 2));

    // Backend returns: { success: true, data: { items: [...], total: 1 } }
    // So we need to access result.data.items, not result.data
    const items = result.data?.items || result.data || result.items || [];
    console.log('[ManualPOItemService] Returning items:', items.length, 'items');

    return Array.isArray(items) ? items : [];
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
