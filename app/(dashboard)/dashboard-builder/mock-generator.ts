import { DashboardConfig, Chart } from './schemas';

export interface ChartInsight {
  key: string;
  value: string | number;
  description: string;
  type: 'trend' | 'summary' | 'comparison' | 'anomaly';
  severity: 'info' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
  timeframe?: string;
  benchmark?: number;
  thresholds?: {
    warning: number;
    critical: number;
  };
}

export interface DashboardInsight {
  id: string;
  title: string;
  description: string;
  type: 'trend' | 'anomaly' | 'comparison' | 'summary';
  severity: 'info' | 'warning' | 'critical';
  metric?: number;
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
  relatedChartIds?: string[];
}

export interface Stats {
  id: string;
  title: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend?: 'up' | 'down' | 'stable';
  format?: 'number' | 'currency' | 'percent';
}

export interface DashboardStats {
  total: number;
  successful: number;
  failed: number;
}

  // Generate chart-specific insights
  const generateInsights = (data: any[], type: string): ChartInsight[] => {
    const insights: ChartInsight[] = [];
    
    if (data && data.length > 0) {
      // Calculate total/average based on chart type
      const values = data.map(d => Number(d.value));
      const total = values.reduce((a, b) => a + b, 0);
      const avg = total / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      switch (type) {
        case 'bar':
          insights.push({
            key: 'distribution',
            value: avg,
            description: 'Average distribution across categories',
            type: 'summary',
            severity: 'info',
            trend: avg > values[0] ? 'up' : 'down',
            changePercent: Math.round(((avg - values[0]) / values[0]) * 100)
          });
          insights.push({
            key: 'topContributors',
            value: max,
            description: 'Highest contributing category',
            type: 'comparison',
            severity: 'info'
          });
          break;
          
        case 'line':
          insights.push({
            key: 'trend',
            value: values[values.length - 1],
            description: 'Overall trend analysis',
            type: 'trend',
            severity: 'info',
            trend: values[values.length - 1] > values[0] ? 'up' : 'down',
            changePercent: Math.round(((values[values.length - 1] - values[0]) / values[0]) * 100),
            timeframe: 'Last 5 periods'
          });
          // Add anomaly detection
          const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length);
          const hasAnomaly = values.some(v => Math.abs(v - avg) > 2 * stdDev);
          if (hasAnomaly) {
            insights.push({
              key: 'anomaly',
              value: max,
              description: 'Potential anomaly detected',
              type: 'anomaly',
              severity: 'warning',
              thresholds: {
                warning: avg + stdDev,
                critical: avg + 2 * stdDev
              }
            });
          }
          break;
          
        case 'area':
          insights.push({
            key: 'trend',
            value: values[values.length - 1],
            description: 'Cumulative trend analysis',
            type: 'trend',
            severity: 'info',
            trend: values[values.length - 1] > values[0] ? 'up' : 'down',
            changePercent: Math.round(((values[values.length - 1] - values[0]) / values[0]) * 100)
          });
          insights.push({
            key: 'composition',
            value: total,
            description: 'Total composition analysis',
            type: 'summary',
            severity: 'info'
          });
          break;
          
        case 'pie':
        case 'donut':
          insights.push({
            key: 'composition',
            value: total,
            description: 'Total segment distribution',
            type: 'summary',
            severity: 'info'
          });
          insights.push({
            key: 'dominance',
            value: Math.round((max / total) * 100),
            description: 'Largest segment percentage',
            type: 'comparison',
            severity: max / total > 0.5 ? 'warning' : 'info',
            thresholds: {
              warning: 50,
              critical: 75
            }
          });
          break;
          
        case 'card':
          insights.push({
            key: 'status',
            value: data[0].value,
            description: 'Current metric status',
            type: 'summary',
            severity: 'info',
            trend: Math.random() > 0.5 ? 'up' : 'down',
            changePercent: Math.round(Math.random() * 20),
            thresholds: {
              warning: data[0].value * 0.8,
              critical: data[0].value * 0.6
            }
          });
          break;
          
        case 'table':
          insights.push({
            key: 'summary',
            value: data.length,
            description: 'Total records summary',
            type: 'summary',
            severity: 'info'
          });
          insights.push({
            key: 'aggregation',
            value: total,
            description: 'Total value aggregation',
            type: 'summary',
            severity: 'info'
          });
          break;
          
        case 'scatter':
          const correlation = Math.random(); // In real app, calculate actual correlation
          insights.push({
            key: 'correlation',
            value: correlation,
            description: 'Correlation strength',
            type: 'summary',
            severity: correlation > 0.7 ? 'warning' : 'info',
            thresholds: {
              warning: 0.7,
              critical: 0.9
            }
          });
          insights.push({
            key: 'outliers',
            value: values.filter(v => Math.abs(v - avg) > 2 * Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length)).length,
            description: 'Number of outlier points',
            type: 'anomaly',
            severity: 'info'
          });
          break;
      }
    }
    
    return insights;
  };

