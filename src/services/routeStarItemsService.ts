import {API_BASE_URL} from '../config/api';

class RouteStarItemsService {
  async getItems(
    token: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      itemParent?: string;
      type?: string;
      itemCategory?: string;
      forUse?: boolean;
      forSell?: boolean;
    } = {}
  ) {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.itemParent) queryParams.append('itemParent', params.itemParent);
      if (params.type) queryParams.append('type', params.type);
      if (params.itemCategory) queryParams.append('itemCategory', params.itemCategory);
      if (params.forUse !== undefined) queryParams.append('forUse', params.forUse.toString());
      if (params.forSell !== undefined) queryParams.append('forSell', params.forSell.toString());

      const url = `${API_BASE_URL}/routestar-items?${queryParams.toString()}`;
      console.log('[RouteStarItems] Fetching from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[RouteStarItems] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RouteStarItems] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[RouteStarItems] Items count:', result.data?.items?.length || 0);

      if (result.success && result.data) {
        return {
          items: result.data.items || [],
          pagination: result.data.pagination || {
            total: 0,
            page: 1,
            limit: 50,
            pages: 0,
          },
          filters: result.data.filters || {itemParents: [], types: []},
        };
      }

      return {
        items: [],
        pagination: {total: 0, page: 1, limit: 50, pages: 0},
        filters: {itemParents: [], types: []},
      };
    } catch (error: any) {
      console.error('[RouteStarItems] Service Error:', error.message);
      throw error;
    }
  }

  async getStats(token: string) {
    try {
      const url = `${API_BASE_URL}/routestar-items/stats`;
      console.log('[RouteStarItems] Fetching stats from:', url);

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
        return result.data || {
          total: 0,
          forUse: 0,
          forSell: 0,
          both: 0,
          unmarked: 0,
        };
      }

      return {total: 0, forUse: 0, forSell: 0, both: 0, unmarked: 0};
    } catch (error: any) {
      console.error('[RouteStarItems] Stats error:', error.message);
      throw error;
    }
  }

  async updateItemFlags(
    token: string,
    itemId: string,
    flags: {
      forUse?: boolean;
      forSell?: boolean;
      itemCategory?: string;
    }
  ) {
    try {
      const url = `${API_BASE_URL}/routestar-items/${itemId}/flags`;
      console.log('[RouteStarItems] Updating item flags:', itemId);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flags),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('[RouteStarItems] Update flags error:', error.message);
      throw error;
    }
  }

  async syncItems(token: string) {
    try {
      const url = `${API_BASE_URL}/routestar-items/sync`;
      console.log('[RouteStarItems] Syncing items');

      const response = await fetch(url, {
        method: 'POST',
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
      return result.data;
    } catch (error: any) {
      console.error('[RouteStarItems] Sync error:', error.message);
      throw error;
    }
  }
}

export default new RouteStarItemsService();
