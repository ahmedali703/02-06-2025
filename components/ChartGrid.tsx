'use client';

import React from 'react';
import { ChartConfig } from './types';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, 
  ScatterChart, Scatter, ResponsiveContainer, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, Cell 
} from 'recharts';

interface ChartGridProps {
  charts: ChartConfig[];
}

const ChartGrid: React.FC<ChartGridProps> = ({ charts }) => {
  // تعريف مصفوفة ألوان للرسوم البيانية
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];

  // وظيفة لعرض الرسم البياني المناسب حسب النوع
  const renderChart = (chart: ChartConfig) => {
    const { type, title, xAxis, yAxis, data } = chart;

    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No data available</p>
        </div>
      );
    }

    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xAxis} tick={{ fill: 'hsl(var(--foreground))' }} />
              <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--tooltip-bg)', 
                  border: 'var(--tooltip-border)',
                  color: 'var(--tooltip-color)',
                  borderRadius: 'var(--radius)'
                }} 
              />
              <Legend />
              <Bar dataKey={yAxis || 'value'} fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xAxis} tick={{ fill: 'hsl(var(--foreground))' }} />
              <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--tooltip-bg)', 
                  border: 'var(--tooltip-border)',
                  color: 'var(--tooltip-color)',
                  borderRadius: 'var(--radius)'
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey={yAxis || 'value'} stroke="hsl(var(--primary))" />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="hsl(var(--primary))"
                dataKey={yAxis || 'value'}
                nameKey={xAxis || 'name'}
              >
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--tooltip-bg)', 
                  border: 'var(--tooltip-border)',
                  color: 'var(--tooltip-color)',
                  borderRadius: 'var(--radius)'
                }} 
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xAxis} tick={{ fill: 'hsl(var(--foreground))' }} />
              <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--tooltip-bg)', 
                  border: 'var(--tooltip-border)',
                  color: 'var(--tooltip-color)',
                  borderRadius: 'var(--radius)'
                }} 
              />
              <Legend />
              <Area type="monotone" dataKey={yAxis || 'value'} fill="hsl(var(--primary))" stroke="hsl(var(--primary))" />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xAxis} name={xAxis} tick={{ fill: 'hsl(var(--foreground))' }} />
              <YAxis dataKey={yAxis} name={yAxis} tick={{ fill: 'hsl(var(--foreground))' }} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ 
                  backgroundColor: 'var(--tooltip-bg)', 
                  border: 'var(--tooltip-border)',
                  color: 'var(--tooltip-color)',
                  borderRadius: 'var(--radius)'
                }} 
              />
              <Legend />
              <Scatter name={title} data={data} fill="hsl(var(--primary))" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Unsupported chart type</p>
          </div>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {charts.map((chart, index) => (
        <div key={index} className="glass-card p-4 hover-glow">
          <h3 className="text-lg font-medium mb-2 text-card-foreground">{chart.title}</h3>
          {chart.description && (
            <p className="text-sm text-muted-foreground mb-4">{chart.description}</p>
          )}
          <div className="h-64">
            {renderChart(chart)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChartGrid;
