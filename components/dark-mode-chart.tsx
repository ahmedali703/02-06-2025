'use client';

import React, { useEffect, useState } from 'react';
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
} from 'recharts';

// Dark mode aware chart component
export const DarkModeChart: React.FC<{
  data: any[];
  type: 'bar' | 'line' | 'area' | 'pie';
  xKey: string;
  yKeys: string[];
  height?: number;
  title?: string;
}> = ({ data, type, xKey, yKeys, height = 400, title }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Colors for chart elements
  const COLORS = [
    '#4361EE', '#3A0CA3', '#7209B7', '#F72585', 
    '#4CC9F0', '#4895EF', '#560BAD', '#B5179E'
  ];

  // Check for dark mode
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    // Check on mount
    checkTheme();

    // Set up observer for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          checkTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Theme-aware colors
  const colors = {
    axis: isDarkMode ? '#fff' : '#666',
    grid: isDarkMode ? '#374151' : '#e0e0e0',
    text: isDarkMode ? '#fff' : '#333',
    background: isDarkMode ? '#1f2937' : '#fff',
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
        >
          {typeof payload.value === 'string' && payload.value.length > 12
            ? payload.value.substring(0, 12) + '...'
            : payload.value}
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
        >
          {Number(payload.value).toLocaleString()}
        </text>
      </g>
    );
  };

  // Render bar chart
  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 60, bottom: 80 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis
          dataKey={xKey}
          stroke={colors.axis}
          tick={<CustomXAxisTick />}
          tickLine={{ stroke: colors.axis }}
          axisLine={{ stroke: colors.axis, strokeWidth: 1 }}
          interval={0}
          height={80}
        >
          <Label
            value={xKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
            position="bottom"
            offset={60}
            style={{
              fill: colors.text,
              fontWeight: 'bold',
              fontSize: 14
            }}
          />
        </XAxis>
        <YAxis
          stroke={colors.axis}
          tick={<CustomYAxisTick />}
          tickLine={{ stroke: colors.axis }}
          axisLine={{ stroke: colors.axis, strokeWidth: 1 }}
        >
          <Label
            value={yKeys[0].split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
            position="left"
            angle={-90}
            offset={-45}
            style={{
              fill: colors.text,
              fontWeight: 'bold',
              fontSize: 14
            }}
          />
        </YAxis>
        <Tooltip
          contentStyle={{
            backgroundColor: isDarkMode ? '#1f2937' : '#fff',
            border: `1px solid ${isDarkMode ? '#374151' : '#e0e0e0'}`,
            color: colors.text
          }}
        />
        <Legend
          wrapperStyle={{
            color: colors.text
          }}
        />
        {yKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            name={key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
            fill={COLORS[index % COLORS.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  // Render line chart
  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 60, bottom: 80 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis
          dataKey={xKey}
          stroke={colors.axis}
          tick={<CustomXAxisTick />}
          tickLine={{ stroke: colors.axis }}
          axisLine={{ stroke: colors.axis, strokeWidth: 1 }}
          interval={0}
          height={80}
        >
          <Label
            value={xKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
            position="bottom"
            offset={60}
            style={{
              fill: colors.text,
              fontWeight: 'bold',
              fontSize: 14
            }}
          />
        </XAxis>
        <YAxis
          stroke={colors.axis}
          tick={<CustomYAxisTick />}
          tickLine={{ stroke: colors.axis }}
          axisLine={{ stroke: colors.axis, strokeWidth: 1 }}
        >
          <Label
            value={yKeys[0].split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
            position="left"
            angle={-90}
            offset={-45}
            style={{
              fill: colors.text,
              fontWeight: 'bold',
              fontSize: 14
            }}
          />
        </YAxis>
        <Tooltip
          contentStyle={{
            backgroundColor: isDarkMode ? '#1f2937' : '#fff',
            border: `1px solid ${isDarkMode ? '#374151' : '#e0e0e0'}`,
            color: colors.text
          }}
        />
        <Legend
          wrapperStyle={{
            color: colors.text
          }}
        />
        {yKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  // Render area chart
  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 20, right: 30, left: 60, bottom: 80 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis
          dataKey={xKey}
          stroke={colors.axis}
          tick={<CustomXAxisTick />}
          tickLine={{ stroke: colors.axis }}
          axisLine={{ stroke: colors.axis, strokeWidth: 1 }}
          interval={0}
          height={80}
        >
          <Label
            value={xKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
            position="bottom"
            offset={60}
            style={{
              fill: colors.text,
              fontWeight: 'bold',
              fontSize: 14
            }}
          />
        </XAxis>
        <YAxis
          stroke={colors.axis}
          tick={<CustomYAxisTick />}
          tickLine={{ stroke: colors.axis }}
          axisLine={{ stroke: colors.axis, strokeWidth: 1 }}
        >
          <Label
            value={yKeys[0].split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
            position="left"
            angle={-90}
            offset={-45}
            style={{
              fill: colors.text,
              fontWeight: 'bold',
              fontSize: 14
            }}
          />
        </YAxis>
        <Tooltip
          contentStyle={{
            backgroundColor: isDarkMode ? '#1f2937' : '#fff',
            border: `1px solid ${isDarkMode ? '#374151' : '#e0e0e0'}`,
            color: colors.text
          }}
        />
        <Legend
          wrapperStyle={{
            color: colors.text
          }}
        />
        {yKeys.map((key, index) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            name={key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
            fill={COLORS[index % COLORS.length]}
            stroke={COLORS[index % COLORS.length]}
            fillOpacity={0.6}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );

  // Render pie chart
  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
        <Pie
          data={data}
          dataKey={yKeys[0]}
          nameKey={xKey}
          cx="50%"
          cy="50%"
          outerRadius={150}
          fill="#8884d8"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: colors.text }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: isDarkMode ? '#1f2937' : '#fff',
            border: `1px solid ${isDarkMode ? '#374151' : '#e0e0e0'}`,
            color: colors.text
          }}
        />
        <Legend
          wrapperStyle={{
            color: colors.text
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  // Render the appropriate chart type
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'area':
        return renderAreaChart();
      case 'pie':
        return renderPieChart();
      default:
        return renderBarChart();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      {title && (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h2>
        </div>
      )}
      <div className="relative p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {renderChart()}
      </div>
    </div>
  );
};
