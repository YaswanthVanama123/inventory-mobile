import {API_BASE_URL} from '../config/api';

/**
 * Report service for the mobile app.
 *
 * Mirrors the webapp's reportService, targeting the same backend endpoints:
 *   GET /reports/sales             -> sales analytics
 *   GET /reports/dashboard         -> reports hub summary
 *   GET /reports/export-customers  -> CSV of unique customers (RouteStar closed invoices)
 *
 * Fetch pattern: Bearer token, parse `json.data || json`.
 */

export interface SalesReportSummary {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  totalInvoices: number;
  averageOrderValue: number;
  profitMargin: number | string;
}

export interface SalesReportCategoryStat {
  category: string;
  sales: number;
  quantity: number;
  profit: number;
}

export interface SalesReportChartPoint {
  period: string;
  sales: number;
  cost: number;
  profit: number;
  invoices: number;
}

export interface SalesReportData {
  summary: SalesReportSummary;
  chartData: SalesReportChartPoint[];
  categoryStats: SalesReportCategoryStat[];
  paymentStatusStats?: {[key: string]: number};
  recentInvoices?: any[];
}

export interface DashboardSummary {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalProfit: number;
  profitMargin: number;
  revenueChange: number;
  lowStockCount: number;
  reorderCount: number;
  totalValue?: number;
}

export interface DashboardTopItem {
  itemName: string;
  skuCode: string;
  value: number;
  quantity: number;
  orderCount: number;
}

export interface DashboardReportData {
  summary: DashboardSummary;
  topSellingItemsDetailed: DashboardTopItem[];
}

export interface SalesReportParams {
  startDate?: string;
  endDate?: string;
  category?: string;
}

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

const buildQuery = (params: {[key: string]: string | undefined}) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

class ReportService {
  /** GET /reports/sales -> sales analytics (summary + category breakdown). */
  async sales(token: string, params: SalesReportParams = {}): Promise<SalesReportData> {
    const url = `${API_BASE_URL}/reports/sales${buildQuery({
      startDate: params.startDate,
      endDate: params.endDate,
      category: params.category,
    })}`;
    const response = await fetch(url, {headers: authHeaders(token)});
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    const json = await response.json();
    return json.data || json;
  }

  /** GET /reports/dashboard -> reports hub summary. */
  async dashboard(token: string): Promise<DashboardReportData> {
    const url = `${API_BASE_URL}/reports/dashboard`;
    const response = await fetch(url, {headers: authHeaders(token)});
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    const json = await response.json();
    return json.data || json;
  }

  /**
   * GET /reports/export-customers -> raw CSV text (unique customers from closed
   * RouteStar invoices in the date range).
   */
  async exportCustomers(
    token: string,
    startDate: string,
    endDate: string,
  ): Promise<string> {
    const url = `${API_BASE_URL}/reports/export-customers${buildQuery({
      startDate,
      endDate,
    })}`;
    const response = await fetch(url, {headers: authHeaders(token)});
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return response.text();
  }
}

export default new ReportService();
