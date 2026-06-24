import {API_BASE_URL} from '../config/api';

export interface InvoiceRef {
  invoiceNumber: string;
  invoiceDate: string;
  customer: string;
  status: string;
  total: number;
  totalQuantity: number;
}

export interface ItemUsage {
  itemName: string;
  type: 'mapped' | 'unique';
  aliases: string[];
  invoiceCount: number;
  totalQuantitySold: number;
  invoices: InvoiceRef[];
  lastUsedDate?: string;
  averageQuantityPerInvoice?: number;
}

export interface InvoiceUsageTotals {
  totalMappedItems: number;
  totalUniqueItems: number;
  totalItems: number;
  totalInvoices: number;
}

class ItemsInvoiceUsageService {
  // Backend route is /routestar/items/invoice-usage and now supports a ?search=
  // query param (matches itemName + aliases server-side).
  async getItemsUsage(
    token: string,
    params: {search?: string; page?: number; limit?: number} = {},
  ): Promise<{items: ItemUsage[]; totals: InvoiceUsageTotals; total: number; pages: number}> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));
    const qs = queryParams.toString();
    const url = `${API_BASE_URL}/routestar/items/invoice-usage${qs ? `?${qs}` : ''}`;
    console.log('[ItemsInvoiceUsageService] Fetching items usage from:', url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ItemsInvoiceUsageService] Error response:', errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const rawItems: any[] = result.data?.items || [];

    const items: ItemUsage[] = rawItems.map(item => {
      const invoices: InvoiceRef[] = Array.isArray(item.invoices) ? item.invoices : [];
      const lastUsedDate = invoices.reduce<string | undefined>((latest, inv) => {
        if (!inv.invoiceDate) return latest;
        if (!latest) return inv.invoiceDate;
        return new Date(inv.invoiceDate) > new Date(latest) ? inv.invoiceDate : latest;
      }, undefined);
      const averageQuantityPerInvoice =
        item.invoiceCount > 0 ? item.totalQuantitySold / item.invoiceCount : 0;
      return {
        itemName: item.itemName,
        type: item.type,
        aliases: item.aliases || [],
        invoiceCount: item.invoiceCount || 0,
        totalQuantitySold: item.totalQuantitySold || 0,
        invoices,
        lastUsedDate,
        averageQuantityPerInvoice,
      };
    });

    const totals: InvoiceUsageTotals = result.data?.totals || {
      totalMappedItems: 0,
      totalUniqueItems: 0,
      totalItems: items.length,
      totalInvoices: items.reduce((sum, i) => sum + i.invoiceCount, 0),
    };

    console.log('[ItemsInvoiceUsageService] Items count:', items.length);
    return {
      items,
      totals,
      total: result.data?.total ?? items.length,
      pages: result.data?.pages ?? 1,
    };
  }
}

export default new ItemsInvoiceUsageService();
