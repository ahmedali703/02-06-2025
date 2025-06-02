'use server';

import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import oracledb from 'oracledb';
import { z } from 'zod';
import { runGenerateSQLQuery } from '../../../app/aiquery/actions';
import { getOrgConnectionDetails, query } from '../../../lib/db';
import { getUserContext } from './openai-generator';
import {  ChartType, DashboardConfig } from './schemas';
import { createDefaultPosition } from '../../../lib/utils';

// Define DashboardStats type locally
interface DashboardStats {
  total: number;
  successful: number;
  failed: number;
}

/**
 * Get Oracle connection for organization
 */
async function getOracleConnection(orgDetails: any) {
  const connectionConfig = {
    user: orgDetails.username,
    password: orgDetails.password,
    connectString: orgDetails.connectString
  };
  
  return await oracledb.getConnection(connectionConfig);
}




/**
 * Save dashboard generation
 */
const saveDashboardGeneration = async (
  userId: number,
  orgId: number,
  prompt: string,
  config: DashboardConfig,
  stats: DashboardStats
): Promise<void> => {
  try {
    console.log(`Saving dashboard generation for user ${userId}, org ${orgId}`);
    
    await query(
      `INSERT INTO "NL2SQL_DASHBOARD_GENERATIONS" 
       ("USER_ID", "ORG_ID", "PROMPT", "DASHBOARD_CONFIG", "GENERATION_STATS", "CREATED_AT")
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, CURRENT_TIMESTAMP)`,
      [userId, orgId, prompt, JSON.stringify(config), JSON.stringify(stats)]
    );
    
    console.log('Dashboard generation saved successfully');
  } catch (error) {
    console.error('Error saving dashboard generation:', error);
  }
};

/**
 * Optimize SQL for chart type
 */
export const optimizeChartSQL = async (
  sqlQuery: string,
  chartType: ChartType,
  orgId: number
): Promise<string> => {
  'use server';
  
  try {
    const orgDetails = await getOrgConnectionDetails(orgId);
    const databaseType = orgDetails?.connectString ? 'oracle' : 'postgres';
    
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        optimizedQuery: z.string(),
        improvements: z.array(z.string()),
      }),
      system: `
You are a database performance expert specializing in ${databaseType.toUpperCase()} query optimization.
Optimize the SQL query for a ${chartType} chart.

${databaseType === 'oracle' ? `
Oracle specific rules:
- Use Oracle optimizer hints like /*+ FIRST_ROWS(n) */
- Use FETCH FIRST n ROWS ONLY for limiting
- Remember to use FROM DUAL for SELECT without tables
` : `
PostgreSQL specific rules:
- Use LIMIT efficiently
- Consider CTEs for readability
`}

Chart requirements for ${chartType}:
${getChartTypeOptimizationHints(chartType)}`,
      prompt: `Optimize this query: ${sqlQuery}`,
    });

    console.log(`SQL optimized for ${chartType}. Improvements: ${result.object.improvements.join(', ')}`);
    return result.object.optimizedQuery;
  } catch (error) {
    console.error('Error optimizing chart SQL:', error);
    return sqlQuery;
  }
};

/**
 * Get chart optimization hints
 */
function getChartTypeOptimizationHints(chartType: ChartType): string {
  const hints: Record<ChartType, string> = {
    bar: 'Limit to 10-20 categories, order by value DESC',
    line: 'Ensure chronological ordering, include all time periods',
    area: 'Similar to line, ensure non-negative values',
    pie: 'Limit to 10 segments max, order by value DESC',
    donut: 'Same as pie, consider grouping small segments',
    card: 'Return single row with key metric',
    table: 'Include pagination limits (20-50 rows)',
    scatter: 'Limit to 100-500 points, ensure no NULL in x/y'
  };
  
  return hints[chartType] || 'Optimize for general visualization';
}

/**
 * Save dashboard
 */
export const saveDashboard = async (
  uuid: string,
  name: string,
  config: DashboardConfig
): Promise<{ success: boolean; message: string }> => {
  'use server';
  
  try {
    const { userId, orgId } = await getUserContext();
    
    const existingDashboard = await query(
      `SELECT "DASHBOARD_UUID" FROM "NL2SQL_SAVED_DASHBOARDS" 
       WHERE "DASHBOARD_UUID" = $1 AND "ORG_ID" = $2`,
      [uuid, orgId]
    );
    
    // Ensure insights and data are properly structured in the config
    const enhancedConfig = {
      ...config,
      insights: config.insights || [],
      charts: config.charts.map(chart => ({
        ...chart,
        insights: chart.insights || [],
        data: Array.isArray(chart.data) ? chart.data : [], // Ensure data is always an array
        error: chart.error || undefined
      }))
    };
    
    const dashboardConfig = JSON.stringify(enhancedConfig);
    
    if (existingDashboard && existingDashboard.length > 0) {
      await query(
        `UPDATE "NL2SQL_SAVED_DASHBOARDS" 
         SET "DASHBOARD_NAME" = $1, 
             "DASHBOARD_CONFIG" = $2, 
             "UPDATED_AT" = CURRENT_TIMESTAMP,
             "USER_ID" = $3
         WHERE "DASHBOARD_UUID" = $4 AND "ORG_ID" = $5`,
        [name, dashboardConfig, userId, uuid, orgId]
      );
    } else {
      await query(
        `INSERT INTO "NL2SQL_SAVED_DASHBOARDS" 
         ("DASHBOARD_UUID", "DASHBOARD_NAME", "ORG_ID", "USER_ID", "DASHBOARD_CONFIG") 
         VALUES ($1, $2, $3, $4, $5)`,
        [uuid, name, orgId, userId, dashboardConfig]
      );
    }
    
    return {
      success: true,
      message: 'Dashboard saved successfully with insights and data'
    };
    
  } catch (error: any) {
    console.error('Error saving dashboard:', error);
    throw new Error(error.message || 'Failed to save dashboard');
  }
};

