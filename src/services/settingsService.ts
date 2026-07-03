import {API_BASE_URL} from '../config/api';

/**
 * Settings Service (mobile)
 * Mirrors the webapp settingsService methods used by the Settings screen:
 * - getGeneralSettings   GET  /settings/general
 * - updateStockCutoffDate PUT /settings/stock-cutoff-date  { cutoffDate }
 * - updateLowStockThreshold PUT /settings/low-stock-threshold { threshold }
 */

export interface GeneralSettings {
  stockCalculationCutoffDate?: string | null;
  lowStockThreshold?: number | null;
  [key: string]: any;
}

export interface Unit {
  _id: string;
  value: string;
  label: string;
  isActive?: boolean;
}

class SettingsService {
  private authHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getGeneralSettings(token: string): Promise<GeneralSettings> {
    const response = await fetch(`${API_BASE_URL}/settings/general`, {
      headers: this.authHeaders(token),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    const json = await response.json();
    return json.data || json;
  }

  async updateStockCutoffDate(token: string, cutoffDate: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/settings/stock-cutoff-date`, {
      method: 'PUT',
      headers: this.authHeaders(token),
      body: JSON.stringify({cutoffDate}),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    const json = await response.json();
    return json.data || json;
  }

  async updateLowStockThreshold(token: string, threshold: number): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/settings/low-stock-threshold`,
      {
        method: 'PUT',
        headers: this.authHeaders(token),
        body: JSON.stringify({threshold}),
      },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    const json = await response.json();
    return json.data || json;
  }

  // ----- Units of Measurement -----

  async getUnits(token: string, includeInactive = true): Promise<Unit[]> {
    const response = await fetch(
      `${API_BASE_URL}/settings/units?includeInactive=${includeInactive}`,
      {headers: this.authHeaders(token)},
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    const json = await response.json();
    const data = json.data || json;
    const units = data.units || (Array.isArray(data) ? data : []);
    return Array.isArray(units) ? units : [];
  }

  async addUnit(
    token: string,
    unitData: {value: string; label: string},
  ): Promise<Unit> {
    const response = await fetch(`${API_BASE_URL}/settings/units`, {
      method: 'POST',
      headers: this.authHeaders(token),
      body: JSON.stringify(unitData),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json.message || `Failed to add unit (${response.status})`);
    }
    return json.data || json;
  }

  async updateUnit(
    token: string,
    id: string,
    unitData: {value: string; label: string},
  ): Promise<Unit> {
    const response = await fetch(`${API_BASE_URL}/settings/units/${id}`, {
      method: 'PUT',
      headers: this.authHeaders(token),
      body: JSON.stringify(unitData),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        json.message || `Failed to update unit (${response.status})`,
      );
    }
    return json.data || json;
  }

  async deleteUnit(token: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/settings/units/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(token),
    });
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      throw new Error(
        json.message || `Failed to delete unit (${response.status})`,
      );
    }
  }
}

export default new SettingsService();
