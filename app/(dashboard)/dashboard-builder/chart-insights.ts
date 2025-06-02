import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { Chart, ChartType } from './schemas';

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

const chartInsightSchema = z.object({
  insights: z.array(z.object({
    key: z.string(),
    value: z.union([z.string(), z.number()]),
    description: z.string(),
    type: z.enum(['trend', 'summary', 'comparison', 'anomaly']),
    severity: z.enum(['info', 'warning', 'critical']),
    trend: z.enum(['up', 'down', 'stable']).optional(),
    changePercent: z.number().optional(),
    timeframe: z.string().optional(),
    benchmark: z.number().optional(),
    thresholds: z.object({
      warning: z.number(),
      critical: z.number()
    }).optional(),
  }))
});

/**
 * Generate insights for a chart using AI
 */
export async function generateChartInsights(
  chart: Chart,
  data: any[],
  sql: string
): Promise<ChartInsight[]> {
  try {
    // Skip if no data
    if (!data || data.length === 0) {
      console.log("No data to generate insights for");
      return [];
    }

    // Calculate basic statistics for the data
    const numericColumns = Object.keys(data[0]).filter(key => 
      typeof data[0][key] === 'number' || !isNaN(Number(data[0][key]))
    );
    
    const stats = numericColumns.reduce((acc, col) => {
      const values = data.map(d => Number(d[col])).filter(v => !isNaN(v));
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      acc[col] = { sum, avg, max, min };
      return acc;
    }, {} as Record<string, { sum: number; avg: number; max: number; min: number; }>);

    // Get default insight types for this chart type
    const defaultInsightTypes = getDefaultInsightTypes(chart.type);

    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: chartInsightSchema,
      system: `You are an analytics expert that generates insights from chart data.
Generate meaningful insights for a ${chart.type} chart based on its data and SQL query.

Each insight should have:
- key: Short identifier for the insight
- value: The main numeric/string value
- description: Clear explanation of what the insight means
- type: 'trend' | 'summary' | 'comparison' | 'anomaly'
- severity: 'info' | 'warning' | 'critical'
- trend: 'up' | 'down' | 'stable' (optional)
- changePercent: Percentage change (optional)
- timeframe: Time period reference (optional)
- benchmark: Reference value (optional)
- thresholds: Warning/critical thresholds (optional)

Focus on these insight types for ${chart.type} charts:
${defaultInsightTypes.join(', ')}

Consider:
- Trends and patterns in the data
- Notable changes or anomalies
- Key metrics and their significance
- Comparisons and benchmarks
- Potential issues or warnings`,
      prompt: `Generate insights for this ${chart.type} chart:

Title: ${chart.title}
Description: ${chart.description || 'No description provided'}

SQL Query:
${sql}

Data Sample (${data.length} rows):
${JSON.stringify(data.slice(0, 5), null, 2)}

Basic Statistics:
${JSON.stringify(stats, null, 2)}

Generate 2-4 meaningful insights based on this data.`
    });

    return result.object.insights;

  } catch (error) {
    console.error('Error generating chart insights:', error);
    return [];
  }
}

/**
 * Get default insight types for a chart type
 */
function getDefaultInsightTypes(type: ChartType): string[] {
  switch (type) {
    case 'bar':
      return ['distribution', 'topContributors', 'comparison', 'trend'];
    case 'line':
      return ['trend', 'anomaly', 'seasonality', 'forecast'];
    case 'area':
      return ['trend', 'composition', 'stackedAnalysis', 'periodComparison'];
    case 'pie':
    case 'donut':
      return ['composition', 'dominance', 'segmentAnalysis', 'distribution'];
    case 'card':
      return ['status', 'trend', 'threshold', 'comparison'];
    case 'table':
      return ['summary', 'outliers', 'patterns', 'aggregation'];
    case 'scatter':
      return ['correlation', 'clusters', 'outliers', 'trend'];
    default:
      return ['summary', 'trend', 'comparison', 'anomaly'];
  }
} 