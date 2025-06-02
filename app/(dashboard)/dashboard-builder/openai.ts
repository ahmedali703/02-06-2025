import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { 
  getDatabaseSchema,
  formatSchemaForPrompt
} from '../../../lib/schema';
import { 
  dashboardConfigSchema, 
  DashboardConfig,
  ChartType,
  ChartPosition
} from './schemas';

// Import the connection details function from db.ts instead
import { getOrgConnectionDetails } from '../../../lib/db';

/**
 * Create default position for chart
 */
function createDefaultPosition(index: number, columns: number = 12): ChartPosition {
  const chartsPerRow = Math.floor(columns / 4);
  const row = Math.floor(index / chartsPerRow);
  const col = index % chartsPerRow;
  
  return {
    x: col * 4,
    y: row * 2,
    w: 4,
    h: 2
  };
}

/**
 * Get available tables for organization
 */
async function getAvailableTables(orgId: number): Promise<{ tables: any[], columns: any[] }> {
  try {
    const schema = await getDatabaseSchema(orgId);
    return schema || { tables: [], columns: [] };
  } catch (error) {
    console.error('Error fetching schema:', error);
    return { tables: [], columns: [] };
  }
}

/**
 * Format schema for AI prompt
 */
function formatSchemaForAI(schema: { tables: any[], columns: any[] }): string {
  if (!schema.tables || schema.tables.length === 0) {
    return 'No tables available in the database.';
  }
  
  // Use the formatSchemaForPrompt function from schema.ts
  return formatSchemaForPrompt(schema);
}

/**
 * Enhance dashboard configuration with proper positioning
 */