function createMockChart(index: number): Chart {
  const types: Chart['type'][] = ['bar', 'line', 'area', 'pie', 'donut', 'card', 'table', 'scatter'];
  const type = types[index % types.length];
  
  
  const baseChart = {
    id: `chart-${type}-${index}`,
    title: `Sample ${type.charAt(0).toUpperCase() + type.slice(1)} Chart ${index + 1}`,
    description: `This is a sample ${type} chart for testing purposes`,
    position: {
      x: (index * 4) % 12,
      y: Math.floor((index * 4) / 12) * 2,
      w: 4,
      h: 2
    },
    sql: "SELECT 'Sample' as category, 100 as value FROM DUAL",
  };



  // Add type-specific properties
  switch (type) {
    case 'card':
      return {
        ...baseChart,
        type,
        valueKey: 'value',
        data: [{ category: 'Sample', value: 100 }],
        insights: generateInsights([{ category: 'Sample', value: 100 }], type)
      };
    case 'table':
      const tableData = [
        { category: 'Sample 1', value: 100 },
        { category: 'Sample 2', value: 200 },
        { category: 'Sample 3', value: 300 }
      ];
      return {
        ...baseChart,
        type,
        columns: [
          { key: 'category', title: 'Category' },
          { key: 'value', title: 'Value' }
        ],
        data: tableData,
        insights: generateInsights(tableData, type)
      };
    case 'pie':
    case 'donut':
      const pieData = [
        { category: 'A', value: 30 },
        { category: 'B', value: 40 },
        { category: 'C', value: 30 }
      ];
      return {
        ...baseChart,
        type,
        dataKey: 'value',
        colorBy: 'category',
        data: pieData,
        insights: generateInsights(pieData, type)
      };
    default:
      const chartData = [
        { category: 'Jan', value: 100 },
        { category: 'Feb', value: 200 },
        { category: 'Mar', value: 150 },
        { category: 'Apr', value: 300 },
        { category: 'May', value: 250 }
      ];
      return {
        ...baseChart,
        type,
        xAxis: 'category',
        yAxis: 'value',
        data: chartData,
        insights: generateInsights(chartData, type)
      };
  }
}

function createMockInsights(charts: Chart[]): DashboardInsight[] {
  const insights: DashboardInsight[] = [];
  
  // Generate trend insight
  insights.push({
    id: 'insight-trend-1',
    title: 'Positive Growth Trend',
    description: 'Overall metrics show a 15% increase compared to last period',
    type: 'trend',
    severity: 'info',
    metric: 15,
    trend: 'up',
    changePercent: 15,
    relatedChartIds: charts.slice(0, 2).map(c => c.id || "")
  });

  // Generate anomaly insight with thresholds
  insights.push({
    id: 'insight-anomaly-1',
    title: 'Unusual Activity Detected',
    description: 'Significant spike in values detected in the last 24 hours',
    type: 'anomaly',
    severity: 'warning',
    metric: 250,
    trend: 'up',
    changePercent: 150,
    relatedChartIds: [charts[0].id || ""]
  });

  // Generate comparison insight with benchmark
  insights.push({
    id: 'insight-comparison-1',
    title: 'Performance Comparison',
    description: 'Current performance is 20% better than the previous period',
    type: 'comparison',
    severity: 'info',
    metric: 120,
    changePercent: 20,
    trend: 'up',
    relatedChartIds: charts.slice(0, 3).map(c => c.id || "")
  });

  // Generate summary insight
  insights.push({
    id: 'insight-summary-1',
    title: 'Overall Health Score',
    description: 'System health indicators are within normal ranges',
    type: 'summary',
    severity: 'info',
    metric: 85,
    relatedChartIds: charts.map(c => c.id || "")
  });

  return insights;
}

function createMockStats(): Stats[] {
  return [
    {
      id: 'stat-1',
      title: 'Total Revenue',
      value: 150000,
      previousValue: 120000,
      change: 30000,
      changePercent: 25,
      trend: 'up',
      format: 'currency'
    },
    {
      id: 'stat-2',
      title: 'Conversion Rate',
      value: 3.5,
      previousValue: 3.2,
      change: 0.3,
      changePercent: 9.4,
      trend: 'up',
      format: 'percent'
    },
    {
      id: 'stat-3',
      title: 'Active Users',
      value: 25000,
      previousValue: 28000,
      change: -3000,
      changePercent: -10.7,
      trend: 'down',
      format: 'number'
    }
  ];
}

export type StreamingDashboardResponse = {
  type: 'init' | 'chart' | 'insights' | 'complete' | 'error';
  data: {
    config?: Partial<DashboardConfig>;
    chart?: Chart;
    insights?: DashboardInsight[];
    stats?: DashboardStats;
    message?: string;
    error?: string;
  };
};

