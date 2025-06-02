import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Initialize empty data array as default response
    const emptyResponse = {
      data: [],
      period: 'week'
    };

    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', ...emptyResponse },
        { status: 401 }
      );
    }

    // Verify token
    const verifiedToken = verifyJWT(token);
    if (!verifiedToken) {
      return NextResponse.json(
        { error: 'Invalid token', ...emptyResponse },
        { status: 401 }
      );
    }

    // Get period from query params
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';
    emptyResponse.period = period;

    // Get user ID from token
    const userId = verifiedToken.userId;
    
    // Get user role and organization ID from database
    let userRole = '';
    let organizationId = null;
    
    try {
      const userResult = await query(
        'SELECT "ROLE", "ORG_ID" FROM "NL2SQL_USERS" WHERE "ID" = $1',
        [userId]
      );
      
      if (userResult && userResult.length > 0) {
        userRole = userResult[0].ROLE || '';
        organizationId = userResult[0].ORG_ID;
      } else {
        return NextResponse.json(
          { error: 'User not found', ...emptyResponse },
          { status: 404 }
        );
      }
    } catch (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data', ...emptyResponse },
        { status: 500 }
      );
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7); // Default to week
    }

    // Query to get table usage data - FIXED VERSION
    let tableUsageQuery;
    let queryParams = [];
    
    // Option 1: Simple approach - get all queries and process in JavaScript
    if (userRole.toUpperCase() === 'ADMIN') {
      tableUsageQuery = `
        SELECT 
          "ID",
          "SQL_GENERATED",
          "EXECUTION_TIME"
        FROM 
          "NL2SQL_QUERIES"
        WHERE 
          "EXECUTION_DATE" >= $1 
          AND "EXECUTION_DATE" <= $2
          AND "ORG_ID" = $3
          AND "SQL_GENERATED" IS NOT NULL
          AND "SQL_GENERATED" != ''
      `;
      queryParams = [startDate, now, organizationId];
    } else {
      tableUsageQuery = `
        SELECT 
          "ID",
          "SQL_GENERATED",
          "EXECUTION_TIME"
        FROM 
          "NL2SQL_QUERIES"
        WHERE 
          "EXECUTION_DATE" >= $1 
          AND "EXECUTION_DATE" <= $2
          AND "USER_ID" = $3
          AND "SQL_GENERATED" IS NOT NULL
          AND "SQL_GENERATED" != ''
      `;
      queryParams = [startDate, now, userId];
    }
    
    let tableUsageData: any[] = [];

    try {
      const queryResults = await query(tableUsageQuery, queryParams);
      
      // Process results in JavaScript to extract table names
      const tableStats = new Map<string, { count: number; totalTime: number }>();
      
      if (Array.isArray(queryResults)) {
        for (const row of queryResults) {
          const sql = row.SQL_GENERATED || '';
          const executionTime = parseFloat(row.EXECUTION_TIME) || 0;
          
          // Extract table names using regex - compatible approach
          // First ensure sql is a string
          const sqlString = String(sql || '');
          
          // Use exec() instead of matchAll() for better compatibility
          const regex = /(?:FROM|JOIN)\s+["']?([A-Za-z0-9_]+)["']?/gi;
          const foundTables = new Set<string>();
          
          let match;
          while ((match = regex.exec(sqlString)) !== null) {
            if (match[1]) {
              foundTables.add(match[1].toUpperCase());
            }
          }
          
          // Update statistics for each table
          // Convert Set to Array to avoid TypeScript compilation issues
          const tableArray = Array.from(foundTables);
          for (const tableName of tableArray) {
            const existing = tableStats.get(tableName) || { count: 0, totalTime: 0 };
            existing.count += 1;
            existing.totalTime += executionTime;
            tableStats.set(tableName, existing);
          }
        }
        
        // Convert to array format
        tableUsageData = Array.from(tableStats.entries())
          .map(([table, stats]) => ({
            table: table,
            queries: stats.count,
            avgTime: stats.count > 0 ? stats.totalTime / stats.count : 0
          }))
          .sort((a, b) => b.queries - a.queries)
          .slice(0,5); // Top 5 tables
      }
      
    } catch (queryError) {
      console.error('Database query error in /api/analytics/table-usage:', queryError);
      // tableUsageData remains an empty array
    }

    // Alternative Option 2: If you want to stick with SQL (PostgreSQL specific)
    // This uses a different approach with string manipulation
    /*
    if (userRole.toUpperCase() === 'ADMIN') {
      tableUsageQuery = `
        WITH query_data AS (
          SELECT 
            "ID",
            "SQL_GENERATED",
            "EXECUTION_TIME"
          FROM 
            "NL2SQL_QUERIES"
          WHERE 
            "EXECUTION_DATE" >= $1 
            AND "EXECUTION_DATE" <= $2
            AND "ORG_ID" = $3
            AND "SQL_GENERATED" IS NOT NULL
        ),
        table_refs AS (
          SELECT 
            "ID",
            "EXECUTION_TIME",
            unnest(
              string_to_array(
                regexp_replace(
                  regexp_replace(
                    upper("SQL_GENERATED"),
                    '.*(?:FROM|JOIN)\\s+([A-Za-z0-9_]+).*',
                    '\\1,',
                    'g'
                  ),
                  '[^A-Za-z0-9_,]',
                  '',
                  'g'
                ),
                ','
              )
            ) AS table_name
          FROM query_data
        )
        SELECT 
          table_name AS "table",
          COUNT(*) AS "queries",
          AVG("EXECUTION_TIME") AS "avgTime"
        FROM 
          table_refs
        WHERE 
          table_name != ''
          AND length(table_name) > 0
        GROUP BY 
          table_name
        ORDER BY 
          COUNT(*) DESC
        LIMIT 10
      `;
      queryParams = [startDate, now, organizationId];
    }
    */

    // Always return a valid response with an array
    return NextResponse.json({
      data: tableUsageData,
      period
    });
    
  } catch (error) {
    console.error('Error fetching table usage data:', error);
    // Return empty array on any error
    return NextResponse.json({
      error: 'Failed to fetch table usage data',
      data: [],
      period: 'week'
    }, { status: 500 });
  }
}