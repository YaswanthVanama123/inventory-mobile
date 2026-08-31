import {API_BASE_URL} from '../config/api';

export interface CaseQuantityItem {
  sku: string;
  itemName: string;
  source: string;
  categoryItemName: string | null;
  isMapped: boolean;
  unitsPerCase: number;
  purchaseUnitLabel: string;
  sellingUnitLabel: string;
  notes: string;
  orderCount: number;
  lastOrderDate: string | null;
  lastUnitPrice: number;
  orderedCases: number;
  countedCases: number;
  orderedUnits: number;
  countedUnits: number;
}

export interface CaseQuantityStats {
  total: number;
  mapped: number;
  unmapped: number;
  bulk: number;
}

/**
 * Case Quantity (pack size) mappings.
 *
 * Purchase orders count in cases; stock, sales and truck checkouts count in
 * single selling units. These mappings say how many units a case holds so one
 * purchased case of 200 adds 200 units while one sale removes one unit.
 */
class ItemCaseQuantityService {
  async getPurchasedItems(
    token: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: 'all' | 'mapped' | 'unmapped' | 'bulk';
    } = {},
  ): Promise<{
    items: CaseQuantityItem[];
    stats: CaseQuantityStats | null;
    pagination: {total: number; page: number; limit: number; totalPages: number};
  }> {
    const qs = new URLSearchParams();
    if (params.page) qs.append('page', String(params.page));
    if (params.limit) qs.append('limit', String(params.limit));
    if (params.search) qs.append('search', params.search);
    if (params.status && params.status !== 'all') qs.append('status', params.status);
    const query = qs.toString();
    const url = `${API_BASE_URL}/case-quantity/purchased-items${query ? `?${query}` : ''}`;

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
    const result = await response.json();
    if (result.success && result.data) {
      return {
        items: result.data.items || [],
        stats: result.data.stats || null,
        pagination: result.data.pagination || {
          total: result.data.items?.length || 0,
          page: 1,
          limit: params.limit || 20,
          totalPages: 1,
        },
      };
    }
    throw new Error('Invalid response format');
  }

  async saveMapping(
    token: string,
    data: {
      sku: string;
      itemName?: string;
      unitsPerCase: number;
      purchaseUnitLabel?: string;
      sellingUnitLabel?: string;
      notes?: string;
    },
  ) {
    const response = await fetch(`${API_BASE_URL}/case-quantity/mapping`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return response.json();
  }

  async deleteMapping(token: string, sku: string) {
    const response = await fetch(
      `${API_BASE_URL}/case-quantity/mapping/${encodeURIComponent(sku)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return response.json();
  }
}

export default new ItemCaseQuantityService();
