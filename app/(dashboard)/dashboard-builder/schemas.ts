import { z } from 'zod';

// Chart position schema
const chartPositionSchema = z.object({
  x: z.number().min(0).max(11),
  y: z.number().min(0).max(11),
  w: z.number().min(1).max(12),
  h: z.number().min(1).max(6),
});

// Base chart schema with common fields
const baseChartSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  sql: z.string(),
  position: chartPositionSchema,
  data: z.array(z.record(z.any())).optional(),
  error: z.string().optional(),
  insights: z.array(z.object({
    key: z.string(),
    value: z.union([z.string(), z.number()]),
    trend: z.enum(['up', 'down', 'stable']).optional(),
    changePercent: z.number().optional(),
    description: z.string().optional(),
    type: z.enum(['trend', 'summary', 'comparison', 'anomaly']).optional(),
    severity: z.enum(['info', 'warning', 'critical']).optional(),
    timeframe: z.string().optional(),
    benchmark: z.number().optional(),
    thresholds: z.object({
      warning: z.number(),
      critical: z.number()
    }).optional(),
  })).optional(),
});

// Specific chart type schemas
const barChartSchema = baseChartSchema.extend({
  type: z.literal('bar'),
  xAxis: z.string(),
  yAxis: z.string(),
  defaultInsightTypes: z.array(z.enum([
    'distribution',
    'topContributors',
    'comparison',
    'trend'
  ])).optional(),
});

const lineChartSchema = baseChartSchema.extend({
  type: z.literal('line'),
  xAxis: z.string(),
  yAxis: z.string(),
  defaultInsightTypes: z.array(z.enum([
    'trend',
    'anomaly',
    'seasonality',
    'forecast'
  ])).optional(),
});

const areaChartSchema = baseChartSchema.extend({
  type: z.literal('area'),
  xAxis: z.string(),
  yAxis: z.string(),
  defaultInsightTypes: z.array(z.enum([
    'trend',
    'composition',
    'stackedAnalysis',
    'periodComparison'
  ])).optional(),
});

const pieChartSchema = baseChartSchema.extend({
  type: z.literal('pie'),
  dataKey: z.string(),
  colorBy: z.string(),
  showLabels: z.boolean().optional(),
  defaultInsightTypes: z.array(z.enum([
    'composition',
    'dominance',
    'segmentAnalysis',
    'distribution'
  ])).optional(),
});

const donutChartSchema = baseChartSchema.extend({
  type: z.literal('donut'),
  dataKey: z.string(),
  colorBy: z.string(),
  showLabels: z.boolean().optional(),
  defaultInsightTypes: z.array(z.enum([
    'composition',
    'dominance',
    'segmentAnalysis',
    'distribution'
  ])).optional(),
});

const cardChartSchema = baseChartSchema.extend({
  type: z.literal('card'),
  valueKey: z.string(),
  trend: z.string().optional(),
  comparison: z.string().optional(),
  defaultInsightTypes: z.array(z.enum([
    'status',
    'trend',
    'threshold',
    'comparison'
  ])).optional(),
});

const tableChartSchema = baseChartSchema.extend({
  type: z.literal('table'),
  columns: z.array(z.object({
    key: z.string(),
    title: z.string(),
    sortable: z.boolean().optional(),
  })),
  pageSize: z.number().optional(),
  defaultInsightTypes: z.array(z.enum([
    'summary',
    'outliers',
    'patterns',
    'aggregation'
  ])).optional(),
});

const scatterChartSchema = baseChartSchema.extend({
  type: z.literal('scatter'),
  xAxis: z.string(),
  yAxis: z.string(),
  sizeKey: z.string().optional(),
  colorBy: z.string().optional(),
  defaultInsightTypes: z.array(z.enum([
    'correlation',
    'clusters',
    'outliers',
    'trend'
  ])).optional(),
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
  scatterChartSchema,
]);

// Dashboard layout schema
const layoutSchema = z.object({
  columns: z.number().min(1).max(12),
  rows: z.number().min(1).max(12),
  gap: z.number().optional(),
  padding: z.number().optional(),
});

const insightSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['trend', 'anomaly', 'comparison', 'summary']),
  severity: z.enum(['info', 'warning', 'critical']),
  metric: z.number().optional(),
  trend: z.enum(['up', 'down', 'stable']).optional(),
  changePercent: z.number().optional(),
  relatedChartIds: z.array(z.string()).optional(),
});

// Main dashboard configuration schema
export const dashboardConfigSchema = z.object({
  title: z.string(),
  description: z.string(),
  charts: z.array(chartSchema),
  insights: z.array(insightSchema),
  layout: layoutSchema,
  theme: z.enum(['light', 'dark', 'system']).optional(),
  refreshInterval: z.number().optional(),
  exportOptions: z.object({
    pdf: z.boolean().optional(),
    csv: z.boolean().optional(),
    image: z.boolean().optional(),
  }).optional(),
});

// Export types
export type ChartPosition = z.infer<typeof chartPositionSchema>;
export type Chart = z.infer<typeof chartSchema>;
export type DashboardConfig = z.infer<typeof dashboardConfigSchema>;
export type ChartType = Chart['type'];