function enhanceDashboardConfig(dashboard: DashboardConfig): DashboardConfig {
  // Ensure all charts have valid positions
  const positionedCharts = dashboard.charts.map((chart, index) => {
    if (!chart.position || 
        typeof chart.position.x !== 'number' || 
        typeof chart.position.y !== 'number' || 
        typeof chart.position.w !== 'number' || 
        typeof chart.position.h !== 'number') {
      
      chart.position = createDefaultPosition(index, dashboard.layout?.columns || 12);
    }
    
    // Ensure position is within bounds
    chart.position.x = Math.max(0, Math.min(11, chart.position.x));
    chart.position.y = Math.max(0, chart.position.y);
    chart.position.w = Math.max(1, Math.min(12, chart.position.w));
    chart.position.h = Math.max(1, Math.min(6, chart.position.h));
    
    // Ensure chart doesn't overflow grid
    if (chart.position.x + chart.position.w > 12) {
      chart.position.w = 12 - chart.position.x;
    }
    
    // Ensure description exists
    if (!chart.description) {
      chart.description = `Visualization of ${chart.title.toLowerCase()}`;
    }
    
    // Ensure ID exists
    if (!chart.id) {
      chart.id = `chart-${chart.type}-${index}-${Date.now()}`;
    }
    
    return chart;
  });
  
  // Calculate required rows
  const maxY = Math.max(...positionedCharts.map(c => c.position.y + c.position.h));
  
  // Ensure layout is properly configured
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
  
  // Ensure other optional properties have defaults
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

/**
 * Create a fallback dashboard when generation fails
 */
function createFallbackDashboard(prompt: string): DashboardConfig {
  console.log(`Creating fallback dashboard for prompt: ${prompt}`);
  
  return {
    title: `Dashboard: ${prompt.substring(0, 50)}...`,
    description: "Default dashboard created due to configuration issues. Please verify your database connection and try again.",
    charts: [
      {
        id: 'fallback-status',
        type: 'card',
        title: 'System Status',
        description: 'Current system connection status',
        sql: "SELECT 'Connected' as status, 1 as value FROM DUAL",
        valueKey: 'value',
        position: { x: 0, y: 0, w: 3, h: 1 }
      },
      {
        id: 'fallback-info',
        type: 'table',
        title: 'Configuration Information',
        description: 'System configuration details',
        sql: "SELECT 'Database' as component, 'Check connection settings' as status FROM DUAL UNION ALL SELECT 'Schema' as component, 'Verify table access' as status FROM DUAL",
        columns: [
          { key: 'component', title: 'Component', sortable: true },
          { key: 'status', title: 'Status', sortable: true }
        ],
        position: { x: 3, y: 0, w: 9, h: 1 }
      }
    ],
    layout: {
      columns: 12,
      rows: 2,
      gap: 16,
      padding: 16
    },
    insights: [],
    theme: 'system',
    refreshInterval: 300,
    exportOptions: {
      pdf: true,
      csv: true,
      image: true
    }
  };
}

/**
 * Generate dashboard from prompt
 */
export async function generateDashboard(
  prompt: string, 
  orgId: number
): Promise<DashboardConfig> {
  try {
    console.log(`Generating dashboard for prompt: ${prompt}`);
    
    // Get available tables
    const schemaData = await getAvailableTables(orgId);
    
    if (!schemaData.tables || schemaData.tables.length === 0) {
      console.log('No tables found, generating fallback dashboard');
      return createFallbackDashboard(prompt);
    }
    
    // Format schema for AI
    const schemaDescription = formatSchemaForAI(schemaData);
    console.log(`Formatted schema with ${schemaData.tables.length} tables`);
    
    // Check if it's Oracle database
    const orgDetails = await getOrgConnectionDetails(orgId);
    const isOracle = !!orgDetails?.connectString;
    
    // Generate dashboard configuration
    console.log('Calling OpenAI to generate dashboard configuration...');
    
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: dashboardConfigSchema,
      system: `
You are an expert dashboard designer who creates insightful business dashboards.

CRITICAL RULES:
1. Chart types MUST be one of: 'bar', 'line', 'area', 'pie', 'donut', 'card', 'table', 'scatter'
   NEVER use 'number' - use 'card' instead for single metrics.

2. Database-specific SQL:
   ${isOracle ? `
   - This is an Oracle database
   - ALWAYS use "FROM DUAL" for SELECT statements without a table
   - Example: SELECT 'Connected' AS status, 1 AS value FROM DUAL
   - Use Oracle date functions: SYSDATE, TO_CHAR, ADD_MONTHS, etc.
   - Use FETCH FIRST n ROWS ONLY for limiting results
   ` : `
   - This is a PostgreSQL database
   - Can use SELECT without FROM for constants
   - Use PostgreSQL date functions: NOW(), TO_CHAR, etc.
   - Use LIMIT n for limiting results
   `}

3. Table names must match EXACTLY (case-sensitive) as provided in the schema.

4. Required fields by chart type:
   - card: MUST have 'valueKey' field pointing to the numeric column
   - bar/line/area: MUST have 'xAxis' and 'yAxis' fields
   - pie/donut: MUST have 'dataKey' (values) and 'colorBy' (categories) fields
   - table: MUST have 'columns' array with key/title pairs
   - scatter: MUST have 'xAxis' and 'yAxis' fields

5. Layout rules:
   - Use a 12-column grid system
   - Each chart must have a position with x, y, w (width), h (height)
   - x + w must not exceed 12
   - Arrange charts logically, with important metrics at the top

Available database schema:
${schemaDescription}`,
      prompt: `Create a comprehensive dashboard for: ${prompt}

Requirements:
- Generate 4-8 relevant charts based on the available data
- Include a mix of chart types for variety
- Ensure SQL queries are valid and will execute successfully
- Position charts in a logical, visually appealing layout
- Include descriptive titles and meaningful descriptions`,
    });

    console.log(`Generated dashboard: ${result.object.title} with ${result.object.charts.length} charts`);
    
    // Enhance the configuration
    const enhancedConfig = enhanceDashboardConfig(result.object);
    
    return enhancedConfig;
    
  } catch (error: any) {
    console.error('Error generating dashboard:', error);
    // Return a fallback dashboard on error
    return createFallbackDashboard(prompt);
  }
}

/**
 * Generate SQL for a specific chart
 */
