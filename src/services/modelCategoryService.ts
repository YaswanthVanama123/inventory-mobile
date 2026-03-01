import {API_BASE_URL} from '../config/api';

class ModelCategoryService {
  async getUniqueModels(token: string) {
    try {
      const url = `${API_BASE_URL}/model-category/unique-models`;
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
        return result.data.models || [];
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