export async function* generateMockDashboardStream(prompt: string): AsyncGenerator<StreamingDashboardResponse> {
  // Initial dashboard structure
  const numCharts = 4 + Math.floor(Math.random() * 3); // 4-6 charts
  const initialConfig: Partial<DashboardConfig> = {
    title: `Dashboard: ${prompt.substring(0, 50)}...`,
    description: 'This is a mock dashboard for testing purposes',
    charts: [],
    insights: [],
    layout: {
      columns: 12,
      rows: Math.ceil((numCharts * 4) / 12) * 2,
      gap: 16,
      padding: 16
    },
    theme: 'system',
    refreshInterval: 300,
    exportOptions: {
      pdf: true,
      csv: true,
      image: true
    }
  };

  // Emit initial configuration
  yield {
    type: 'init',
    data: { config: initialConfig }
  };

  // Generate and emit charts one by one
  const charts: Chart[] = [];
  for (let i = 0; i < numCharts; i++) {
    // Simulate processing time for each chart
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    const chart = createMockChart(i);
    charts.push(chart);
    
    // Randomly make this chart fail (20% chance)
    if (Math.random() < 0.2) {
      chart.error = 'This is a simulated error for testing purposes';
      delete chart.data;
    }

    yield {
      type: 'chart',
      data: { chart }
    };
  }

  // Generate and emit insights
  await new Promise(resolve => setTimeout(resolve, 800));
  const insights = createMockInsights(charts);
  yield {
    type: 'insights',
    data: { insights }
  };

  // Calculate final stats
  const stats: DashboardStats = {
    total: charts.length,
    successful: charts.filter(c => !c.error).length,
    failed: charts.filter(c => c.error).length
  };

  // Emit completion
  yield {
    type: 'complete',
    data: {
      stats,
      message: `Mock dashboard generated successfully with ${stats.successful} charts out of ${stats.total} total (${stats.failed} failed)`
    }
  };
}

// Keep the non-streaming version for backwards compatibility
export async function generateMockDashboard(prompt: string): Promise<{
  success: boolean;
  config: DashboardConfig;
  stats?: DashboardStats;
  message: string;
}> {
  const charts: Chart[] = [];
  const stream = generateMockDashboardStream(prompt);
  let config: Partial<DashboardConfig> = {};
  let insights: DashboardInsight[] = [];
  let stats: DashboardStats | undefined;
  let message;

  for await (const response of stream) {
    switch (response.type) {
      case 'init':
        config = response.data.config || {};
        break;
      case 'chart':
        if (response.data.chart) {
          charts.push(response.data.chart);
        }
        break;
      case 'insights':
        if (response.data.insights) {
          insights = response.data.insights;
        }
        break;
      case 'complete':
        stats = response.data.stats;
        message = response.data.message;
        break;
    }
  }

  return {
    success: true,
    config: { ...config, charts, insights } as DashboardConfig,
    stats,
    message: message || 'Dashboard generated successfully'
  };
}

/**
 * Refresh a single chart with new mock data
 */
export async function refreshChartData(chart: Chart): Promise<{
  success: boolean;
  data: any[];
  insights: ChartInsight[];
}> {
  // Generate new mock data based on chart type
  const generateMockData = (type: string) => {
    const now = new Date();
    switch (type) {
      case 'bar':
      case 'line':
      case 'area':
        return [
          { category: 'Jan', value: Math.round(Math.random() * 400 + 100) },
          { category: 'Feb', value: Math.round(Math.random() * 400 + 100) },
          { category: 'Mar', value: Math.round(Math.random() * 400 + 100) },
          { category: 'Apr', value: Math.round(Math.random() * 400 + 100) },
          { category: 'May', value: Math.round(Math.random() * 400 + 100) }
        ];
      
      case 'pie':
      case 'donut':
        return [
          { category: 'A', value: Math.round(Math.random() * 30 + 20) },
          { category: 'B', value: Math.round(Math.random() * 30 + 20) },
          { category: 'C', value: Math.round(Math.random() * 30 + 20) }
        ];
      
      case 'card':
        return [{ 
          category: 'Current', 
          value: Math.round(Math.random() * 1000 + 500) 
        }];
      
      case 'table':
        return [
          { category: 'Sample 1', value: Math.round(Math.random() * 300 + 100) },
          { category: 'Sample 2', value: Math.round(Math.random() * 300 + 100) },
          { category: 'Sample 3', value: Math.round(Math.random() * 300 + 100) }
        ];
      
      case 'scatter':
        return Array.from({ length: 10 }, (_, i) => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 20 + 5
        }));
      
      default:
        return [];
    }
  };

  // Generate new data
  const newData = generateMockData(chart.type);
  
  // Generate new insights for the data
  const newInsights = generateInsights(newData, chart.type);

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return {
    success: true,
    data: newData,
    insights: newInsights
  };
} 