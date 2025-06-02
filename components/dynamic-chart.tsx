//components/dynamic-chart.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useChartTheme } from './chart-theme-wrapper';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Label,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { Config, Result } from '@/lib/types';

// Colors array
const COLORS = [
  '#4361EE', // blue
  '#3A0CA3', // dark purple
  '#7209B7', // purple
  '#F72585', // pink
  '#4CC9F0', // cyan
  '#4895EF', // light blue
  '#560BAD', // violet
  '#F72585', // pink
  '#4CC9F0', // cyan
  '#4895EF', // light blue
  '#560BAD', // violet
  '#B 79E', // medium purple
  '#3F37C9', // dark blue
  '#4361EE', // blue
  '#4CC9F0', // cyan
  '#480CA8', // dark purple
];

// إصلاح دالة toTitleCase للتعامل مع القيم غير المعرفة
function toTitleCase(str: string | undefined | null): string {
  // التحقق من وجود قيمة صالحة
  if (!str) return '';
  
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Truncate long text
function truncateText(text: string | undefined | null, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

export function DynamicChart({
  chartData,
  chartConfig,
}: {
  chartData: Result[];
  chartConfig: Config;
}) {
  const [selectedChartType, setSelectedChartType] = useState(chartConfig?.type || 'bar');
  const [mounted, setMounted] = useState(false);
  const [visibleLabels, setVisibleLabels] = useState<string[]>([]);
  const [labelThreshold, setLabelThreshold] = useState(7); // Default threshold percentage for labels
  const { isDarkMode, colors } = useChartTheme(); // Use our theme wrapper

  console.log("chartData", chartData);
  console.log("chartConfig", chartConfig);
  
  // Message when no numeric data is available
  const renderNoDataMessage = () => {
    return (
      <div className="flex items-center justify-center h-[500px] w-full bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center max-w-md px-4">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">No Numeric Data Available</h3>
          <p className="text-gray-600 dark:text-gray-400">
            The query results don't contain numeric values needed to generate a chart. 
            Try a different query or use the table view to explore the data.
          </p>
        </div>
      </div>
    );
  };
  
  // التحقق من وجود بيانات رقمية
  const hasNumericData = useMemo(() => {
    if (!chartData || chartData.length === 0) return false;
    
    return chartData.some(item => {
      if (!item) return false;
      
      // التحقق من وجود قيمة رقمية في أي حقل من حقول البيانات
      return Object.values(item).some(value => 
        typeof value === 'number' || 
        (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '')
      );
    });
  }, [chartData]);
  
  // Ensure chart is only initialized on client side
  useEffect(() => {
    setMounted(true);
    
    // Initialize visible labels with the top segments
    if (chartData && chartData.length > 0 && chartConfig?.yKeys?.length > 0) {
      const key = chartConfig.yKeys[0];
      
      // التحقق من وجود المفتاح قبل استخدامه
      if (key) {
        const total = chartData.reduce((sum, item) => {
          if (!item) return sum;
          const value = item[key];
          const numValue = typeof value === 'number' ? value : Number(value);
          return sum + (isNaN(numValue) ? 0 : numValue);
        }, 0);
        
        // Initially show labels for segments that are above the threshold
        const initialVisibleLabels = chartData
          .filter(item => {
            if (!item) return false;
            const value = item[key];
            const numValue = typeof value === 'number' ? value : Number(value);
            
            if (isNaN(numValue)) return false;
            return (numValue / total) * 100 >= labelThreshold;
          })
          .map(item => {
            const xKeyValue = item[chartConfig.xKey];
            return xKeyValue ? xKeyValue.toString() : '';
          })
          .filter(label => label !== ''); // استبعاد التسميات الفارغة
        
        setVisibleLabels(initialVisibleLabels);
      }
    }
  }, [chartData, chartConfig, labelThreshold]);
  
  // Loading indicator
  const renderLoadingIndicator = () => {
    return (
      <div className="flex items-center justify-center h-[500px] w-full bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400 font-medium">Loading chart data...</p>
        </div>
      </div>
    );
  };
  
  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      
      return (
        <div 
          style={{ 
            backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
            padding: '10px', 
            borderRadius: '8px',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: isDarkMode ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          <p style={{ 
            color: isDarkMode ? '#e2e8f0' : '#333', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            fontSize: '14px',
            borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #eee',
            paddingBottom: '4px'
          }}>
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginTop: '6px' 
            }}>
              <div 
                style={{ 
                  width: '12px', 
                  height: '12px', 
                  backgroundColor: entry.color,
                  marginRight: '8px',
                  borderRadius: '50%'
                }} 
              />
              <p style={{ 
                color: isDarkMode ? '#e2e8f0' : '#333', 
                fontWeight: '600',
                fontSize: '14px',
                margin: 0
              }}>
                {`${entry.name}: ${Number(entry.value).toLocaleString()}`}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom legend component
  const CustomLegend = (props: any) => {
    const { payload } = props;
    
    if (!payload) return null;
    
    // Display fewer items per row for clarity
    const itemsPerRow = Math.min(4, payload.length);
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    return (
      <div style={{ 
        backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        padding: '8px 12px',
        marginBottom: '10px',
        boxShadow: isDarkMode ? '0 2px 6px rgba(0, 0, 0, 0.3)' : '0 2px 6px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            width: `${100 / itemsPerRow}%`,
            minWidth: '125px',
            margin: '4px 0',
            padding: '4px'
          }}>
            <div style={{ 
              width: '14px', 
              height: '14px', 
              backgroundColor: entry.color,
              marginRight: '6px',
              borderRadius: '3px',
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.1)'
            }} />
            <span style={{ 
              color: isDarkMode ? '#e2e8f0' : '#333', 
              fontWeight: '500',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {truncateText(entry.value, 20)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Set Y axis domain
  const getYAxisDomain = (data: any[], keys: string[]) => {
    if (!data || !keys || data.length === 0 || keys.length === 0) {
      return [0, 0];
    }
    
    let maxValue = 0;
    data.forEach(item => {
      if (!item) return;
      
      keys.forEach(key => {
        if (!key) return;
        
        const value = item[key];
        const numValue = typeof value === 'number' ? value : Number(value);
        
        if (!isNaN(numValue) && numValue > maxValue) {
          maxValue = numValue;
        }
      });
    });
    
    // Add 10% margin to top value for better display
    return [0, maxValue * 1.1];
  };

  // Custom X axis tick with rotation
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    
    if (!payload || !payload.value) return null;
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          dx={0}
          textAnchor="end"
          fill={colors.text}
          fontSize="12px"
          fontWeight="500"
          transform="rotate(-35)"
          style={{ 
            textShadow: isDarkMode ? '0 0 2px rgba(0, 0, 0, 0.9)' : '0 0 2px rgba(255, 255, 255, 0.9)'
          }}
        >
          {truncateText(payload.value, 12)}
        </text>
      </g>
    );
  };

  // Custom Y axis tick
  const CustomYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    
    if (!payload || payload.value === undefined) return null;
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dx={-10}
          textAnchor="end"
          fill={colors.text}
          fontSize="12px"
          fontWeight="500"
          style={{ 
            textShadow: isDarkMode ? '0 0 2px rgba(0, 0, 0, 0.9)' : '0 0 2px rgba(255, 255, 255, 0.9)'
          }}
        >
          {Number(payload.value).toLocaleString()}
        </text>
      </g>
    );
  };

  // Custom bar label
  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    
    if (value === undefined || value === null || value === 0 || height < 15) {
      return null;
    }
    
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="middle"
        fontWeight="bold"
        fontSize="11px"
        style={{
          textShadow: '0px 0px 3px rgba(0, 0, 0, 0.7)',
          pointerEvents: 'none'
        }}
      >
        {Number(value).toLocaleString()}
      </text>
    );
  };

  // IMPROVED PIE CHART LABEL RENDERER with professional placement
  const renderCustomPieLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name, index, value } = props;
    
    if (!name || !visibleLabels.includes(name)) return null;
    
    // Professional label placement calculations to avoid overlaps
    const VIEWBOX_SIZE = 500;
    
    // Create a more organized distribution based on segment position
    // Calculate optimal label distance based on segment angle
    const getOptimalDistance = () => {
      // For better layout, vary the distance based on segment size and position
      // This creates a more professional, balanced appearance
      const segmentSize = percent;
      const baseDistance = innerRadius + (outerRadius - innerRadius);
      
      // Largest segments get priority positioning
      if (segmentSize > 0.20) return baseDistance * 1.1; 
      
      // Medium segments get middle distance
      if (segmentSize > 0.08) return baseDistance * 1.3;
      
      // Small segments get pushed further out
      return baseDistance * 1.5;
    };
    
    // Get optimal radius based on segment size
    const radius = getOptimalDistance();
    
    // Calculate position using trigonometry
    const radian = Math.PI / 180;
    const x = cx + radius * Math.cos(-midAngle * radian);
    const y = cy + radius * Math.sin(-midAngle * radian);
    
    // Determine which side of the pie the label is on
    const isRightSide = x > cx;
    
    // Format the percentage with proper precision based on size
    const formattedPercent = percent < 0.01 
      ? "<1%" 
      : `${(percent * 100).toFixed(1)}%`;
    
    // Keep label within chart boundaries
    const cappedX = Math.max(70, Math.min(x, VIEWBOX_SIZE - 70));
    const cappedY = Math.max(40, Math.min(y, VIEWBOX_SIZE - 40));
    
    // Calculate anchor point on the pie edge for the connector line
    const edgeX = cx + (outerRadius * 0.95) * Math.cos(-midAngle * radian);
    const edgeY = cy + (outerRadius * 0.95) * Math.sin(-midAngle * radian);
    
    // Calculate a control point for slightly curved connector lines
    const controlX = cx + (radius * 0.5) * Math.cos(-midAngle * radian);
    const controlY = cy + (radius * 0.5) * Math.sin(-midAngle * radian);
    
    // Create a bezier path for a subtle curve
    const path = `M ${edgeX},${edgeY} Q ${controlX},${controlY} ${cappedX},${cappedY}`;
    
    // Get color for this segment
    const color = COLORS[index % COLORS.length];
    
    return (
      <g>
        {/* Connector line with subtle curve */}
        <path 
          d={path} 
          stroke={color}
          strokeWidth={1.2}
          fill="none"
          opacity={0.8}
          strokeDasharray={percent < 0.05 ? "3,3" : "none"}
        />
        
        {/* Dot at the end of connector line */}
        <circle
          cx={cappedX}
          cy={cappedY}
          r={3}
          fill={color}
          stroke="#fff"
          strokeWidth={1}
        />
        
        {/* Text label with background */}
        <g>
          {/* Background rectangle for text */}
          <rect
            x={isRightSide ? cappedX + 5 : cappedX - 85}
            y={cappedY - 10}
            width={80}
            height={20}
            rx={10}
            ry={10}
            fill="rgba(255, 255, 255, 0.95)"
            stroke={color}
            strokeWidth={0.8}
            filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.1))"
          />
          
          {/* Percentage value */}
          <text
            x={isRightSide ? cappedX + 15 : cappedX - 15}
            y={cappedY + 5}
            fill="#333"
            fontSize="11px"
            fontWeight="bold"
            textAnchor={isRightSide ? "start" : "end"}
            filter="drop-shadow(0px 0px 1px rgba(255,255,255,0.9))"
          >
            {formattedPercent}
          </text>
          
          {/* Label text above or below the percentage based on position */}
          {percent > 0.03 && (
            <text
              x={isRightSide ? cappedX + 60 : cappedX - 60}
              y={cappedY + 5}
              fill="#555"
              fontSize="10px"
              fontWeight="500"
              textAnchor="middle"
              filter="drop-shadow(0px 0px 1px rgba(255,255,255,0.9))"
            >
              {truncateText(name, 7)}
            </text>
          )}
        </g>
      </g>
    );
  };

  // Process data to correct format
  const processData = (rawData: Result[]) => {
    if (!rawData || rawData.length === 0) return [];
    
    const processedData = rawData.map((item) => {
      if (!item) return null;
      
      const newItem: { [key: string]: any } = {};
      for (const [key, value] of Object.entries(item)) {
        newItem[key] = typeof value === 'number' ? value : 
                       !isNaN(Number(value)) ? Number(value) : value;
      }
      return newItem;
    }).filter(item => item !== null);
    
    return processedData;
  };

  // Bar chart rendering implementation
  const renderBarChart = (data: any[]) => {
    if (!data || data.length === 0 || !chartConfig?.xKey || !chartConfig?.yKeys || !chartConfig?.yKeys.length) {
      return renderNoDataMessage();
    }
    
    const yDomain = getYAxisDomain(data, chartConfig.yKeys);
    
    return (
      <ResponsiveContainer width="100%" height={500}>
        <BarChart 
          data={data}
          margin={{ top: 20, right: 30, left: 60, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey={chartConfig.xKey} 
            stroke="#666"
            tick={<CustomXAxisTick />}
            tickLine={{ stroke: '#666' }}
            axisLine={{ stroke: '#666', strokeWidth: 1 }}
            interval={0}
            height={80}
          >
            <Label 
              value={toTitleCase(chartConfig.xKey)}
              position="bottom" 
              offset={60}
              style={{
                fill: '#333',
                fontWeight: 'bold',
                fontSize: 14
              }}
            />
          </XAxis>
          <YAxis 
            domain={yDomain}
            stroke="#666"
            tick={<CustomYAxisTick />}
            tickLine={{ stroke: '#666' }}
            axisLine={{ stroke: '#666', strokeWidth: 1 }}
          >
            <Label
              value={toTitleCase(chartConfig.yKeys[0])}
              position="left"
              angle={-90}
              offset={-45}
              style={{
                fill: '#333',
                fontWeight: 'bold',
                fontSize: 14
              }}
            />
          </YAxis>
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
          />
          <Legend 
            content={<CustomLegend />} 
            verticalAlign="top" 
            height={60}
          />
          {chartConfig.yKeys.map((key: string, index: number) => (
            <Bar
              key={key}
              dataKey={key}
              name={toTitleCase(key)}
              fill={COLORS[index % COLORS.length]}
              animationDuration={600}
              isAnimationActive={true}
              barSize={30}
            >
              <LabelList 
                dataKey={key} 
                position="center" 
                content={renderCustomBarLabel} 
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Line chart rendering implementation
  const renderLineChart = (data: any[]) => {
    if (!data || data.length === 0 || !chartConfig?.xKey || !chartConfig?.yKeys || !chartConfig?.yKeys.length) {
      return renderNoDataMessage();
    }
    
    const yDomain = getYAxisDomain(data, chartConfig.yKeys);
    
    return (
      <ResponsiveContainer width="100%" height={500}>
        <LineChart 
          data={data}
          margin={{ top: 20, right: 30, left: 60, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey={chartConfig.xKey} 
            stroke="#666"
            tick={<CustomXAxisTick />}
            tickLine={{ stroke: '#666' }}
            axisLine={{ stroke: '#666', strokeWidth: 1 }}
            interval={0}
            height={80}
          >
            <Label 
              value={toTitleCase(chartConfig.xKey)}
              position="bottom" 
              offset={60}
              style={{
                fill: '#333',
                fontWeight: 'bold',
                fontSize: 14
              }}
            />
          </XAxis>
          <YAxis 
            domain={yDomain}
            stroke="#666"
            tick={<CustomYAxisTick />}
            tickLine={{ stroke: '#666' }}
            axisLine={{ stroke: '#666', strokeWidth: 1 }}
          >
            <Label
              value={toTitleCase(chartConfig.yKeys[0])}
              position="left"
              angle={-90}
              offset={-45}
              style={{
                fill: '#333',
                fontWeight: 'bold',
                fontSize: 14
              }}
            />
          </YAxis>
          <Tooltip 
            content={<CustomTooltip />}
          />
          <Legend 
            content={<CustomLegend />} 
            verticalAlign="top" 
            height={60}
          />
          {chartConfig.yKeys.map((key: string, index: number) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={toTitleCase(key)}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={{ 
                fill: COLORS[index % COLORS.length], 
                stroke: '#fff', 
                strokeWidth: 2, 
                r: 5 
              }}
              activeDot={{ 
                fill: '#fff', 
                stroke: COLORS[index % COLORS.length], 
                strokeWidth: 2, 
                r: 7 
              }}
              animationDuration={600}
              isAnimationActive={true}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // Area chart rendering implementation
  const renderAreaChart = (data: any[]) => {
    if (!data || data.length === 0 || !chartConfig?.xKey || !chartConfig?.yKeys || !chartConfig?.yKeys.length) {
      return renderNoDataMessage();
    }
    
    const yDomain = getYAxisDomain(data, chartConfig.yKeys);
    
    return (
      <ResponsiveContainer width="100%" height={500}>
        <AreaChart 
          data={data}
          margin={{ top: 20, right: 30, left: 60, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey={chartConfig.xKey} 
            stroke="#666"
            tick={<CustomXAxisTick />}
            tickLine={{ stroke: '#666' }}
            axisLine={{ stroke: '#666', strokeWidth: 1 }}
            interval={0}
            height={80}
          >
            <Label 
              value={toTitleCase(chartConfig.xKey)}
              position="bottom" 
              offset={60}
              style={{
                fill: '#333',
                fontWeight: 'bold',
                fontSize: 14
              }}
            />
          </XAxis>
          <YAxis 
            domain={yDomain}
            stroke="#666"
            tick={<CustomYAxisTick />}
            tickLine={{ stroke: '#666' }}
            axisLine={{ stroke: '#666', strokeWidth: 1 }}
          >
            <Label
              value={toTitleCase(chartConfig.yKeys[0])}
              position="left"
              angle={-90}
              offset={-45}
              style={{
                fill: '#333',
                fontWeight: 'bold',
                fontSize: 14
              }}
            />
          </YAxis>
          <Tooltip 
            content={<CustomTooltip />}
          />
          <Legend 
            content={<CustomLegend />} 
            verticalAlign="top" 
            height={60}
          />
          {chartConfig.yKeys.map((key: string, index: number) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={toTitleCase(key)}
              fill={COLORS[index % COLORS.length]}
              stroke={COLORS[index % COLORS.length]}
              fillOpacity={0.6}
              strokeWidth={2}
              animationDuration={600}
              isAnimationActive={true}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  // IMPROVED PIE CHART with professional UX/UI
  const renderPieChart = (data: any[]) => {
    if (!data || data.length === 0 || !chartConfig?.xKey || !chartConfig?.yKeys || !chartConfig?.yKeys.length) {
      return renderNoDataMessage();
    }
    
    // Sort data by value to place smaller segments together
    const sortedData = [...data].sort((a, b) => {
      if (!a || !b) return 0;
      
      const aValue = a[chartConfig.yKeys[0]];
      const bValue = b[chartConfig.yKeys[0]];
      
      const aNum = typeof aValue === 'number' ? aValue : Number(aValue);
      const bNum = typeof bValue === 'number' ? bValue : Number(bValue);
      
      if (isNaN(aNum) && isNaN(bNum)) return 0;
      if (isNaN(aNum)) return 1;
      if (isNaN(bNum)) return -1;
      
      return bNum - aNum;
    });
    
    // Calculate total for percentage calculation
    const total = sortedData.reduce((sum, item) => {
      if (!item) return sum;
      
      const value = item[chartConfig.yKeys[0]];
      const numValue = typeof value === 'number' ? value : Number(value);
      
      return sum + (isNaN(numValue) ? 0 : numValue);
    }, 0);
    
    // Add percentage to data for label display
    const dataWithPercentage = sortedData
      .filter(item => {
        if (!item) return false;
        
        const value = item[chartConfig.yKeys[0]];
        const numValue = typeof value === 'number' ? value : Number(value);
        
        return !isNaN(numValue) && numValue > 0;
      })
      .map(item => {
        const value = item[chartConfig.yKeys[0]];
        const numValue = typeof value === 'number' ? value : Number(value);
        
        return {
          ...item,
          percentage: (numValue / total) * 100
        };
      });
    
    // Handler for toggling label visibility
    const toggleLabelVisibility = (name: string) => {
      setVisibleLabels((prev: string[]) => 
        prev.includes(name) 
          ? prev.filter((item: string) => item !== name) 
          : [...prev, name]
      );
    };
    
    return (
      <div className="flex flex-col w-full">
        <div className="relative" style={{ height: '450px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 20, right: 40, left: 40, bottom: 20 }}>
              <Pie
                data={dataWithPercentage}
                dataKey={chartConfig.yKeys[0]}
                nameKey={chartConfig.xKey}
                cx="50%"
                cy="50%"
                outerRadius={150}
                innerRadius={70}
                paddingAngle={1}
                labelLine={false}
                label={renderCustomPieLabel}
                animationDuration={600}
                isAnimationActive={true}
              >
                {dataWithPercentage.map((entry: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="mb-3 pb-2 text-center text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
            Click items below to show/hide labels
          </div>
          
          <div className="flex flex-wrap justify-center max-h-48 overflow-y-auto py-2">
            {dataWithPercentage.map((entry: any, index: number) => (
              <div 
                key={`legend-${index}`} 
                className={`
                  flex items-center px-3 py-1.5 m-1 rounded-full cursor-pointer transition-all duration-200 text-foreground
                  ${visibleLabels.includes(entry[chartConfig.xKey]) 
                    ? 'bg-opacity-15 border ring-1 ring-opacity-30 shadow-sm transform scale-105' 
                    : 'border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
                style={{ 
                  backgroundColor: visibleLabels.includes(entry[chartConfig.xKey]) 
                    ? `rgba(${COLORS[index % COLORS.length].replace(/[^\d,]/g, '')}, 0.15)` 
                    : undefined,
                  borderColor: visibleLabels.includes(entry[chartConfig.xKey])
                    ? COLORS[index % COLORS.length]
                    : undefined,
                  // @ts-ignore - Custom property for styling
                  '--ring-color': COLORS[index % COLORS.length]
                }}
                onClick={() => toggleLabelVisibility(entry[chartConfig.xKey])}
              >
                <div 
                  className="w-3 h-3 mr-2 rounded-sm"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className={`text-xs ${visibleLabels.includes(entry[chartConfig.xKey]) ? 'font-bold' : 'font-medium'}`}>
                  {truncateText(entry[chartConfig.xKey], 18)}
                </span>
                <span className={`ml-1.5 text-xs ${visibleLabels.includes(entry[chartConfig.xKey]) ? 'font-bold' : ''}`}>
                  {entry.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
          
          <div className="flex justify-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setVisibleLabels(dataWithPercentage.slice(0, 5).map((entry: any) => entry[chartConfig.xKey]))}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors"
            >
              Top 5
            </button>
            <button
              onClick={() => setVisibleLabels(dataWithPercentage.map((entry: any) => entry[chartConfig.xKey]))}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors"
            >
              All
            </button>
            <button
              onClick={() => setVisibleLabels([])}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors"
            >
              None
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render appropriate chart based on selected type
  const renderChart = () => {
    if (!mounted) {
      return renderLoadingIndicator();
    }
    
    if (!chartData || !chartConfig || chartData.length === 0) {
      return renderNoDataMessage();
    }
    
    // Check if we have numeric data to display
    if (!hasNumericData) {
      return renderNoDataMessage();
    }

    const processedData = processData(chartData);
    
    switch (selectedChartType) {
      case 'bar':
        return renderBarChart(processedData);
      case 'line':
        return renderLineChart(processedData);
      case 'area':
        return renderAreaChart(processedData);
      case 'pie':
        return renderPieChart(processedData);
      default:
        return <div>Unsupported chart type: {selectedChartType}</div>;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      {/* Chart title */}
      <div className="text-center mb-6 bg-gray-50 dark:bg-gray-800 py-4 px-6 rounded-lg border border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {chartConfig?.title || 'Data Visualization'}
        </h2>
        {chartConfig?.description && (
          <p className="text-gray-600 dark:text-gray-300 mt-2 max-w-2xl mx-auto">
            {chartConfig.description}
          </p>
        )}
      </div>
      
      {/* Chart type selection buttons */}
      <div className="flex justify-center mb-6 gap-2">
        {['bar', 'line', 'area', 'pie'].map((type) => (
          <button
            key={type}
            className={`px-5 py-2 rounded-full font-bold text-sm transition-all duration-200 
              ${selectedChartType === type
                ? 'bg-indigo-600 text-white shadow-md transform scale-105 ring-2 ring-indigo-300 dark:ring-indigo-700'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 hover:shadow'
              }`}
            onClick={() => setSelectedChartType(type as Config['type'])}
            disabled={!hasNumericData}
            style={{
              minWidth: '80px',
              opacity: hasNumericData ? 1 : 0.5,
              cursor: hasNumericData ? 'pointer' : 'not-allowed'
            }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Chart container */}
      <div className="relative p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {renderChart()}
      </div>
      
      {/* Insights section */}
      {chartConfig?.takeaway && hasNumericData && (
        <div className="mt-6 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Key Insights</h3>
          <p className="text-gray-700 dark:text-gray-300">{chartConfig.takeaway}</p>
        </div>
      )}
    </div>
  );
}