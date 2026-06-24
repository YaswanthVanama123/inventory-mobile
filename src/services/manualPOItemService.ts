import {API_BASE_URL} from '../config/api';

export interface ManualPOItem {
  sku: string;
  name: string;
  description?: string;
  mappedCategoryItemId?: string;
  mappedCategoryItemName?: string;
  // Vendor is informational (tracking only) — matches the webapp form.
  vendorId?: any;
  vendorName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

class ManualPOItemService {
  async getManualPOItems(
    token: string,
    params: {search?: string; page?: number; limit?: number} = {},
  ): Promise<{items: ManualPOItem[]; total: number; pages: number}> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));
    const qs = queryParams.toString();
    const response = await fetch(`${API_BASE_URL}/manual-po-items${qs ? `?${qs}` : ''}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch manual PO items');
    const result = await response.json();
    // Backend returns: { success, data: { items: [...], total, page, pages } }
    const data = result.data || {};
    const items = data.items || result.items || (Array.isArray(data) ? data : []);
    return {
      items: Array.isArray(items) ? items : [],
      total: data.total ?? (Array.isArray(items) ? items.length : 0),
      pages: data.pages ?? 1,
    };
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
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to create manual PO item'));
    }
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
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to update manual PO item'));
    }
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
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to delete manual PO item'));
    }
  }
}

// Pull a useful message out of the backend's JSON error body so users see
// real errors like "SKU 'X' already exists" instead of a generic fallback.
async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return (
      body?.error?.message ||
      body?.message ||
      (typeof body?.error === 'string' ? body.error : null) ||
      fallback
    );
  } catch {
    return fallback;
  }
}

export default new ManualPOItemService();
