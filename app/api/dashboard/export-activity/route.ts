import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '@/lib/auth';
import { safelyConvertRowsToObjects } from '@/lib/utils';
import { query } from '@/lib/db';

/**
 * Endpoint to export activity data to CSV
 * Supports filtering by status, date range, and search term
 * Returns a CSV file for download
 */
export async function GET(req: NextRequest) {
  try {
    console.log("Export activity API called");
    
    // Get URL params
    const url = new URL(req.url);
    const filter = url.searchParams.get('filter') || 'all';
    const search = url.searchParams.get('search') || '';
    const dateRange = url.searchParams.get('dateRange') || '';
    const startDate = url.searchParams.get('startDate') || '';
    const endDate = url.searchParams.get('endDate') || '';
    
    // Get user ID
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Export Activity: No userId found");
      return new NextResponse("Authentication required", { status: 401 });
    }

    let orgId: number | null = null;
    
    try {
      console.log("Export Activity: Using PostgreSQL connection");
      
      // Get organization ID for the user
      const userResult = await query(
        `SELECT "ORG_ID" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
        [userId]
      );
      
      if (userResult && userResult.length > 0) {
        orgId = userResult[0].ORG_ID;
        console.log("Export Activity: Found orgId:", orgId);
        
        if (!orgId) {
          return new NextResponse("No organization found for user", { status: 404 });
        }
      } else {
        return new NextResponse("User not found", { status: 404 });
      }
      
      // Build the query based on filters
      let baseQuery = `
        SELECT 
          q."ID",
          q."QUERY_TEXT",
          q."SQL_GENERATED",
          q."EXECUTION_STATUS",
          q."EXECUTION_TIME",
          q."ROWS_RETURNED",
          TO_CHAR(q."EXECUTION_DATE", 'YYYY-MM-DD HH24:MI:SS') AS "EXECUTION_DATE",
          u."NAME" AS "USER_NAME",
          u."EMAIL" AS "USER_EMAIL"
        FROM "NL2SQL_QUERIES" q
        JOIN "NL2SQL_USERS" u ON q."USER_ID" = u."ID"
        WHERE q."ORG_ID" = $1
      `;
      
      // Apply filters
      const params: any[] = [orgId];
      let paramIndex = 2;
      
      if (filter === 'success') {
        baseQuery += ` AND q."EXECUTION_STATUS" = 'SUCCESS'`;
      } else if (filter === 'failed') {
        baseQuery += ` AND q."EXECUTION_STATUS" != 'SUCCESS'`;
      } else if (filter === 'long-running') {
        baseQuery += ` AND q."EXECUTION_TIME" > 1000`;
      }
      
      // Apply search
      if (search) {
        baseQuery += ` AND (
          UPPER(q."QUERY_TEXT") LIKE UPPER($${paramIndex})
          OR UPPER(q."SQL_GENERATED") LIKE UPPER($${paramIndex})
          OR UPPER(u."NAME") LIKE UPPER($${paramIndex})
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      // Apply date range
      if (dateRange) {
        switch (dateRange) {
          case 'today':
            baseQuery += ` AND DATE_TRUNC('day', q."EXECUTION_DATE") = DATE_TRUNC('day', CURRENT_DATE)`;
            break;
          case 'yesterday':
            baseQuery += ` AND DATE_TRUNC('day', q."EXECUTION_DATE") = DATE_TRUNC('day', CURRENT_DATE - INTERVAL '1 day')`;
            break;
          case 'thisWeek':
            baseQuery += ` AND DATE_TRUNC('day', q."EXECUTION_DATE") >= DATE_TRUNC('week', CURRENT_DATE)`;
            break;
          case 'lastWeek':
            baseQuery += ` AND DATE_TRUNC('day', q."EXECUTION_DATE") BETWEEN DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week') AND DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 day'`;
            break;
          case 'thisMonth':
            baseQuery += ` AND DATE_TRUNC('month', q."EXECUTION_DATE") = DATE_TRUNC('month', CURRENT_DATE)`;
            break;
          case 'lastMonth':
            baseQuery += ` AND DATE_TRUNC('month', q."EXECUTION_DATE") = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')`;
            break;
        }
      }
      
      // Apply custom date range
      if (startDate && endDate) {
        baseQuery += ` AND DATE_TRUNC('day', q."EXECUTION_DATE") BETWEEN TO_DATE($${paramIndex}, 'YYYY-MM-DD') AND TO_DATE($${paramIndex+1}, 'YYYY-MM-DD')`;
        params.push(startDate);
        params.push(endDate);
        paramIndex += 2;
      }
      
      // Add order by
      baseQuery += ` ORDER BY q."EXECUTION_DATE" DESC`;
      
      // Execute query
      const result = await query(baseQuery, params);
      
      // Process results
      const activities = safelyConvertRowsToObjects(result);
      
      // Convert to CSV
      const csvHeader = [
        'ID',
        'Query',
        'SQL Generated',
        'Status',
        'Execution Time (ms)',
        'Rows Returned',
        'Execution Date',
        'User Name',
        'User Email'
      ].join(',');
      
      // Process rows with proper CSV escaping
      const csvRows = activities.map(activity => {
        // Function to escape CSV fields
        const escapeCSV = (field: any) => {
          if (field === null || field === undefined) return '';
          const str = String(field);
          // If field contains comma, newline or double quote, wrap in quotes and escape quotes
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        
        return [
          escapeCSV(activity.ID),
          escapeCSV(activity.QUERY_TEXT),
          escapeCSV(activity.SQL_GENERATED),
          escapeCSV(activity.EXECUTION_STATUS),
          escapeCSV(activity.EXECUTION_TIME),
          escapeCSV(activity.ROWS_RETURNED),
          escapeCSV(activity.EXECUTION_DATE),
          escapeCSV(activity.USER_NAME),
          escapeCSV(activity.USER_EMAIL)
        ].join(',');
      });
      
      // Combine header and rows
      const csvContent = [csvHeader, ...csvRows].join('\n');
      
      // Log activity
      await query(
        `INSERT INTO "NL2SQL_USER_ACTIVITY" (
          "USER_ID", "ORG_ID", "ACTIVITY_TYPE", "ACTIVITY_DETAILS", "ACTIVITY_DATE"
        ) VALUES (
          $1, $2, 'EXPORT_ACTIVITY', 'Exported activity data to CSV', CURRENT_TIMESTAMP
        )`,
        [userId, orgId]
      );
      
      // Create response with CSV content
      const response = new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="query-activity-${new Date().toISOString().slice(0, 10)}.csv"`
        }
      });
      
      return response;
    } finally {
      // No need to close connection with PostgreSQL pool
      console.log("Export Activity: Query completed");
    }
  } catch (error) {
    console.error("Export activity API error:", error);
    return new NextResponse("Failed to export activity data", { status: 500 });
  }
}