export async function generateChartSQL(
  chartDescription: string,
  orgId: number
): Promise<string> {
  try {
    const schemaData = await getAvailableTables(orgId);
    const schemaDescription = formatSchemaForAI(schemaData);
    const orgDetails = await getOrgConnectionDetails(orgId);
    const isOracle = !!orgDetails?.connectString;
    
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        sql: z.string(),
        explanation: z.string(),
      }),
      system: `
You are a SQL expert. Generate SQL queries for data visualization.

Database type: ${isOracle ? 'Oracle' : 'PostgreSQL'}
${isOracle ? 'ALWAYS use FROM DUAL for SELECT without tables' : ''}

Available schema:
${schemaDescription}`,
      prompt: `Generate a SQL query for: ${chartDescription}`,
    });

    return result.object.sql;
  } catch (error) {
    console.error('Error generating chart SQL:', error);
    return "SELECT 'Error generating SQL' as error FROM DUAL";
  }
}

/**
 * Explain SQL query in simple terms
 */
export async function explainChartSQL(
  chartTitle: string,
  sqlQuery: string,
  orgId?: number
): Promise<string> {
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        explanation: z.string(),
      }),
      system: `You are a SQL expert who explains queries in simple, business-friendly terms.`,
      prompt: `Explain this SQL query for the chart "${chartTitle}": ${sqlQuery}`,
    });

    return result.object.explanation;
  } catch (error) {
    console.error('Error explaining SQL:', error);
    return 'Unable to generate explanation for this query.';
  }
}

/**
 * Get optimization hints for specific chart types
 */
function getChartTypeOptimizationHints(chartType: ChartType): string {
  const hints: Record<ChartType, string> = {
    bar: 'Limit to 10-20 categories for readability. Order by value DESC. Include proper grouping.',
    line: 'Ensure chronological ordering. Fill missing time periods with zeros. Limit to meaningful date range.',
    area: 'Similar to line charts. Ensure all values are non-negative. Order chronologically.',
    pie: 'Limit to 5-10 segments maximum. Group smaller segments as "Others". Order by value DESC.',
    donut: 'Same as pie chart. Consider showing percentages in the query.',
    card: 'Return exactly one row with the key metric. Include comparison values if relevant.',
    table: 'Include pagination using LIMIT/OFFSET or FETCH. Sort by most relevant column.',
    scatter: 'Limit to 100-500 points for performance. Ensure no NULL values in x/y columns.'
  };
  return hints[chartType] || '- Optimize for general visualization needs';
}

/**
 * Optimize SQL for specific chart type
 */
export async function optimizeChartSQL(
  sqlQuery: string,
  chartType: ChartType,
  orgId: number
): Promise<string> {
  try {
    const orgDetails = await getOrgConnectionDetails(orgId);
    const isOracle = !!orgDetails?.connectString;
    
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        optimizedQuery: z.string(),
        improvements: z.array(z.string()),
      }),
      system: `
You are a database performance expert. Optimize SQL queries for visualization.

Database: ${isOracle ? 'Oracle' : 'PostgreSQL'}
Chart type: ${chartType}

Optimization rules for ${chartType}:
${getChartTypeOptimizationHints(chartType)}`,
      prompt: `Optimize this query: ${sqlQuery}`,
    });

    console.log(`SQL optimized for ${chartType}. Improvements: ${result.object.improvements.join(', ')}`);
    return result.object.optimizedQuery;
  } catch (error) {
    console.error('Error optimizing SQL:', error);
    return sqlQuery; // Return original if optimization fails
  }
}

/**
 * Generate suggestions for dashboard improvements
 */
export async function suggestDashboardImprovements(
  dashboardConfig: DashboardConfig,
  orgId: number
): Promise<string[]> {
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        suggestions: z.array(z.string()).max(5)
      }),
      system: `You are a dashboard design expert. Analyze the dashboard configuration and suggest improvements for better data visualization, user experience, and performance.`,
      prompt: `Analyze this dashboard and suggest improvements:
Title: ${dashboardConfig.title}
Charts: ${dashboardConfig.charts.map(c => `${c.type}: ${c.title}`).join(', ')}
Layout: ${dashboardConfig.layout.columns}x${dashboardConfig.layout.rows}`,
    });

    return result.object.suggestions;
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return [
      'Consider adding more variety to chart types',
      'Optimize SQL queries for better performance',
      'Ensure charts are properly positioned for better readability'
    ];
  }
}