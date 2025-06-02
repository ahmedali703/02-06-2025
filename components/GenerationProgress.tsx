//app/dashboard-builder/schemas.ts
import { z } from 'zod';

// Chart position schema
export const chartPositionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  w: z.number().min(1).max(4),
  h: z.number().min(1).max(3)
});

// Chart type schema
export const chartTypeSchema = z.enum([
  'bar', 
  'line', 
  'area', 
  'pie', 
  'donut',
  'card',
  'table',
  'scatter'
]);

// Base chart schema
export const baseChartSchema = z.object({
  id: z.string().optional(),
  type: chartTypeSchema,
  title: z.string(),
  description: z.string(),
  sql: z.string(),
  position: chartPositionSchema,
  data: z.array(z.record(z.any())).optional(),
  error: z.string().optional()
});

// Extended chart schemas for different types
export const barChartSchema = baseChartSchema.extend({
  type: z.literal('bar'),
  xAxis: z.string(),
  yAxis: z.string(),
  stacked: z.boolean().optional(),
  orientation: z.enum(['vertical', 'horizontal']).optional()
});

export const lineChartSchema = baseChartSchema.extend({
  type: z.literal('line'),
  xAxis: z.string(),
  yAxis: z.string(),
  smooth: z.boolean().optional(),
  showPoints: z.boolean().optional()
});

export const areaChartSchema = baseChartSchema.extend({
  type: z.literal('area'),
  xAxis: z.string(),
  yAxis: z.string(),
  stacked: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional()
});

export const pieChartSchema = baseChartSchema.extend({
  type: z.literal('pie'),
  dataKey: z.string(),
  colorBy: z.string(),
  showLabels: z.boolean().optional(),
  showLegend: z.boolean().optional()
});

export const donutChartSchema = baseChartSchema.extend({
  type: z.literal('donut'),
  dataKey: z.string(),
  colorBy: z.string(),
  innerRadius: z.number().min(0).max(100).optional(),
  showLabels: z.boolean().optional()
});

export const cardChartSchema = baseChartSchema.extend({
  type: z.literal('card'),
  valueKey: z.string(),
  unit: z.string().optional(),
  trend: z.object({
    value: z.number(),
    direction: z.enum(['up', 'down', 'neutral'])
  }).optional()
});

export const tableChartSchema = baseChartSchema.extend({
  type: z.literal('table'),
  columns: z.array(z.object({
    key: z.string(),
    title: z.string(),
    sortable: z.boolean().optional(),
    width: z.string().optional()
  })),
  pagination: z.boolean().optional(),
  pageSize: z.number().optional()
});

export const scatterChartSchema = baseChartSchema.extend({
  type: z.literal('scatter'),
  xAxis: z.string(),
  yAxis: z.string(),
  sizeBy: z.string().optional(),
  colorBy: z.string().optional()
});

// Union of all chart types
export const chartSchema = z.discriminatedUnion('type', [
  barChartSchema,
  lineChartSchema,
  areaChartSchema,
  pieChartSchema,
  donutChartSchema,
  cardChartSchema,
  tableChartSchema,
  scatterChartSchema
]);

// Dashboard layout schema
export const dashboardLayoutSchema = z.object({
  columns: z.number().min(1).max(4),
  rows: z.number().min(1).max(10),
  gap: z.number().min(0).max(20).optional(),
  padding: z.number().min(0).max(20).optional()
});

// Dashboard theme schema
export const dashboardThemeSchema = z.enum(['system', 'light', 'dark']);

// Complete dashboard configuration schema
export const dashboardConfigSchema = z.object({
  title: z.string(),
  description: z.string(),
  charts: z.array(chartSchema).min(1).max(12),
  layout: dashboardLayoutSchema,
  theme: dashboardThemeSchema.optional(),
  refreshInterval: z.number().min(30).optional(), // seconds
  filters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['select', 'date', 'text', 'number']),
    options: z.array(z.string()).optional(),
    defaultValue: z.any().optional(),
    global: z.boolean().optional()
  })).optional(),
  exportOptions: z.object({
    pdf: z.boolean().optional(),
    csv: z.boolean().optional(),
    image: z.boolean().optional()
  }).optional()
});

