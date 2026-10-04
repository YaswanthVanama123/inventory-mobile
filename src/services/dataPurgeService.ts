import {API_BASE_URL} from '../config/api';

export const PURGE_CONFIRM_PHRASE = 'DELETE';

export interface PurgeType {
  key: string;
  label: string;
  group: string;
  description: string;
  count: number;
}

export interface PurgeResult {
  type: string;
  label?: string;
  deleted: number;
  cascaded: Record<string, number>;
  mode: string;
}

const request = async (token: string, path: string, init: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(payload?.message || `API Error ${response.status}: ${text}`);
  }
  return payload;
};

class DataPurgeService {
  async getTypes(token: string): Promise<{types: PurgeType[]; totalRecords: number}> {
    const result = await request(token, '/data-purge/types');
    if (result?.success && result.data) {
      return {
        types: result.data.types || [],
        totalRecords: result.data.totalRecords || 0,
      };
    }
    throw new Error('Invalid response format');
  }

  async purgeSelected(token: string, type: string, ids: string[]): Promise<PurgeResult> {
    const result = await request(token, `/data-purge/${type}/purge`, {
      method: 'POST',
      body: JSON.stringify({ids}),
    });
    return result?.data;
  }

  async purgeAll(token: string, type: string): Promise<PurgeResult> {
    const result = await request(token, `/data-purge/${type}/purge-all`, {
      method: 'POST',
      body: JSON.stringify({confirm: PURGE_CONFIRM_PHRASE}),
    });
    return result?.data;
  }

  async purgeManyTypes(
    token: string,
    types: string[],
  ): Promise<{results: PurgeResult[]; failed: {type: string; message: string}[]; totalDeleted: number}> {
    const result = await request(token, '/data-purge/purge-many', {
      method: 'POST',
      body: JSON.stringify({types, confirm: PURGE_CONFIRM_PHRASE}),
    });
    return result?.data;
  }
}

export default new DataPurgeService();
