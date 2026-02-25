const API_BASE_URL = 'http://192.168.1.18:5001/api';

class DashboardService {
  async getDashboardData(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();

      if (result.success && result.data) {
        return this.transformDashboardData(result.data);
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Dashboard Service Error:', error);
      throw error;
    }
  }

  transformDashboardData(data: any) {
    const { summary, categoryStats, recentActivity, topSellingItems, salesTrend } = data;

    // Calculate sales channels
    const totalSales = summary.totalRevenue || 0;
    const totalPurchases = summary.totalPurchaseAmount || 0;
    const routeStarPercentage = totalSales > 0 ? (totalSales / (totalSales + totalPurchases)) * 100 : 50;
    const customerConnectPercentage = 100 - routeStarPercentage;

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
      topProducts: {
        labels: (topSellingItems || []).slice(0, 5).map((item: any) => item.itemName),
        datasets: [{
          data: (topSellingItems || []).slice(0, 5).map((item: any) => item.value || 0),
        }],
      },
      salesByChannel: [
        {
          name: 'RouteStar',
          population: Math.round(routeStarPercentage),
          color: '#3B82F6',
          legendFontColor: '#64748B',
        },
        {
          name: 'CustomerConnect',
          population: Math.round(customerConnectPercentage),
          color: '#10B981',
          legendFontColor: '#64748B',
        },
      ].filter(channel => channel.population > 0),
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