// Type exports
export type ChartPosition = z.infer<typeof chartPositionSchema>;
export type ChartType = z.infer<typeof chartTypeSchema>;
export type BaseChart = z.infer<typeof baseChartSchema>;
export type BarChart = z.infer<typeof barChartSchema>;
export type LineChart = z.infer<typeof lineChartSchema>;
export type AreaChart = z.infer<typeof areaChartSchema>;
export type PieChart = z.infer<typeof pieChartSchema>;
export type DonutChart = z.infer<typeof donutChartSchema>;
export type CardChart = z.infer<typeof cardChartSchema>;
export type TableChart = z.infer<typeof tableChartSchema>;
export type ScatterChart = z.infer<typeof scatterChartSchema>;
export type Chart = z.infer<typeof chartSchema>;
export type DashboardLayout = z.infer<typeof dashboardLayoutSchema>;
export type DashboardTheme = z.infer<typeof dashboardThemeSchema>;
export type DashboardConfig = z.infer<typeof dashboardConfigSchema>;

// Helper function to create default chart position
export function createDefaultPosition(index: number, columns: number = 2): ChartPosition {
  const row = Math.floor(index / columns);
  const col = index % columns;
  
  return {
    x: col,
    y: row,
    w: 1,
    h: 1
  };
}

// Helper function to validate chart configuration
export function validateChart(chart: any): { valid: boolean; errors?: string[] } {
  try {
    chartSchema.parse(chart);
    return { valid: true };
  } catch (error: any) {
    if (error.errors) {
      return {
        valid: false,
        errors: error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return {
      valid: false,
      errors: ['Unknown validation error']
    };
  }
}

// Generation step schema for progress tracking
export const generationStepSchema = z.object({
  id: z.string(),
  name: z.string(), // Add name property for compatibility
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in-progress', 'completed', 'error', 'waiting']), // Add 'waiting' status
  progress: z.number().min(0).max(100).optional(),
  error: z.string().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional()
});

export type GenerationStep = z.infer<typeof generationStepSchema>;

// Generation progress schema
export const generationProgressSchema = z.object({
  steps: z.array(generationStepSchema),
  currentStep: z.number().min(0),
  overallProgress: z.number().min(0).max(100),
  status: z.enum(['idle', 'generating', 'completed', 'error']),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  totalTime: z.number().optional()
});

export type GenerationProgress = z.infer<typeof generationProgressSchema>;

// Helper function to create default generation steps
export function createDefaultGenerationSteps(): GenerationStep[] {
  return [
    {
      id: 'schema-fetch',
      name: 'Fetching Schema', // Add name for display
      title: 'Fetching Database Schema',
      description: 'Retrieving table and column information from your database',
      status: 'pending'
    },
    {
      id: 'ai-generation',
      name: 'AI Generation', // Add name for display
      title: 'Generating Dashboard Configuration',
      description: 'AI is analyzing your request and creating dashboard layout',
      status: 'pending'
    },
    {
      id: 'sql-generation',
      name: 'SQL Queries', // Add name for display
      title: 'Creating SQL Queries',
      description: 'Generating optimized SQL queries for each chart',
      status: 'pending'
    },
    {
      id: 'data-execution',
      name: 'Data Execution', // Add name for display
      title: 'Executing Queries',
      description: 'Running SQL queries and fetching data for charts',
      status: 'pending'
    },
    {
      id: 'chart-rendering',
      name: 'Chart Rendering', // Add name for display
      title: 'Rendering Charts',
      description: 'Creating visualizations and finalizing dashboard',
      status: 'pending'
    }
  ];
}

// Helper function to update generation step
export function updateGenerationStep(
  steps: GenerationStep[],
  stepId: string,
  updates: Partial<GenerationStep>
): GenerationStep[] {
  return steps.map(step =>
    step.id === stepId
      ? { ...step, ...updates }
      : step
  );
}

// Helper function to calculate overall progress
export function calculateOverallProgress(steps: GenerationStep[]): number {
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  return Math.round((completedSteps / steps.length) * 100);
}

// Helper function to create a basic chart template
export function createChartTemplate(
  type: ChartType, 
  title: string, 
  sql: string, 
  position: ChartPosition
): Partial<Chart> {
  const base = {
    type,
    title,
    description: `${title} visualization`,
    sql,
    position
  };

  switch (type) {
    case 'bar':
      return { 
        ...base, 
        type: 'bar',
        xAxis: 'category', 
        yAxis: 'value' 
      } as BarChart;
      
    case 'line':
      return { 
        ...base, 
        type: 'line',
        xAxis: 'date', 
        yAxis: 'value' 
      } as LineChart;
      
    case 'pie':
      return { 
        ...base, 
        type: 'pie',
        dataKey: 'value', 
        colorBy: 'category' 
      } as PieChart;
      
    case 'card':
      return { 
        ...base, 
        type: 'card',
        valueKey: 'value' 
      } as CardChart;
      
    default:
      return base;
  }
}