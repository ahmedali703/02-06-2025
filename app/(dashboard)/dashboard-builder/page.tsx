'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicChart } from '../../../components/dynamic-chart';
import { v4 as uuidv4 } from 'uuid';
import { DashboardConfig, Chart } from './schemas';
import { 
  saveDashboard, 
  listDashboards, 
  getDashboard, 
  deleteDashboard, 
  explainChartQuery,
  refreshChartData 
} from './actions';
import { toast } from 'sonner';
import { ChartInsight,DashboardInsight, StreamingDashboardResponse } from './mock-generator';
import { cn } from '../../../lib/utils';
import { createDefaultPosition } from '../../../lib/utils';



// Types
interface DashboardStats {
  total: number;
  successful: number;
  failed: number;
}

interface SavedDashboard {
  uuid: string;
  name: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

function enhanceDashboardConfig(dashboard: DashboardConfig): DashboardConfig {
  console.log(`Enhancing dashboard config with ${dashboard.charts.length} charts`);
  
  const positionedCharts = dashboard.charts.map((chart, index) => {
    if (!chart.position || 
        typeof chart.position.x !== 'number' || 
        typeof chart.position.y !== 'number' || 
        typeof chart.position.w !== 'number' || 
        typeof chart.position.h !== 'number') {
      
      console.log(`Setting default position for chart ${index}: ${chart.title}`);
      chart.position = createDefaultPosition(index, dashboard.layout?.columns || 12);
    }
    
    // Ensure bounds
    chart.position.x = Math.max(0, Math.min(11, chart.position.x));
    chart.position.y = Math.max(0, chart.position.y);
    chart.position.w = Math.max(1, Math.min(12, chart.position.w));
    chart.position.h = Math.max(1, Math.min(6, chart.position.h));
    
    if (chart.position.x + chart.position.w > 12) {
      chart.position.w = 12 - chart.position.x;
    }
    
    if (!chart.description) {
      chart.description = `Visualization of ${chart.title.toLowerCase()}`;
    }
    
    if (!chart.id) {
      chart.id = `chart-${chart.type}-${index}-${Date.now()}`;
    }
    
    return chart;
  });
  
  const maxY = Math.max(...positionedCharts.map(c => c.position.y + c.position.h));
  
  if (!dashboard.layout || 
      typeof dashboard.layout.columns !== 'number' || 
      typeof dashboard.layout.rows !== 'number') {
    
    dashboard.layout = {
      columns: 12,
      rows: Math.max(4, Math.ceil(maxY)),
      gap: 16,
      padding: 16
    };
  }
  
  dashboard.refreshInterval = dashboard.refreshInterval || 300;
  dashboard.theme = dashboard.theme || 'system';
  dashboard.exportOptions = dashboard.exportOptions || {
    pdf: true,
    csv: true,
    image: true
  };
  
  return {
    ...dashboard,
    charts: positionedCharts
  };
}

// Add ChartSkeleton component
const ChartSkeleton = ({ position }: { position: { x: number; y: number; w: number; h: number } }) => {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
      style={{
        gridColumn: `span ${position.w}`,
        gridRow: `span ${position.h}`,
      }}
    >
      {/* Title skeleton */}
      <div className="flex flex-col space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
      
      {/* Chart area skeleton */}
      <div className="mt-4 h-[calc(100%-4rem)] bg-gray-100 dark:bg-gray-500 rounded relative">
        {Array.from({ length: 8 }, (_, i) => (
          <div 
            key={i}
            className="absolute bottom-0 bg-gray-200 dark:bg-gray-700"
            style={{
              left: `${i * 12.5}%`,
              width: '8%',
              height: `${20 + Math.random() * 60}%`
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Modify DashboardGrid component to include skeletons
const DashboardGrid = ({ 
  charts, 
  layout, 
  onChartClick,
  onRefreshChart,
  isPreview = false,
  isGenerating = false,
  expectedCharts = 4
}: { 
  charts: Chart[]; 
  layout: { columns: number; rows: number; gap?: number };
  onChartClick?: (chart: Chart) => void;
  onRefreshChart?: (chart: Chart) => void;
  isPreview?: boolean;
  isGenerating?: boolean;
  expectedCharts?: number;
}) => {
  const getGridClass = (cols: number) => {
    switch(cols) {
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      default: return 'grid-cols-3';
    }
  };

  // Calculate how many skeletons to show
  const skeletonsToShow = isGenerating ? 
    Math.max(expectedCharts - charts.length, 0) : 0;
  
  // Create skeleton positions
  const skeletonPositions = Array.from({ length: skeletonsToShow }, (_, i) => ({
    x: 0,
    y: (charts.length + i) * 2,
    w: 12,
    h: 2
  }));
  
  console.log("charts", charts);

  return (
    <div 
      className={`grid ${getGridClass(layout.columns)} auto-rows-[minmax(300px,auto)]`}
      style={{ gap: `${layout.gap || 16}px` }}
    >
      {/* Render existing charts */}
      {charts.map((chart: Chart) => (
        <div
          key={chart.id}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 transition-all duration-200 hover:shadow-lg ${
            chart.error ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : ''
          }`}
          style={{
            gridColumn: `span ${chart.position.w}`,
            gridRow: `span ${chart.position.h}`,
          }}
        >
          <div className="flex justify-between items-start mb-3">
            <div 
              className={`flex-1 ${onChartClick ? 'cursor-pointer' : ''}`}
              onClick={() => onChartClick?.(chart)}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {chart.title.substring(0, 20)}...
              </h3>
              {chart.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {chart.description}
                </p>
              )}
            </div>
            {!isPreview && onRefreshChart && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshChart(chart);
                }}
                className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Refresh chart data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="">
            {chart.error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {chart.error}
                  </p>
                </div>
              </div>
            ) : chart.data && chart.data.length > 0 ? (
              <>
                <div className="h-[calc(100%-2rem)]">
                  <DynamicChart 
                    chartData={chart.data}
                    chartConfig={{
                      type: chart.type === 'donut' ? 'pie' : 
                            chart.type === 'scatter' ? 'line' :
                            chart.type === 'table' ? 'bar' :
                            chart.type === 'card' ? 'bar' : chart.type,
                      title: '',
                      description: '',
                      xKey: (chart as any).xAxis || (chart as any).dataKey || (chart as any).nameKey || (chart as any).xKey ||  'category',
                      yKeys: [(chart as any).yAxis || (chart as any).valueKey || (chart as any).colorBy || (chart as any).yKey ||  'value'],
                      colors: {},
                      legend: ['pie', 'donut'].includes(chart.type),
                      takeaway: ''
                    }}
                  />
                </div>
                {chart.insights && chart.insights.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <span className="text-foreground text-sm">Insights: </span>
                    {chart.insights.map((insight, idx) => {
                      const severityClass = 
                        insight.severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
                        insight.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' :
                        'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';

                      return (
                        <div
                          key={`${chart.id}-insight-${idx}`}
                          className={`inline-flex items-center ${severityClass} rounded-full px-3 py-1 text-sm`}
                          title={insight.description}
                        >
                          <span className="font-medium">
                            {insight.key}:
                          </span>
                          <span className="ml-1">
                            {typeof insight.value === 'number' ? 
                              insight.value.toLocaleString() : 
                              insight.value}
                          </span>
                          {insight.trend && (
                            <span className={`ml-1 ${
                              insight.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                              insight.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                              'text-gray-600 dark:text-gray-400'
                            }`}>
                              {insight.trend === 'up' ? '↑' : insight.trend === 'down' ? '↓' : '→'}
                              {insight.changePercent && ` ${insight.changePercent}%`}
                            </span>
                          )}
                          {insight.thresholds && (
                            <span className="ml-1 text-xs opacity-75" title={`Warning: ${insight.thresholds.warning}, Critical: ${insight.thresholds.critical}`}>
                              ⚠️
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002 2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    No data available
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Render skeletons for loading charts */}
      {skeletonsToShow > 0 && skeletonPositions.map((position, index) => (
        <ChartSkeleton key={`skeleton-${index}`} position={position} />
      ))}
    </div>
  );
};

// Chart Detail Modal Component
const ChartDetailModal = ({ 
  chart, 
  isOpen, 
  onClose 
}: { 
  chart: Chart | null; 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  const [explanation, setExplanation] = useState<string>('');
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  useEffect(() => {
    if (isOpen && chart?.sql) {
      loadExplanation();
    }
  }, [isOpen, chart]);

  const loadExplanation = async () => {
    if (!chart?.sql) return;
    
    setIsLoadingExplanation(true);
    try {
      const result = await explainChartQuery(chart.title, chart.sql);
      if (result.success) {
        setExplanation(result.explanation);
      }
    } catch (error) {
      console.error('Error loading explanation:', error);
      setExplanation('Unable to load explanation.');
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  if (!isOpen || !chart) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {chart.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {chart.description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chart Visualization */}
          <div className="mb-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            {chart.data && chart.data.length > 0 ? (
              <DynamicChart 
                chartData={chart.data}
                chartConfig={{
                  type: chart.type === 'donut' ? 'pie' : 
                        chart.type === 'scatter' ? 'line' :
                        chart.type === 'table' ? 'bar' :
                        chart.type === 'card' ? 'bar' : chart.type,
                  title: '',
                  description: '',
                  xKey: (chart as any).xAxis || (chart as any).dataKey || (chart as any).nameKey || (chart as any).xKey || 'category',
                  yKeys: [(chart as any).yAxis || (chart as any).valueKey || (chart as any).colorBy || (chart as any).yKey || 'value'],
                  colors: {},
                  legend: ['pie', 'donut'].includes(chart.type),
                  takeaway: ''
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 dark:text-gray-400">No data available</p>
              </div>
            )}
          </div>

          {/* SQL Query */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              SQL Query
            </h3>
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                {chart.sql}
              </pre>
            </div>
          </div>

          {/* Query Explanation */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Query Explanation
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              {isLoadingExplanation ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span className="text-blue-600 dark:text-blue-400">Loading explanation...</span>
                </div>
              ) : (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {explanation || 'No explanation available.'}
                </p>
              )}
            </div>
          </div>

          {/* Chart Insights */}
          {chart.insights && chart.insights.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chart.insights.map((insight, idx) => {
                  const severityClass = 
                    insight.severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                    insight.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';

                  return (
                    <div
                      key={`${chart.id}-insight-${idx}`}
                      className={cn(`rounded-lg p-4 border`, severityClass)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="text-foreground">
                          <h4 className="font-medium mb-1 capitalize">
                            {insight.key.replace(/_/g, ' ')}
                          </h4>
                          <p className="text-sm opacity-90 mb-2">
                            {insight.description}
                          </p>
                          <div className="text-lg font-semibold">
                            {typeof insight.value === 'number' ? 
                              insight.value.toLocaleString() : 
                              insight.value}
                          </div>
                        </div>
                        {insight.trend && (
                          <div className={`ml-2 ${
                            insight.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                            insight.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                            'text-gray-600 dark:text-gray-400'
                          }`}>
                            {insight.trend === 'up' ? '↑' : insight.trend === 'down' ? '↓' : '→'}
                            {insight.changePercent && (
                              <div className="text-sm mt-1">
                                {insight.changePercent > 0 ? '+' : ''}{insight.changePercent}%
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {insight.thresholds && (
                        <div className="mt-2 text-sm border-t border-current pt-2 opacity-75">
                          <div>Warning threshold: {insight.thresholds.warning}</div>
                          <div>Critical threshold: {insight.thresholds.critical}</div>
                        </div>
                      )}
                      {insight.timeframe && (
                        <div className="mt-2 text-sm opacity-75">
                          Timeframe: {insight.timeframe}
                        </div>
                      )}
                      {insight.benchmark !== undefined && (
                        <div className="mt-2 text-sm opacity-75">
                          Benchmark: {insight.benchmark}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Data Preview */}
          {chart.data && chart.data.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Data Preview ({chart.data.length} rows)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {Object.keys(chart.data[0]).map((key) => (
                        <th
                          key={key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {chart.data.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                          >
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {chart.data.length > 10 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Showing first 10 of {chart.data.length} rows
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Builder Component
export default function DashboardBuilder() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig | null>(null);
  const [savedDashboards, setSavedDashboards] = useState<SavedDashboard[]>([]);
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState<string | null>(null);
  const [refreshingChart, setRefreshingChart] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<DashboardInsight[]>([]);  

  // Fetch saved dashboards
  useEffect(() => {
    fetchSavedDashboards();
  }, []);

  // Fetch saved dashboards
  const fetchSavedDashboards = async () => {
    try {
      const result = await listDashboards();
      if (result.success) {
        setSavedDashboards(result.dashboards || []);
      }
    } catch (error) {
      console.error('Error fetching dashboards:', error);
      toast.error('Failed to load saved dashboards');
    }
  };

  // Generate dashboard
  const handleGenerateDashboard = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a dashboard description');
      return;
    }

    setIsGenerating(true);
    setDashboardConfig(null);
    setStats(null);
    setInsights([]); // Reset insights

    try {
      const response = await fetch('/api/dashboard/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate dashboard');
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      // Read the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode the chunk and add it to our buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete JSON objects from the buffer
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          // Extract one line and parse it
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.trim()) {
            try {
              const chunk: StreamingDashboardResponse = JSON.parse(line);
              
              // Handle each type of response
              switch (chunk.type) {
                case 'init':
                  if (chunk.data.config) {
                    setDashboardConfig(prev => ({
                      ...chunk.data.config,
                      charts: [],
                    } as any));
                    setDashboardName(`Dashboard - ${new Date().toLocaleDateString()}`);
                  }
                  break;

                case 'chart':
                  if (chunk.data.chart) {
                    setDashboardConfig(prev => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        charts: [...prev.charts, chunk.data.chart!]
                      };
                    });
                  }
                  break;

                case 'insights':
                  if (chunk.data.insights) {
                    setInsights(chunk.data.insights);
                  }
                  break;

                case 'complete':
                  if (chunk.data.stats) {
                    setStats(chunk.data.stats);
                  }
                  if (chunk.data.message) {
                    toast.success(chunk.data.message);
                  }
                  if (dashboardConfig) {
                    setDashboardConfig(enhanceDashboardConfig(dashboardConfig));
                  }
                  break;

                case 'error':
                  if (chunk.data.error) {
                    throw new Error(chunk.data.error);
                  }
                  break;
              }
            } catch (e: any) {
              console.error('Error parsing chunk:', e);
              toast.error(e.message || 'Error parsing server response');
            }
          }
        }
      }

    } catch (error: any) {
      console.error('Error generating dashboard:', error);
      toast.error(error.message || 'Failed to generate dashboard');
      
      // Reset state on error
      setDashboardConfig(null);
      setStats(null);
      setInsights([]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save dashboard
  const handleSaveDashboard = async () => {
    if (!dashboardConfig) {
      toast.error('No dashboard to save');
      return;
    }

    if (!dashboardName.trim()) {
      toast.error('Please enter a name for the dashboard');
      return;
    }

    console.log({...dashboardConfig, insights});

    try {
      const uuid = uuidv4();
      const result = await saveDashboard(uuid, dashboardName, {...dashboardConfig, insights});
      
      if (result.success) {
        await fetchSavedDashboards();
        toast.success('Dashboard saved successfully');
      }
    } catch (error: any) {
      console.error('Error saving dashboard:', error);
      toast.error(error.message || 'Failed to save dashboard');
    }
  };

  // Load dashboard
  const handleLoadDashboard = async (uuid: string) => {
    setLoadingDashboard(uuid);
    try {
      const result = await getDashboard(uuid);
      
      if (result.success) {
        setDashboardConfig(result.config);
        setInsights(result.config.insights)
        setDashboardName(result.name);
        toast.success(`Loaded "${result.name}"`);
        
        // Calculate stats
        const charts = result.config.charts || [];
        setStats({
          total: charts.length,
          successful: charts.filter((c: Chart) => !c.error && c.data && c.data.length > 0).length,
          failed: charts.filter((c: Chart) => c.error).length
        });
      }
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      toast.error(error.message || 'Failed to load dashboard');
    } finally {
      setLoadingDashboard(null);
    }
  };

  // Delete dashboard
  const handleDeleteDashboard = async (uuid: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;

    try {
      const result = await deleteDashboard(uuid);
      
      if (result.success) {
        await fetchSavedDashboards();
        toast.success('Dashboard deleted');
      }
    } catch (error: any) {
      console.error('Error deleting dashboard:', error);
      toast.error(error.message || 'Failed to delete dashboard');
    }
  };

  // Refresh single chart
  const handleRefreshChart = useCallback(async (chart: Chart) => {
    if (!chart.id) return;
    
    setRefreshingChart(chart.id);
    try {
      const result = await refreshChartData(chart.sql);
      
      if (result.success && dashboardConfig) {
        // Update chart data and insights in dashboard config
        const updatedCharts = dashboardConfig.charts.map(c => 
          c.id === chart.id ? { 
            ...c, 
            data: result.data, 
            error: undefined 
          } : c
        );
        
        setDashboardConfig({
          ...dashboardConfig,
          charts: updatedCharts
        });
        
        toast.success(`Refreshed ${chart.title}`);
      }
    } catch (error: any) {
      console.error('Error refreshing chart:', error);
      toast.error(`Failed to refresh ${chart.title}`);
     
      // Update chart with error
      if (dashboardConfig) {
        const updatedCharts = dashboardConfig.charts.map(c => 
          c.id === chart.id ? { ...c, error: error.message } : c
        );
        
        setDashboardConfig({
          ...dashboardConfig,
          charts: updatedCharts
        });
      }
    } finally {
      setRefreshingChart(null);
    }
  }, [dashboardConfig]);

 return (
   <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
     <div className="container mx-auto px-4 py-8">
       {/* Header */}
       <div className="mb-8">
         <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
           AI Dashboard Builder
         </h1>
         <p className="text-gray-600 dark:text-gray-400">
           Create interactive dashboards using natural language
         </p>
       </div>
       
       <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
         {/* Sidebar - Saved Dashboards */}
         <div className="xl:col-span-1">
           <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
             <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
               Saved Dashboards
             </h2>
             
             {savedDashboards.length === 0 ? (
               <div className="text-center py-8">
                 <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
                 <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                   No saved dashboards
                 </p>
               </div>
             ) : (
               <div className="space-y-3 max-h-[600px] overflow-y-auto">
                 {savedDashboards.map((dashboard) => (
                   <div
                     key={dashboard.uuid}
                     className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                   >
                     <div className="flex justify-between items-start">
                       <button
                         onClick={() => handleLoadDashboard(dashboard.uuid)}
                         disabled={loadingDashboard === dashboard.uuid}
                         className="text-left flex-1 group"
                       >
                         <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                           {dashboard.name}
                         </h3>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                           {new Date(dashboard.updated_at).toLocaleDateString()}
                         </p>
                       </button>
                       
                       <div className="flex items-center space-x-1 ml-2">
                         {loadingDashboard === dashboard.uuid && (
                           <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                           </svg>
                         )}
                         <button
                           onClick={() => handleDeleteDashboard(dashboard.uuid, dashboard.name)}
                           className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                           title="Delete dashboard"
                         >
                           <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                           </svg>
                         </button>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
         </div>
         
         {/* Main Content */}
         <div className="xl:col-span-3 space-y-6">
           {/* Prompt Input */}
           <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
             <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
               Create New Dashboard
             </h2>
             
             <div className="space-y-4">
               <div>
                 <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                   Describe your dashboard
                 </label>
                 <textarea
                   id="prompt"
                   rows={3}
                   className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                   placeholder="Example: Create a sales dashboard showing revenue trends, top products, and customer distribution..."
                   value={prompt}
                   onChange={(e) => setPrompt(e.target.value)}
                   disabled={isGenerating}
                 />
               </div>
               
               <button
                 onClick={handleGenerateDashboard}
                 disabled={isGenerating || !prompt.trim()}
                 className={`w-full py-3 px-6 rounded-lg text-white font-medium transition-all duration-200 ${
                   isGenerating || !prompt.trim()
                     ? 'bg-gray-400 cursor-not-allowed'
                     : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                 }`}
               >
                 {isGenerating ? (
                   <span className="flex items-center justify-center">
                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                     </svg>
                     Generating Dashboard...
                   </span>
                 ) : (
                   'Generate Dashboard'
                 )}
               </button>
             </div>
           </div>
           
           {/* Dashboard Preview */}
           {(dashboardConfig || isGenerating) && (
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
               <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-3 sm:space-y-0">
                 <div>
                   <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                     {dashboardConfig?.title || 'Generating Dashboard...'}
                   </h2>
                   <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                     {dashboardConfig?.description || 'Please wait while we create your dashboard'}
                   </p>
                 </div>
                 
                 {dashboardConfig && (
                   <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                     <input
                       type="text"
                       className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                       placeholder="Dashboard name"
                       value={dashboardName}
                       onChange={(e) => setDashboardName(e.target.value)}
                     />
                     
                     <button
                       onClick={handleSaveDashboard}
                       disabled={!dashboardName.trim()}
                       className={`py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                         dashboardName.trim()
                           ? 'bg-green-600 hover:bg-green-700 text-white'
                           : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                       }`}
                     >
                       Save Dashboard
                     </button>
                   </div>
                 )}
               </div>
               
               {/* Dashboard Stats */}
               {stats && (
                 <div className="grid grid-cols-3 gap-4 mb-6">
                   <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                     <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                       {stats.total}
                     </div>
                     <div className="text-sm text-blue-600 dark:text-blue-400">Total Charts</div>
                   </div>
                   <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                     <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                       {stats.successful}
                     </div>
                     <div className="text-sm text-green-600 dark:text-green-400">Successful</div>
                   </div>
                   <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                     <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                       {stats.failed}
                     </div>
                     <div className="text-sm text-red-600 dark:text-red-400">Failed</div>
                   </div>
                 </div>
               )}

               {/* Dashboard Insights */}
               {insights && insights.length > 0 && (
                 <div className="mb-6">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                       Key Insights
                     </h3>
                     <span className="text-sm text-gray-500 dark:text-gray-400">
                       {insights.length} insights found
                     </span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {insights.map((insight) => {
                       const severityColors = {
                         info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
                         warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
                         critical: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                       };
                       
                       const trendIcons = {
                         up: (
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                           </svg>
                         ),
                         down: (
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                           </svg>
                         ),
                         stable: (
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                           </svg>
                         )
                       };

                       return (
                         <div
                           key={insight.id}
                           className={`p-4 rounded-lg ${severityColors[insight.severity]} transition-all duration-200 hover:shadow-md`}
                         >
                           <div className="flex items-start justify-between">
                             <div className="flex-1">
                               <h4 className="font-semibold mb-1">
                                 {insight.title}
                               </h4>
                               <p className="text-sm opacity-90">
                                 {insight.description}
                               </p>
                               {insight.metric !== undefined && (
                                 <div className="mt-2 text-lg font-semibold">
                                   {insight.metric}
                                   {insight.changePercent && (
                                     <span className={`ml-2 text-sm ${
                                       insight.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                                       insight.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                                       'text-gray-600 dark:text-gray-400'
                                     }`}>
                                       ({insight.changePercent > 0 ? '+' : ''}{insight.changePercent}%)
                                     </span>
                                   )}
                                 </div>
                               )}
                             </div>
                             {insight.trend && (
                               <div className="ml-4 flex items-center">
                                 {trendIcons[insight.trend]}
                               </div>
                             )}
                           </div>
                           {insight.relatedChartIds && insight.relatedChartIds.length > 0 && (
                             <div className="mt-2 text-xs opacity-75">
                               Related to {insight.relatedChartIds.length} chart{insight.relatedChartIds.length !== 1 ? 's' : ''}
                             </div>
                           )}
                         </div>
                       );
                     })}
                   </div>
                 </div>
               )}
               
               {/* Dashboard Grid */}
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                     Dashboard Preview
                   </h3>
                   <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                     {refreshingChart && (
                       <span className="flex items-center">
                         <svg className="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                         </svg>
                         Refreshing...
                       </span>
                     )}
                     <span>Click chart for details</span>
                   </div>
                 </div>
                 
                 <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                   <DashboardGrid
                     charts={dashboardConfig?.charts || []}
                     layout={dashboardConfig?.layout || { columns: 12, rows: 4, gap: 16, padding: 16 }}
                     onChartClick={setSelectedChart}
                     onRefreshChart={handleRefreshChart}
                     isGenerating={isGenerating}
                     expectedCharts={4}
                   />
                 </div>
               </div>
               
               {/* Configuration Details */}
               <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                 <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                   Configuration
                 </h4>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                   <div>
                     <span className="text-gray-500 dark:text-gray-400">Theme:</span>
                     <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
                       {dashboardConfig?.theme}
                     </span>
                   </div>
                   <div>
                     <span className="text-gray-500 dark:text-gray-400">Layout:</span>
                     <span className="ml-2 font-medium text-gray-900 dark:text-white">
                       {dashboardConfig?.layout.columns}×{dashboardConfig?.layout.rows}
                     </span>
                   </div>
                   <div>
                     <span className="text-gray-500 dark:text-gray-400">Refresh:</span>
                     <span className="ml-2 font-medium text-gray-900 dark:text-white">
                       {dashboardConfig?.refreshInterval}s
                     </span>
                   </div>
                 </div>
               </div>
             </div>
           )}
           
           {/* Empty State */}
           {!dashboardConfig && !isGenerating && (
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-8">
               <div className="text-center">
                 <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
                 <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No dashboard</h3>
                 <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                   Get started by creating a new dashboard or loading a saved one.
                 </p>
                 
                 <div className="mt-6">
                   <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                     Example Prompts:
                   </h4>
                   <div className="space-y-2 text-sm text-left max-w-lg mx-auto">
                     <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                          onClick={() => setPrompt("Create a sales performance dashboard with revenue trends, top products, regional distribution, and customer segments")}>
                       Sales performance dashboard with revenue trends and customer insights
                     </div>
                     <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                          onClick={() => setPrompt("Build an HR analytics dashboard showing employee headcount, department distribution, salary analysis, and hiring trends")}>
                       HR analytics with employee metrics and organizational insights
                     </div>
                     <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                          onClick={() => setPrompt("Design an inventory management dashboard with stock levels, product categories, low stock alerts, and turnover rates")}>
                       Inventory management with stock tracking and product analysis
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           )}
         </div>
       </div>
     </div>
     
     {/* Chart Detail Modal */}
     <ChartDetailModal
       chart={selectedChart}
       isOpen={!!selectedChart}
       onClose={() => setSelectedChart(null)}
     />
   </div>
 );
}