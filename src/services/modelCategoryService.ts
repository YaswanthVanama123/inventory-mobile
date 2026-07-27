import {API_BASE_URL} from '../config/api';

class ModelCategoryService {
  /**
   * Fetch one page of unique models. The backend paginates (default limit 20)
   * and applies `search`/`status` server-side over the FULL set, so these
   * params must be forwarded — otherwise only the first 20 of ~336 models are
   * ever visible and searching can't reach the rest (notably manual PO items,
   * which sort after the CustomerConnect SKUs).
   */
  async getUniqueModels(
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
      const url = `${API_BASE_URL}/model-category/unique-models${query ? `?${query}` : ''}`;
      console.log('[ModelCategory] Fetching models from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('[ModelCategory] Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ModelCategory] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      console.log('[ModelCategory] Models count:', result.data?.models?.length || 0);
      if (result.success && result.data) {
        return {
          models: result.data.models || [],
          stats: result.data.stats || null,
          pagination: result.data.pagination || {
            total: result.data.models?.length || 0,
            page: 1,
            limit: params.limit || 20,
            totalPages: 1,
          },
        };
      }
      throw new Error('Invalid response format');
    } catch (error: any) {
      console.error('[ModelCategory] Service Error:', error.message);
      throw error;
    }
  }
  async getRouteStarItems(token: string) {
    try {
      const url = `${API_BASE_URL}/model-category/routestar-items`;
      console.log('[ModelCategory] Fetching RouteStar items from:', url);
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
      console.log('[ModelCategory] RouteStar items count:', result.data?.items?.length || 0);
      if (result.success && result.data) {
        return result.data.items || [];
      }
      throw new Error('Invalid response format');
    } catch (error: any) {
      console.error('[ModelCategory] Service Error:', error.message);
      throw error;
    }
  }
  async saveMapping(token: string, data: {
    modelNumber: string;
    categoryItemName: string;
    categoryItemId: string;
    notes?: string;
  }) {
    try {
      const url = `${API_BASE_URL}/model-category/mapping`;
      console.log('[ModelCategory] Saving mapping:', data.modelNumber);
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
      return result;
    } catch (error: any) {
      console.error('[ModelCategory] Save mapping error:', error.message);
      throw error;
    }
  }
  async deleteMapping(token: string, modelNumber: string) {
    try {
      const url = `${API_BASE_URL}/model-category/mapping/${modelNumber}`;
      console.log('[ModelCategory] Deleting mapping:', modelNumber);
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
      console.error('[ModelCategory] Delete mapping error:', error.message);
      throw error;
    }
  }
}
export default new ModelCategoryService();
