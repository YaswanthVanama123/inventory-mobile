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
}

export default new ItemAliasService();
