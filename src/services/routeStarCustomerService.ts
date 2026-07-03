import {API_BASE_URL} from '../config/api';

export interface RouteStarCustomerParams {
  page?: number;
  limit?: number;
  search?: string;
  customerType?: string;
  salesRep?: string;
  status?: string;
  active?: string;
}

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

async function parse(response: Response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((json && (json.message || json.error)) || `API Error ${response.status}`);
  }
  return json;
}

class RouteStarCustomerService {
  async getCustomers(token: string, params: RouteStarCustomerParams = {}) {
    const qp = new URLSearchParams();
    if (params.page) qp.append('page', String(params.page));
    if (params.limit) qp.append('limit', String(params.limit));
    if (params.search) qp.append('search', params.search);
    if (params.customerType) qp.append('customerType', params.customerType);
    if (params.salesRep) qp.append('salesRep', params.salesRep);
    if (params.status) qp.append('status', params.status);
    if (params.active) qp.append('active', params.active);
    const qs = qp.toString();
    const res = await fetch(`${API_BASE_URL}/routestar-customers${qs ? `?${qs}` : ''}`, {
      headers: authHeaders(token),
    });
    const json = await parse(res);
    const payload = json.data || json;
    return {
      customers: payload.customers || [],
      pagination: payload.pagination || {totalCount: 0, currentPage: 1, limit: 50, totalPages: 0},
    };
  }

  async getCustomerStats(token: string) {
    const res = await fetch(`${API_BASE_URL}/routestar-customers/stats`, {headers: authHeaders(token)});
    const json = await parse(res);
    const payload = json.data || json;
    return {
      totalCustomers: payload.totalCustomers || 0,
      activeCustomers: payload.activeCustomers || 0,
      inactiveCustomers: payload.inactiveCustomers || 0,
    };
  }

  async getCustomerById(token: string, customerId: string) {
    const res = await fetch(`${API_BASE_URL}/routestar-customers/${encodeURIComponent(customerId)}`, {
      headers: authHeaders(token),
    });
    const json = await parse(res);
    return json.data || json;
  }

  async deleteAllCustomers(token: string) {
    const res = await fetch(`${API_BASE_URL}/routestar-customers/all`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    return parse(res);
  }

  async syncCustomers(token: string) {
    const res = await fetch(`${API_BASE_URL}/routestar-customers/sync`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return parse(res);
  }

  async syncCustomerDetails(token: string) {
    const res = await fetch(`${API_BASE_URL}/routestar-customers/sync-details`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({}),
    });
    return parse(res);
  }

  async getCustomersFromClosedInvoices(token: string, startDate?: string, endDate?: string) {
    const qp = new URLSearchParams();
    if (startDate) qp.append('startDate', startDate);
    if (endDate) qp.append('endDate', endDate);
    const qs = qp.toString();
    const res = await fetch(
      `${API_BASE_URL}/routestar-customers/from-closed-invoices${qs ? `?${qs}` : ''}`,
      {headers: authHeaders(token)},
    );
    const json = await parse(res);
    const payload = json.data || json;
    return {
      customers: payload.customers || payload || [],
    };
  }
}

export default new RouteStarCustomerService();
