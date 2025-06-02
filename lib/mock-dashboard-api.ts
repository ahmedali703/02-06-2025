export const mockDashboardGeneration = async (prompt: string, databaseId: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200000));
    
    return {
      blocks: [
        {
          id: "revenue_trend",
          type: "line_chart",
          title: "Revenue Trend Analysis",
          query: "SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as revenue FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH) GROUP BY month ORDER BY month",
          data: [
            { month: "2024-01", revenue: 15000 },
            { month: "2024-02", revenue: 18000 },
            { month: "2024-03", revenue: 22000 },
            { month: "2024-04", revenue: 19000 },
            { month: "2024-05", revenue: 25000 },
          ],
          insights: [
            "Revenue has grown 67% over the past 12 months",
            "Strongest growth occurred in March and May",
            "Average monthly revenue is $19,800"
          ],
          chartConfig: {
            xAxisKey: "month",
            yAxisKey: "revenue",
            type: "line"
          }
        },
        {
          id: "top_customers",
          type: "bar_chart", 
          title: "Top Customers by Revenue",
          query: "SELECT customer_name, SUM(amount) as total_spent FROM orders JOIN customers ON orders.customer_id = customers.id GROUP BY customer_id ORDER BY total_spent DESC LIMIT 10",
          data: [
            { customer_name: "Acme Corp", total_spent: 45000 },
            { customer_name: "TechStart Inc", total_spent: 38000 },
            { customer_name: "Global Solutions", total_spent: 32000 },
            { customer_name: "Innovation Labs", total_spent: 28000 },
            { customer_name: "Future Systems", total_spent: 25000 },
          ],
          insights: [
            "Top 5 customers represent 42% of total revenue",
            "Acme Corp is your highest value customer",
            "Customer concentration risk is moderate"
          ],
          chartConfig: {
            xAxisKey: "customer_name", 
            yAxisKey: "total_spent",
            type: "bar"
          }
        },
        {
          id: "product_performance",
          type: "pie_chart",
          title: "Product Category Performance", 
          query: "SELECT category, SUM(quantity * price) as revenue FROM order_items JOIN products ON order_items.product_id = products.id GROUP BY category",
          data: [
            { category: "Software", revenue: 85000, percentage: 45 },
            { category: "Hardware", revenue: 65000, percentage: 34 },
            { category: "Services", revenue: 40000, percentage: 21 },
          ],
          insights: [
            "Software products drive 45% of revenue",
            "Hardware sales are growing 15% quarter-over-quarter", 
            "Services represent an untapped opportunity"
          ],
          chartConfig: {
            nameKey: "category",
            valueKey: "revenue", 
            type: "pie"
          }
        }
      ],
      summary: {
        keyInsights: [
          "Revenue growth of 67% year-over-year shows strong business momentum",
          "Customer diversification is healthy with moderate concentration risk",
          "Software products are the primary revenue driver",
          "Q2 performance exceeded expectations with $25K peak month"
        ],
        overallAnalysis: "Your business demonstrates strong growth patterns with diversified revenue streams. The 67% year-over-year growth indicates healthy market demand and effective sales execution. Focus on nurturing top customer relationships while expanding the services segment for additional growth opportunities."
      }
    };
  };