import {colors} from './colors';

/**
 * Centralized status color system
 * Provides consistent colors for status indicators, badges, and tags across the app
 * Each status has both text (color) and background (bgColor) variants
 */

export const status = {
  // Invoice status
  invoice: {
    draft: {
      color: colors.gray[500],
      bgColor: colors.gray[100],
    },
    issued: {
      color: colors.primary[600],
      bgColor: colors.primary[100],
    },
    paid: {
      color: colors.success[600],
      bgColor: colors.success[100],
    },
    cancelled: {
      color: colors.error[600],
      bgColor: colors.error[100],
    },
  },

  // Payment status
  payment: {
    pending: {
      color: colors.warning[600],
      bgColor: colors.warning[100],
    },
    paid: {
      color: colors.success[600],
      bgColor: colors.success[100],
    },
    overdue: {
      color: colors.error[600],
      bgColor: colors.error[100],
    },
  },

  // Stock status
  stock: {
    inStock: {
      color: colors.success[600],
      bgColor: colors.success[100],
    },
    lowStock: {
      color: colors.warning[600],
      bgColor: colors.warning[100],
    },
    outOfStock: {
      color: colors.error[600],
      bgColor: colors.error[100],
    },
  },

  // Order status
  order: {
    pending: {
      color: colors.warning[600],
      bgColor: colors.warning[100],
    },
    processing: {
      color: colors.primary[600],
      bgColor: colors.primary[100],
    },
    completed: {
      color: colors.success[600],
      bgColor: colors.success[100],
    },
    cancelled: {
      color: colors.error[600],
      bgColor: colors.error[100],
    },
  },

  // Fetch/Sync status
  fetch: {
    pending: {
      color: colors.warning[600],
      bgColor: colors.warning[100],
    },
    inProgress: {
      color: colors.primary[600],
      bgColor: colors.primary[100],
    },
    completed: {
      color: colors.success[600],
      bgColor: colors.success[100],
    },
    failed: {
      color: colors.error[600],
      bgColor: colors.error[100],
    },
    cancelled: {
      color: colors.gray[500],
      bgColor: colors.gray[100],
    },
  },

  // General boolean status
  general: {
    active: {
      color: colors.success[600],
      bgColor: colors.success[100],
    },
    inactive: {
      color: colors.gray[500],
      bgColor: colors.gray[100],
    },
    enabled: {
      color: colors.primary[600],
      bgColor: colors.primary[100],
    },
    disabled: {
      color: colors.gray[500],
      bgColor: colors.gray[100],
    },
    success: {
      color: colors.success[600],
      bgColor: colors.success[100],
    },
    warning: {
      color: colors.warning[600],
      bgColor: colors.warning[100],
    },
    error: {
      color: colors.error[600],
      bgColor: colors.error[100],
    },
    info: {
      color: colors.primary[600],
      bgColor: colors.primary[100],
    },
  },
};

/**
 * Helper functions to get status colors
 * These provide a fallback to prevent runtime errors
 */

export const getInvoiceStatusColors = (invoiceStatus: string) => {
  const key = invoiceStatus?.toLowerCase() as keyof typeof status.invoice;
  return status.invoice[key] || status.invoice.draft;
};

export const getPaymentStatusColors = (paymentStatus: string) => {
  const key = paymentStatus?.toLowerCase() as keyof typeof status.payment;
  return status.payment[key] || status.payment.pending;
};

export const getStockStatusColors = (stockStatus: string) => {
  const normalizedKey = stockStatus?.toLowerCase().replace(/[_-]/g, '') as 'instock' | 'lowstock' | 'outofstock';
  const mapping = {
    instock: status.stock.inStock,
    lowstock: status.stock.lowStock,
    outofstock: status.stock.outOfStock,
  };
  return mapping[normalizedKey] || status.stock.inStock;
};

export const getOrderStatusColors = (orderStatus: string) => {
  const key = orderStatus?.toLowerCase() as keyof typeof status.order;
  return status.order[key] || status.order.pending;
};

export const getFetchStatusColors = (fetchStatus: string) => {
  const normalizedKey = fetchStatus?.toLowerCase().replace(/[_-]/g, '') as 'pending' | 'inprogress' | 'completed' | 'failed' | 'cancelled';
  const mapping = {
    pending: status.fetch.pending,
    inprogress: status.fetch.inProgress,
    completed: status.fetch.completed,
    failed: status.fetch.failed,
    cancelled: status.fetch.cancelled,
  };
  return mapping[normalizedKey] || status.fetch.pending;
};

export const getGeneralStatusColors = (generalStatus: string) => {
  const key = generalStatus?.toLowerCase() as keyof typeof status.general;
  return status.general[key] || status.general.info;
};
