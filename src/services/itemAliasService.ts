import {API_BASE_URL} from '../config/api';

class ItemAliasService {
  async getAllMappings(token: string) {
    try {
      const url = `${API_BASE_URL}/routestar-item-alias/mappings`;
      console.log('[ItemAlias] Fetching mappings from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('[ItemAlias] Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ItemAlias] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      console.log('[ItemAlias] Mappings count:', result.data?.mappings?.length || 0);
      if (result.success && result.data) {
        return result.data.mappings || [];
      }
      return [];
    } catch (error: any) {
      console.error('[ItemAlias] Service Error:', error.message);
      throw error;
    }
  }
  async getUniqueItems(token: string) {
    try {
      const url = `${API_BASE_URL}/routestar-item-alias/unique-items`;
      console.log('[ItemAlias] Fetching unique items from:', url);
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
      console.log('[ItemAlias] Unique items count:', result.data?.items?.length || 0);
      if (result.success && result.data) {
        return {
          items: result.data.items || [],
          stats: result.data.stats || {
            totalUniqueItems: 0,
            mappedItems: 0,
            unmappedItems: 0,
          },
        };
      }
      return {
        items: [],
        stats: {totalUniqueItems: 0, mappedItems: 0, unmappedItems: 0},
      };
    } catch (error: any) {
      console.error('[ItemAlias] Service Error:', error.message);
      throw error;
    }
  }
  async saveMapping(
    token: string,
    data: {
      canonicalName: string;
      aliases: string[];
      description?: string;
      autoMerge?: boolean;
    }
  ) {
    try {
      const url = `${API_BASE_URL}/routestar-item-alias/mapping`;
      console.log('[ItemAlias] Saving mapping:', data.canonicalName);
      const response = await fetch(url, {
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
      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('[ItemAlias] Save mapping error:', error.message);
      throw error;
    }
  }
  async updateMapping(
    token: string,
    id: string,
    data: {
      canonicalName: string;
      aliases: string[];
      description?: string;
      autoMerge?: boolean;
    }
  ) {
    try {
      const url = `${API_BASE_URL}/routestar-item-alias/mapping/${id}`;
      console.log('[ItemAlias] Updating mapping:', id);
      const response = await fetch(url, {
        method: 'PUT',
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
      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('[ItemAlias] Update mapping error:', error.message);
      throw error;
    }
  }
  async deleteMapping(token: string, id: string) {
    try {
      const url = `${API_BASE_URL}/routestar-item-alias/mapping/${id}`;
      console.log('[ItemAlias] Deleting mapping:', id);
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
      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('[ItemAlias] Delete mapping error:', error.message);
      throw error;
    }
  }
  /**
   * OPTIMIZED: Get all page data in one API call
   * Combines mappings, unique items, and stats into single request
   */
  /**
   * Fetch one page of unique items. The backend paginates (default limit 20)
   * and applies `search`/`status` server-side over the FULL set, so these
   * params must be forwarded — otherwise only the first 20 items are ever
   * reachable and search can't see the rest.
   */
  async getPageData(
    token: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: 'all' | 'mapped' | 'unmapped';
    } = {},
  ) {
    try {
      const qs = new URLSearchParams();
      if (params.page) qs.append('page', String(params.page));
      if (params.limit) qs.append('limit', String(params.limit));
      if (params.search) qs.append('search', params.search);
      if (params.status && params.status !== 'all') qs.append('status', params.status);
      const query = qs.toString();
      const url = `${API_BASE_URL}/routestar-item-alias/page-data${query ? `?${query}` : ''}`;
      console.log('[ItemAlias] Fetching combined page data from:', url);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('[ItemAlias] Page data response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ItemAlias] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      console.log('[ItemAlias] Page data received:', {
        mappings: result.data?.mappings?.mappings?.length || 0,
        items: result.data?.uniqueItems?.items?.length || 0,
        stats: result.data?.uniqueItems?.stats || result.data?.stats,
      });
      if (result.success && result.data) {
        return {
          mappings: result.data.mappings?.mappings || [],
          items: result.data.uniqueItems?.items || [],
          // Full unpaginated set — quick-map / suggestions need every item.
          allItems: result.data.uniqueItems?.allItems || [],
          pagination: result.data.uniqueItems?.pagination || {
            total: result.data.uniqueItems?.items?.length || 0,
            page: 1,
            limit: params.limit || 20,
            totalPages: 1,
          },
          stats: result.data.uniqueItems?.stats || result.data.stats || {
            totalUniqueItems: 0,
            mappedItems: 0,
            unmappedItems: 0,
          },
        };
      }
      return {
        mappings: [],
        items: [],
        allItems: [],
        pagination: {total: 0, page: 1, limit: params.limit || 20, totalPages: 1},
        stats: {totalUniqueItems: 0, mappedItems: 0, unmappedItems: 0},
      };
    } catch (error: any) {
      console.error('[ItemAlias] Page data error:', error.message);
      throw error;
    }
  }
}
export default new ItemAliasService();
