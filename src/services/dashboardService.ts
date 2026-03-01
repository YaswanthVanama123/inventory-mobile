import {API_BASE_URL} from '../config/api';

class DashboardService {
  async getDashboardData(token: string) {
    try {
      const url = `${API_BASE_URL}/reports/dashboard`;
      console.log('[Dashboard] Fetching from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[Dashboard] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Dashboard] Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[Dashboard] Response data:', JSON.stringify(result).substring(0, 200));

      if (result.success && result.data) {
        return this.transformDashboardData(result.data);
      }

      throw new Error('Invalid response format');
    } catch (error: any) {
      console.error('[Dashboard] Service Error:', error.message);
      console.error('[Dashboard] Full error:', error);
      throw error;
    }
  }

  transformDashboardData(data: any) {
    const { summary, recentActivity, topSellingItems, topSellingItemsDetailed, salesTrend, invoiceStatusStats } = data;

    // Transform invoice status stats into pie chart data
    const statusColors: {[key: string]: string} = {
      'Pending': '#F59E0B', // Amber
      'Completed': '#10B981', // Green
      'Closed': '#3B82F6', // Blue
      'Cancelled': '#EF4444', // Red
    };

    const statusDistribution = invoiceStatusStats ? Object.keys(invoiceStatusStats)
      .filter(status => invoiceStatusStats[status] > 0)
      .map((status) => ({
        name: status,
        population: invoiceStatusStats[status],
        color: statusColors[status] || '#64748B',
        legendFontColor: '#64748B',
      })) : [
        {name: 'Completed', population: 100, color: '#10B981', legendFontColor: '#64748B'},
      ];

    return {
      kpis: {
        totalRevenue: summary.totalRevenue || 0,
        revenueChange: `${summary.revenueChange >= 0 ? '+' : ''}${summary.revenueChange}%`,
        totalOrders: summary.totalOrders || 0,
        ordersChange: `${summary.ordersChange >= 0 ? '+' : ''}${summary.ordersChange}%`,
        avgOrderValue: summary.avgOrderValue || 0,
        inventoryValue: summary.totalValue || 0,
        lowStock: summary.lowStockCount || 0,
        lowStockChange: `${summary.lowStockChange >= 0 ? '+' : ''}${summary.lowStockChange}%`,
      },
      revenueTrend: {
        labels: (salesTrend || []).map((item: any) => item.month),
        datasets: [
          {
            data: (salesTrend || []).map((item: any) => item.revenue || 0),
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            strokeWidth: 3,
          },
          {
            data: (salesTrend || []).map((item: any) => item.profit || 0),
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            strokeWidth: 3,
          },
        ],
        legend: ['Revenue', 'Profit'],
      },
      topProducts: topSellingItems || {
        labels: [],
        datasets: [{data: []}],
      },
      statusDistribution: statusDistribution,
      recentActivity: (recentActivity || []).slice(0, 10).map((activity: any) => ({
        id: activity._id || activity.id,
        type: activity.type || 'update',
        message: activity.message || `${activity.action} - ${activity.itemName || 'Item'}`,
        timestamp: activity.timestamp || activity.createdAt,
      })),
    };
  }
}

export default new DashboardService();

