import {API_BASE_URL} from '../config/api';

export interface QbSyncStats {
  pending: number;
  in_progress: number;
  synced: number;
  failed: number;
  total: number;
  lastSyncedAt: string | null;
  lastSyncedItem: string | null;
}

export interface QbSyncQueueRecord {
  _id: string;
  itemName?: string;
  type: string;
  status: string;
  newQuantity?: number;
  quantityDifference?: number;
  retries?: number;
  enqueuedAt?: string;
  syncedAt?: string;
  lastError?: string;
}

export interface QbSyncQueueResult {
  items: QbSyncQueueRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface QbSyncSnapshotResult {
  snapshot?: {enqueued?: number};
  discrepancies?: {enqueued?: number};
}

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

class QuickBooksSyncService {
  // GET /qb-sync/stats
  async getStats(token: string): Promise<QbSyncStats> {
    const res = await fetch(`${API_BASE_URL}/qb-sync/stats`, {
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(`Failed to load QuickBooks sync stats (${res.status})`);
    const json = await res.json();
    const payload = json.data || json;
    return {
      pending: payload.pending || 0,
      in_progress: payload.in_progress || 0,
      synced: payload.synced || 0,
      failed: payload.failed || 0,
      total: payload.total || 0,
      lastSyncedAt: payload.lastSyncedAt || null,
      lastSyncedItem: payload.lastSyncedItem || null,
    };
  }

  // GET /qb-sync/queue
  async getQueue(
    token: string,
    params: {status?: string; type?: string; page?: number; limit?: number} = {},
  ): Promise<QbSyncQueueResult> {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.type) queryParams.append('type', params.type);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));
    const qs = queryParams.toString();
    const res = await fetch(`${API_BASE_URL}/qb-sync/queue${qs ? `?${qs}` : ''}`, {
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(`Failed to load QuickBooks sync queue (${res.status})`);
    const json = await res.json();
    const payload = json.data || json;
    const items = payload.items || (Array.isArray(payload) ? payload : []);
    return {
      items: Array.isArray(items) ? items : [],
      total: payload.total ?? (Array.isArray(items) ? items.length : 0),
      page: payload.page ?? params.page ?? 1,
      limit: payload.limit ?? params.limit ?? 100,
    };
  }

  // POST /qb-sync/trigger-snapshot
  async triggerSnapshot(token: string): Promise<QbSyncSnapshotResult> {
    const res = await fetch(`${API_BASE_URL}/qb-sync/trigger-snapshot`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(`Failed to trigger snapshot (${res.status})`);
    const json = await res.json();
    const payload = json.data || json;
    return payload || {};
  }

  // POST /qb-sync/retry/{id}
  async retry(token: string, id: string): Promise<QbSyncQueueRecord> {
    const res = await fetch(`${API_BASE_URL}/qb-sync/retry/${id}`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(`Failed to retry record (${res.status})`);
    const json = await res.json();
    return json.data || json;
  }
}

export default new QuickBooksSyncService();