/**
 * List dashboards
 */
export const listDashboards = async (): Promise<{
  success: boolean;
  dashboards: any[];
}> => {
  'use server';
  
  try {
    const { orgId } = await getUserContext();
    
    const dashboards = await query(
      `SELECT 
        "DASHBOARD_UUID" as uuid, 
        "DASHBOARD_NAME" as name, 
        "USER_ID" as user_id,
        "CREATED_AT" as created_at, 
        "UPDATED_AT" as updated_at 
       FROM "NL2SQL_SAVED_DASHBOARDS" 
       WHERE "ORG_ID" = $1 
       ORDER BY "UPDATED_AT" DESC`,
      [orgId]
    );
    
    return {
      success: true,
      dashboards: dashboards || []
    };
    
  } catch (error: any) {
    console.error('Error listing dashboards:', error);
    // throw new Error(error.message || 'Failed to list dashboards');
    return {
      success: false,
      dashboards: []
    };
  }
};

/**
 * Get dashboard
 */
export const getDashboard = async (
  dashboardUuid: string
): Promise<{
  success: boolean;
  name: string;
  config: DashboardConfig;
}> => {
  'use server';
  
  try {
    const { userId, orgId } = await getUserContext();
    
    const dashboardDetails = await query(
      `SELECT "DASHBOARD_NAME" as name, "DASHBOARD_CONFIG" as config 
       FROM "NL2SQL_SAVED_DASHBOARDS" 
       WHERE "DASHBOARD_UUID" = $1 AND "ORG_ID" = $2 AND "USER_ID" = $3`,
      [dashboardUuid, orgId, userId]
    );
    
    if (!dashboardDetails || dashboardDetails.length === 0) {
      throw new Error('Dashboard not found');
    }

    const dashboard = dashboardDetails[0];
    const dashboardConfig = dashboard.config;

    console.log(dashboardConfig.insights)
    
    
    return {
      success: true,
      name: dashboard.name,
      config: dashboardConfig
    };
    
  } catch (error: any) {
    console.error('Error getting dashboard:', error);
    throw new Error(error.message || 'Failed to load dashboard');
  }
};

/**
 * Delete dashboard
 */
export const deleteDashboard = async (
  dashboardUuid: string
): Promise<{ success: boolean; message: string }> => {
  'use server';
  
  try {
    const { orgId } = await getUserContext();
    
    await query(
      `DELETE FROM "NL2SQL_SAVED_DASHBOARDS" 
       WHERE "DASHBOARD_UUID" = $1 AND "ORG_ID" = $2`,
      [dashboardUuid, orgId]
    );
    
    return {
      success: true,
      message: 'Dashboard deleted successfully'
    };
    
  } catch (error: any) {
    console.error('Error deleting dashboard:', error);
    throw new Error(error.message || 'Failed to delete dashboard');
  }
};

/**
 * Explain chart query
 */
export const explainChartQuery = async (
  chartTitle: string,
  sqlQuery: string
): Promise<{ success: boolean; explanation: string }> => {
  'use server';
  
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        explanation: z.string(),
      }),
      system: `You are a SQL expert. Explain SQL queries in simple, business-friendly terms.`,
      prompt: `Explain this SQL query for chart "${chartTitle}": ${sqlQuery}`,
    });

    return {
      success: true,
      explanation: result.object.explanation
    };
  } catch (error) {
    console.error('Error explaining chart SQL:', error);
    return {
      success: false,
      explanation: 'Unable to generate explanation for this query.'
    };
  }
};

/**
 * Refresh chart data
 */
export const refreshChartData = async (
  sql: string
): Promise<{ success: boolean; data: any[] }> => {
  'use server';
  
  try {
    const { userId } = await getUserContext();
    const results = await runGenerateSQLQuery(sql, String(userId), userId);
    
    return {
      success: true,
      data: results || []
    };
    
  } catch (error: any) {
    console.error('Error refreshing chart data:', error);
    throw new Error(error.message || 'Failed to refresh chart data');
  }
};

/**
 * Enhance dashboard configuration
 */
