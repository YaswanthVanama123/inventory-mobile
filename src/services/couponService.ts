import {API_BASE_URL} from '../config/api';

/**
 * Coupon + Payment Type Service (mobile)
 * Mirrors the webapp CouponsAndPayments page.
 *
 * Coupons (admin-only on the backend):
 * - GET    /coupons              { coupons, pagination:{total,page,pages,limit} }
 * - GET    /coupons/stats        { stats:{active,inactive,expired,total} }
 * - POST   /coupons
 * - PUT    /coupons/:id
 * - DELETE /coupons/:id
 *
 * Payment Types (read for all, write admin-only):
 * - GET    /payment-types        { paymentTypes }
 * - POST   /payment-types
 * - PUT    /payment-types/:id
 * - DELETE /payment-types/:id
 */

export interface Coupon {
  _id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumPurchase?: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usedCount?: number;
  expiryDate: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CouponStats {
  active: number;
  inactive: number;
  expired: number;
  total: number;
}

export interface PaymentType {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  order?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CouponPayload {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumPurchase?: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  expiryDate: string;
  isActive: boolean;
}

export interface PaymentTypePayload {
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  order?: number;
  isActive: boolean;
}

class CouponService {
  private authHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // ----- Coupons -----

  async getCoupons(
    token: string,
    params: {search?: string; page?: number; limit?: number} = {},
  ): Promise<{coupons: Coupon[]; total: number; pages: number}> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));
    const qs = queryParams.toString();
    const response = await fetch(
      `${API_BASE_URL}/coupons${qs ? `?${qs}` : ''}`,
      {headers: this.authHeaders(token)},
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    const json = await response.json();
    const data = json.data || json;
    const coupons = data.coupons || (Array.isArray(data) ? data : []);
    const pagination = data.pagination || {};
    return {
      coupons: Array.isArray(coupons) ? coupons : [],
      total: pagination.total ?? (Array.isArray(coupons) ? coupons.length : 0),
      pages: pagination.pages ?? 1,
    };
  }

  async getCouponStats(token: string): Promise<CouponStats> {
    const response = await fetch(`${API_BASE_URL}/coupons/stats`, {
      headers: this.authHeaders(token),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    const json = await response.json();
    const data = json.data || json;
    const stats = data.stats || {};
    return {
      active: stats.active ?? 0,
      inactive: stats.inactive ?? 0,
      expired: stats.expired ?? 0,
      total: stats.total ?? 0,
    };
  }

  async createCoupon(token: string, payload: CouponPayload): Promise<Coupon> {
    const response = await fetch(`${API_BASE_URL}/coupons`, {
      method: 'POST',
      headers: this.authHeaders(token),
      body: JSON.stringify(payload),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        json.message || `Failed to create coupon (${response.status})`,
      );
    }
    return json.data?.coupon || json.coupon || json.data || json;
  }

  async updateCoupon(
    token: string,
    id: string,
    payload: CouponPayload,
  ): Promise<Coupon> {
    const response = await fetch(`${API_BASE_URL}/coupons/${id}`, {
      method: 'PUT',
      headers: this.authHeaders(token),
      body: JSON.stringify(payload),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        json.message || `Failed to update coupon (${response.status})`,
      );
    }
    return json.data?.coupon || json.coupon || json.data || json;
  }

  async deleteCoupon(token: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/coupons/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(token),
    });
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      throw new Error(
        json.message || `Failed to delete coupon (${response.status})`,
      );
    }
  }

  // ----- Payment Types -----

  async getPaymentTypes(token: string): Promise<PaymentType[]> {
    const response = await fetch(`${API_BASE_URL}/payment-types`, {
      headers: this.authHeaders(token),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    const json = await response.json();
    const data = json.data || json;
    const types = data.paymentTypes || (Array.isArray(data) ? data : []);
    return Array.isArray(types) ? types : [];
  }

  async createPaymentType(
    token: string,
    payload: PaymentTypePayload,
  ): Promise<PaymentType> {
    const response = await fetch(`${API_BASE_URL}/payment-types`, {
      method: 'POST',
      headers: this.authHeaders(token),
      body: JSON.stringify(payload),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        json.message || `Failed to create payment type (${response.status})`,
      );
    }
    return json.data?.paymentType || json.paymentType || json.data || json;
  }

  async updatePaymentType(
    token: string,
    id: string,
    payload: PaymentTypePayload,
  ): Promise<PaymentType> {
    const response = await fetch(`${API_BASE_URL}/payment-types/${id}`, {
      method: 'PUT',
      headers: this.authHeaders(token),
      body: JSON.stringify(payload),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        json.message || `Failed to update payment type (${response.status})`,
      );
    }
    return json.data?.paymentType || json.paymentType || json.data || json;
  }

  async deletePaymentType(token: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/payment-types/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(token),
    });
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      throw new Error(
        json.message || `Failed to delete payment type (${response.status})`,
      );
    }
  }
}

export default new CouponService();
