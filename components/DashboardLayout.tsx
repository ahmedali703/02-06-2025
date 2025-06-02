'use client';

import React from 'react';
import { DashboardConfig } from '@/app/(dashboard)/dashboard-builder/schemas';

interface DashboardLayoutProps {
  charts: any[];
  layout: {
    columns: number;
    rows: number;
  };
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ charts, layout }) => {
  // تحديد عرض وارتفاع الشبكة
  const gridColumns = layout.columns || 2;
  
  // تحويل المخططات إلى مصفوفة مرتبة حسب الموضع
  const sortedCharts = [...charts].sort((a, b) => {
    if (a.position.y === b.position.y) {
      return a.position.x - b.position.x;
    }
    return a.position.y - b.position.y;
  });
  
  // إنشاء مصفوفة شبكة فارغة
  const grid: (typeof charts[0] | null)[][] = Array(layout.rows)
    .fill(null)
    .map(() => Array(gridColumns).fill(null));
  
  // وضع المخططات في الشبكة
  sortedCharts.forEach(chart => {
    const { x, y, w, h } = chart.position;
    
    // التأكد من أن الموضع ضمن حدود الشبكة
    if (y < layout.rows && x < gridColumns) {
      grid[y][x] = chart;
      
      // وضع علامات للخلايا التي تشغلها المخططات الكبيرة
      if (w > 1 || h > 1) {
        for (let row = y; row < Math.min(y + h, layout.rows); row++) {
          for (let col = x; col < Math.min(x + w, gridColumns); col++) {
            if (row !== y || col !== x) {
              grid[row][col] = 'occupied';
            }
          }
        }
      }
    }
  });
  
  // تحديد نوع المخطط وعرضه
  const renderChart = (chart: any) => {
    if (chart === null || chart === 'occupied') return null;
    
    // تحديد عرض المخطط بناءً على عرضه في الشبكة
    const chartWidth = chart.position.w === gridColumns ? 'w-full' : 
                      chart.position.w === 2 ? 'w-full' : 'w-full';
    
    // تحديد ارتفاع المخطط بناءً على ارتفاعه في الشبكة
    const chartHeight = chart.position.h === 2 ? 'h-[400px]' : 'h-[200px]';
    
    // تحديد نوع المخطط وعرضه
    switch (chart.type) {
      case 'bar':
        return (
          <div className={`glass-card p-4 ${chartWidth} ${chartHeight}`}>
            <h3 className="text-lg font-semibold mb-2">{chart.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{chart.description}</p>
            <div className="h-[calc(100%-80px)] w-full">
              <BarChartPlaceholder data={chart.data} xAxis={chart.xAxis} yAxis={chart.yAxis} />
            </div>
          </div>
        );
      case 'line':
        return (
          <div className={`glass-card p-4 ${chartWidth} ${chartHeight}`}>
            <h3 className="text-lg font-semibold mb-2">{chart.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{chart.description}</p>
            <div className="h-[calc(100%-80px)] w-full">
              <LineChartPlaceholder data={chart.data} xAxis={chart.xAxis} yAxis={chart.yAxis} />
            </div>
          </div>
        );
      case 'pie':
        return (
          <div className={`glass-card p-4 ${chartWidth} ${chartHeight}`}>
            <h3 className="text-lg font-semibold mb-2">{chart.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{chart.description}</p>
            <div className="h-[calc(100%-80px)] w-full">
              <PieChartPlaceholder data={chart.data} dataKey={chart.dataKey} colorBy={chart.colorBy} />
            </div>
          </div>
        );
      case 'card':
        return (
          <div className={`glass-card p-4 ${chartWidth} ${chartHeight}`}>
            <h3 className="text-lg font-semibold mb-2">{chart.title}</h3>
            <p className="text-sm text-muted-foreground">{chart.description}</p>
          </div>
        );
      default:
        return (
          <div className={`glass-card p-4 ${chartWidth} ${chartHeight}`}>
            <h3 className="text-lg font-semibold mb-2">{chart.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{chart.description}</p>
            <div className="flex items-center justify-center h-[calc(100%-80px)] w-full">
              <p className="text-muted-foreground">Unsupported chart type: {chart.type}</p>
            </div>
          </div>
        );
    }
  };
  
  // مكونات المخططات البديلة
  const BarChartPlaceholder = ({ data, xAxis, yAxis }: any) => {
    if (!data || data.length === 0) {
      return <div className="flex items-center justify-center h-full">No data available</div>;
    }
    
    const maxValue = Math.max(...data.map((item: any) => item[yAxis] || 0));
    
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-end">
          {data.slice(0, 8).map((item: any, index: number) => {
            const value = item[yAxis] || 0;
            const height = `${(value / maxValue) * 100}%`;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1 mx-1">
                <div 
                  className="w-full bg-primary/80 rounded-t-sm" 
                  style={{ height }}
                ></div>
                <div className="text-xs mt-1 truncate w-full text-center">
                  {item[xAxis]?.toString().substring(0, 10) || ''}
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-6 mt-2 text-xs text-center text-muted-foreground">
          {yAxis}
        </div>
      </div>
    );
  };
  
  const LineChartPlaceholder = ({ data, xAxis, yAxis }: any) => {
    if (!data || data.length === 0) {
      return <div className="flex items-center justify-center h-full">No data available</div>;
    }
    
    const maxValue = Math.max(...data.map((item: any) => item[yAxis] || 0));
    const minValue = Math.min(...data.map((item: any) => item[yAxis] || 0));
    const range = maxValue - minValue;
    
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 relative">
          <svg className="w-full h-full">
            <polyline
              points={data.slice(0, 10).map((item: any, index: number) => {
                const x = (index / (data.length - 1)) * 100;
                const normalizedValue = range === 0 ? 50 : 100 - (((item[yAxis] || 0) - minValue) / range) * 100;
                return `${x}% ${normalizedValue}%`;
              }).join(' ')}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
            {data.slice(0, 10).map((item: any, index: number) => {
              const x = (index / (data.length - 1)) * 100;
              const normalizedValue = range === 0 ? 50 : 100 - (((item[yAxis] || 0) - minValue) / range) * 100;
              return (
                <circle
                  key={index}
                  cx={`${x}%`}
                  cy={`${normalizedValue}%`}
                  r="3"
                  fill="hsl(var(--primary))"
                />
              );
            })}
          </svg>
          {data.slice(0, 10).map((item: any, index: number) => {
            const x = (index / (data.length - 1)) * 100;
            return (
              <div 
                key={index} 
                className="absolute bottom-0 text-xs transform -translate-x-1/2"
                style={{ left: `${x}%` }}
              >
                {item[xAxis]?.toString().substring(0, 5) || ''}
              </div>
            );
          })}
        </div>
        <div className="h-6 mt-2 text-xs text-center text-muted-foreground">
          {yAxis}
        </div>
      </div>
    );
  };
  
  const PieChartPlaceholder = ({ data, dataKey, colorBy }: any) => {
    if (!data || data.length === 0) {
      return <div className="flex items-center justify-center h-full">No data available</div>;
    }
    
    const total = data.reduce((sum: number, item: any) => sum + (item[dataKey] || 0), 0);
    let startAngle = 0;
    
    const colors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))'
    ];
    
    return (
      <div className="flex h-full">
        <div className="w-1/2 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {data.slice(0, 5).map((item: any, index: number) => {
              const value = item[dataKey] || 0;
              const percentage = total === 0 ? 0 : (value / total);
              const angle = percentage * 360;
              const endAngle = startAngle + angle;
              
              // Calculate SVG arc path
              const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const pathData = [
                `M 50 50`,
                `L ${x1} ${y1}`,
                `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                `Z`
              ].join(' ');
              
              const result = (
                <path
                  key={index}
                  d={pathData}
                  fill={colors[index % colors.length]}
                />
              );
              
              startAngle = endAngle;
              return result;
            })}
          </svg>
        </div>
        <div className="w-1/2 flex flex-col justify-center">
          {data.slice(0, 5).map((item: any, index: number) => {
            const value = item[dataKey] || 0;
            const percentage = total === 0 ? 0 : ((value / total) * 100).toFixed(1);
            
            return (
              <div key={index} className="flex items-center mb-2">
                <div 
                  className="w-3 h-3 mr-2 rounded-sm" 
                  style={{ backgroundColor: colors[index % colors.length] }}
                ></div>
                <div className="text-xs truncate">
                  {item[colorBy]?.toString().substring(0, 15) || ''} ({percentage}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
      {grid.map((row, rowIndex) => (
        <React.Fragment key={rowIndex}>
          {row.map((cell, colIndex) => {
            // تجاهل الخلايا المشغولة بمخططات كبيرة
            if (cell === 'occupied') return null;
            
            // تحديد عرض المخطط
            const spanClasses = [];
            if (cell && cell.position.w > 1) {
              spanClasses.push(`col-span-${Math.min(cell.position.w, gridColumns)}`);
            }
            if (cell && cell.position.h > 1) {
              spanClasses.push(`row-span-${cell.position.h}`);
            }
            
            return (
              <div 
                key={colIndex} 
                className={spanClasses.join(' ')}
                style={{ gridColumn: cell && cell.position.w > 1 ? `span ${Math.min(cell.position.w, gridColumns)}` : undefined }}
              >
                {renderChart(cell)}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

export default DashboardLayout;
