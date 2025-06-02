import { OpenAI } from 'openai';
import { StreamingDashboardResponse } from './mock-generator';
import { DashboardConfig, Chart, ChartType } from './schemas';
import { v4 as uuidv4 } from 'uuid';
import { getOrgConnectionDetails } from '../../../lib/db';
import { verifyJWT } from '../../../lib/auth';
import { cookies } from 'next/headers';
import { query } from '../../../lib/db';
import { runGenerateSQLQuery } from '../../../app/aiquery/actions';
import { optimizeChartSQL } from './actions';
import { generateChartInsights } from './chart-insights';
import { createDefaultPosition } from '../../../lib/utils';






// Get user context from JWT token
export async function getUserContext(): Promise<{ userId: number; orgId: number }> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  
  if (!token) {
    throw new Error('Authentication required. Please login.');
  }
  
  const verifiedToken = verifyJWT(token);
  if (!verifiedToken || !verifiedToken.userId) {
    throw new Error('Invalid authentication token.');
  }
  
  const userId = verifiedToken.userId;
  
  // Get user's organization
  const userResult = await query(
     'SELECT "ORG_ID" FROM "NL2SQL_USERS" WHERE "ID" = $1',
    [userId]
  );
  
  if (!userResult || userResult.length === 0) {
    throw new Error('User not found');
  }
  
  const orgId = userResult[0].ORG_ID;
  
  if (!orgId) {
    throw new Error('User is not associated with any organization');
  }
  
  return { userId, orgId };
}

// Get available tables for organization
async function getAvailableTables(orgId: number): Promise<any[]> {
  try {
    console.log(`Fetching available tables for organization ${orgId}`);
    
    // Get tables from central repository
    const tablesResult = await query(
      `SELECT "ID", "TABLE_NAME", "TABLE_DESCRIPTION" 
       FROM "NL2SQL_AVAILABLE_TABLES" 
       WHERE "ORG_ID" = $1 AND "IS_ACTIVE" = 'Y'
       ORDER BY "TABLE_NAME"`,
      [orgId]
    );
    
    if (!tablesResult || tablesResult.length === 0) {
      console.log('No active tables found for organization');
      return [];
    }
    
    const tables = tablesResult;
    const tableIds = tables.map((t: any) => t.ID);
    
    // Get columns for these tables
    const columnsResult = await query(
      `SELECT "TABLE_ID", "COLUMN_NAME", "COLUMN_TYPE", "COLUMN_DESCRIPTION"
       FROM "NL2SQL_TABLE_COLUMNS"
       WHERE "TABLE_ID" = ANY($1::int[])
       ORDER BY "TABLE_ID", "COLUMN_NAME"`,
      [tableIds]
    );
    
    // Group columns by table
    const columnsByTable: Record<number, any[]> = {};
    if (columnsResult) {
      columnsResult.forEach((col: any) => {
        if (!columnsByTable[col.TABLE_ID]) {
          columnsByTable[col.TABLE_ID] = [];
        }
        columnsByTable[col.TABLE_ID].push(col);
      });
    }
    
    // Combine tables with their columns
    return tables.map((table: any) => ({
      tableId: table.ID,
      tableName: table.TABLE_NAME,
      tableDescription: table.TABLE_DESCRIPTION,
      columns: columnsByTable[table.ID] || []
    }));
    
  } catch (error) {
    console.error('Error fetching available tables:', error);
    return [];
  }
}

/**
 * Execute dashboard queries
 */
async function executeChartQuery(
  chart: Chart,
  userId: number,
  orgId: number
): Promise<Chart> {
  console.log('Executing SQL queries for chart...');
    
    try {
      // Optimize SQL for chart type
      const optimizedSql = await optimizeChartSQL(chart.sql, chart.type, orgId);
      
      // Execute query using NL2SQL's validated execution
      const results = await runGenerateSQLQuery(optimizedSql, String(userId), userId);
      
      // Generate insights for the chart
      const insights = await generateChartInsights(chart, results || [], optimizedSql);
      console.log(`✓ Chart "${chart.title}" executed successfully, ${results?.length || 0} rows, ${insights.length} insights`);
      return ({
        ...chart,
        sql: optimizedSql,
        data: results || [],
        insights,
        error: undefined
      });
    } catch (error: any) {
      console.error(`✗ Chart "${chart.title}" execution failed:`, error.message);
      
      return ({
        ...chart,
        data: [],
        insights: [],
        error: error.message || 'Failed to load data'
      });
    }
  
}

