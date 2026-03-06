import {API_BASE_URL} from '../config/api';

export interface ManualOrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ManualOrder {
  orderNumber: string;
  source: 'manual';
  vendor: {
    name: string;
  };
  orderDate: string;
  items: ManualOrderItem[];
  total: number;
  status: string;
  stockProcessed: boolean;
}

class ManualOrderService {
  async getNextOrderNumber(token: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/manual-orders/next-number`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch next order number');
    const result = await response.json();
    return result.data.orderNumber || result.orderNumber;
  }

  async createManualOrder(token: string, data: Partial<ManualOrder>): Promise<ManualOrder> {
    const response = await fetch(`${API_BASE_URL}/manual-orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create manual order');
    const result = await response.json();
    return result.data || result;
  }

  async getManualOrders(token: string): Promise<ManualOrder[]> {
    const response = await fetch(`${API_BASE_URL}/manual-orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch manual orders');
    const result = await response.json();
    return result.data || result;
  }
}

export default new ManualOrderService();