// Format schema for AI prompt
function formatSchemaForAI(tables: any[]): string {
  if (!tables || tables.length === 0) {
    return 'No tables available in the database.';
  }
  
  return tables.map(table => {
    const columnsDesc = table.columns
      .map((col: any) => `  - ${col.COLUMN_NAME} (${col.COLUMN_TYPE}): ${col.COLUMN_DESCRIPTION || 'No description'}`)
      .join('\n');
    
    return `Table: ${table.tableName}
Description: ${table.tableDescription || 'No description'}
Columns:
${columnsDesc}`;
  }).join('\n\n');
}

export async function* generateDashboardWithOpenAI(prompt: string): AsyncGenerator<StreamingDashboardResponse> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Get user context and schema information
    const { userId, orgId } = await getUserContext();
    const availableTables = await getAvailableTables(orgId);
    const schemaDescription = formatSchemaForAI(availableTables);
    
    // Check database type
    const orgDetails = await getOrgConnectionDetails(orgId);
    const isOracle = !!orgDetails?.connectString;

    // Initial configuration
    yield {
      type: 'init',
      data: {
        config: {
          title: `Dashboard: ${prompt}`,
          description: 'Generating dashboard with AI...',
          charts: [],
          layout: { columns: 12, rows: 4, gap: 16, padding: 16 }
        }
      }
    };

    let currentChartBuffer = '';
    let charts: Chart[] = [];
    let chartIndex = 0;

    // Stream the completion
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a dashboard designer AI that generates charts one at a time in JSON format.
Each chart should be on a new line and be a complete, valid JSON object.
Each chart must have these fields:
- id: string (unique)
- type: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'card' | 'table' | 'scatter'
- title: string
- description: string
- sql: string (valid SQL query)

Additional fields based on type:
- card: valueKey
- bar/line/area: xAxis, yAxis
- pie/donut: dataKey, colorBy
- table: columns array
- scatter: xAxis, yAxis

Database type: ${isOracle ? 'Oracle' : 'PostgreSQL'}
${isOracle ? `
- ALWAYS use "FROM DUAL" for SELECT statements without a table
- Use Oracle date functions: SYSDATE, TO_CHAR, ADD_MONTHS, etc.
- Use FETCH FIRST n ROWS ONLY for limiting results
` : `
- Can use SELECT without FROM for constants
- Use PostgreSQL date functions: NOW(), TO_CHAR, etc.
- Use LIMIT n for limiting results
`}

Available database schema:
${schemaDescription}

Example output format (one chart per line):
{"id":"chart1","type":"bar","title":"Sales by Region","description":"Regional sales distribution","sql":"SELECT region, SUM(sales) as total FROM sales GROUP BY region","xAxis":"region","yAxis":"total"}
{"id":"chart2","type":"line","title":"Monthly Trend","description":"Sales trend over time","sql":"SELECT month, revenue FROM monthly_stats","xAxis":"month","yAxis":"revenue"}`
        },
        {
          role: 'user',
          content: `Generate EXACTLY 4 charts for a dashboard about: ${prompt}
Make sure each chart JSON is on its own line and is valid JSON.
Use appropriate chart types and SQL queries that will work with the provided schema.
Ensure variety in chart types and comprehensive coverage of the requested metrics.
`
        }
      ],
      stream: true,
      temperature: 0.4,
      max_completion_tokens: 2000
    });

    // Process the streaming response
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        currentChartBuffer += content;
        
        // Check for complete JSON objects (one per line)
        const lines = currentChartBuffer.split('\n');
        
        // Process all complete lines except the last one (which might be incomplete)
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line) {
            try {
              const chartData = JSON.parse(line);
              
              // Add any missing fields and validate
              const chart: Chart = {
                ...chartData,
                id: chartData.id || `chart-${uuidv4()}`,
                position: {
                  x: 0,
                  y: chartIndex * 2,
                  w: 12,
                  h: 2
                },
                insights: [] // Will be populated later
              };

              // Execute the SQL query
              try {
                // const results = await runGenerateSQLQuery(chart.sql, String(userId), userId);
                const result = await executeChartQuery(chart, userId, orgId);
                console.log("RESULT: ", result);
                Object.assign(chart, result);
                // chart.data = results || [];
              } catch (error: any) {
                console.error(`Error executing SQL for chart "${chart.title}":`, error);
                chart.error = error.message || 'Failed to execute query';
                chart.data = [];
              }
              
              charts.push(chart);
              chartIndex++;
              
              // Emit the chart
              yield {
                type: 'chart',
                data: { chart }
              };
            } catch (error) {
              console.error('Error parsing chart JSON:', error);
            }
          }
        }
        
        // Keep the last (potentially incomplete) line in the buffer
        currentChartBuffer = lines[lines.length - 1];
      }
    }

    // Process any remaining content in the buffer
    if (currentChartBuffer.trim()) {
      try {
        const chartData = JSON.parse(currentChartBuffer.trim());
        const chart: Chart = {
          ...chartData,
          id: chartData.id || `chart-${uuidv4()}`,
          position: {
            x: 0,
            y: chartIndex * 2,
            w: 12,
            h: 2
          },
          insights: []
        };

        // Execute the SQL query
        try {
          const results = await runGenerateSQLQuery(chart.sql, String(userId), userId);
          chart.data = results || [];
        } catch (error: any) {
          console.error(`Error executing SQL for chart "${chart.title}":`, error);
          chart.error = error.message || 'Failed to execute query';
          chart.data = [];
        }

        charts.push(chart);
        
        yield {
          type: 'chart',
          data: { chart }
        };
      } catch (error) {
        console.error('Error parsing final chart JSON:', error);
      }
    }

    // Generate insights for the entire dashboard
    try {
      const insightsCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an analytics expert that generates insights from dashboard data.
Your task is to analyze the charts and generate meaningful insights about the overall dashboard.

IMPORTANT: You must respond with ONLY a valid JSON array of insights. Each insight must follow this exact structure:
{
  "id": "string (unique identifier)",
  "title": "string (short, descriptive title)",
  "description": "string (detailed explanation)",
  "type": "trend" | "anomaly" | "comparison" | "summary",
  "severity": "info" | "warning" | "critical",
  "metric": number (optional),
  "trend": "up" | "down" | "stable" (optional),
  "changePercent": number (optional),
  "relatedChartIds": string[] (optional)
}

Example response format:
[
  {
    "id": "insight-1",
    "title": "Strong Revenue Growth",
    "description": "Overall revenue shows consistent upward trend across all metrics",
    "type": "trend",
    "severity": "info",
    "metric": 15.5,
    "trend": "up",
    "changePercent": 15.5,
    "relatedChartIds": ["chart-1", "chart-2"]
  }
]`
          },
          {
            role: 'user',
            content: `Generate 3-5 high-level insights for these charts:
${JSON.stringify(charts.map(c => ({
  id: c.id,
  title: c.title,
  type: c.type,
  data: c.data?.slice(0, 3), // Send sample of data
  insights: c.insights // Include chart-level insights
})), null, 2)}`
          }
        ],
        temperature: 0.2, // Lower temperature for more consistent JSON output
        response_format: { type: "json_object" } // Request JSON response
      });

      let insights;
      try {
        const content = insightsCompletion.choices[0]?.message?.content || '{"insights": []}';
        const parsed = JSON.parse(content);
        insights = Array.isArray(parsed) ? parsed : 
                   Array.isArray(parsed.insights) ? parsed.insights : [];
        
        console.log("Generated dashboard insights:", insights);
        
        yield {
          type: 'insights',
          data: { insights }
        };
      } catch (error) {
        console.error('Error parsing insights:', error);
        yield {
          type: 'insights',
          data: { insights: [] }
        };
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      yield {
        type: 'insights',
        data: { insights: [] }
      };
    }

    // Send completion with stats
    yield {
      type: 'complete',
      data: {
        stats: {
          total: charts.length,
          successful: charts.length, // Will be updated with actual success/failure after execution
          failed: 0
        },
        message: `Generated ${charts.length} charts with AI`
      }
    };
  } catch (error: any) {
    console.error('Error in OpenAI dashboard generation:', error);
    throw new Error(error.message || 'Failed to generate dashboard');
  }
}
