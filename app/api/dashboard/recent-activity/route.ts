//app/api/dashboard/recent-activity/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '../../../../lib/auth';
import { query } from '../../../../lib/db';

const ITEMS_PER_PAGE = 5;

// Interface for the activity record returned from the database
interface ActivityRecord {
  ID: number;
  QUERY_TEXT: string | null;
  SQL_GENERATED: string | null;
  EXECUTION_STATUS: string;
  EXECUTION_TIME: number | null;
  ROWS_RETURNED: number | null;
  EXECUTION_DATE: string;
  USER_ID: number;
  USER_EMAIL: string | null;
  USER_NAME?: string;
}

// Helper function to ensure string data (no longer needed for LOB handling with PostgreSQL)
function ensureString(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

export const GET = async (req: NextRequest) => {
  try {
    console.log("Recent Activity API called");
    
    // Get URL params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const filter = url.searchParams.get('filter') || 'all';
    const search = url.searchParams.get('search') || '';
    
    // Parse user ID from cookies
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Recent Activity: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Recent Activity: UserId found:", userId);
    console.log("Recent Activity: Filter:", filter);
    console.log("Recent Activity: Search Term:", search);
    console.log("Recent Activity: Page:", page);
    
    // Use PostgreSQL for database queries
    let orgId: number | null = null;
    
    try {
      console.log("Recent Activity: Using PostgreSQL connection");

      // Get organization ID for the user
      const userResult = await query(
        `SELECT "ORG_ID" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
        [userId]
      );
      
      if (userResult && userResult.length > 0) {
        orgId = userResult[0].ORG_ID;
        console.log("Recent Activity: Found orgId:", orgId);
        
        if (!orgId) {
          return NextResponse.json({ 
            activities: [],
            totalPages: 0,
            currentPage: 1,
            message: "No organization found for user",
            filter,
            search
          }, { status: 200 });
        }
      } else {
        return NextResponse.json({ 
          activities: [],
          totalPages: 0,
          currentPage: 1,
          message: "User not found",
          filter,
          search
        }, { status: 200 });
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
          q."EXECUTION_DATE",
          u."ID" AS "USER_ID",
          u."EMAIL" AS "USER_EMAIL",
          u."NAME" AS "USER_NAME"
        FROM "NL2SQL_QUERIES" q
        JOIN "NL2SQL_USERS" u ON q."USER_ID" = u."ID"
        WHERE q."ORG_ID" = $1
      `;
      
      // Initialize params array with orgId as first parameter
      const params: any[] = [orgId];
      let paramIndex = 2; // Start with $2 since $1 is already used for orgId
      
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
          UPPER(u."NAME") LIKE UPPER($${paramIndex})
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      // Count total records for pagination
      const countQuery = `
        SELECT COUNT(*) AS "TOTAL"
        FROM (${baseQuery}) AS count_query
      `;
      
      const countResult = await query(
        countQuery,
        params
      );
      
      const totalCount = parseInt(countResult[0]?.TOTAL || '0');
      const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
      
      console.log("Recent Activity: Total count:", totalCount);
      console.log("Recent Activity: Total pages:", totalPages);
      
      // Add pagination to the query
      const offset = (page - 1) * ITEMS_PER_PAGE;
      
      // PostgreSQL pagination using LIMIT and OFFSET
      const finalQuery = `
        ${baseQuery}
        ORDER BY q."EXECUTION_DATE" DESC
        LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
      `;
      
      // Execute the query
      const result = await query(
        finalQuery,
        params
      );
      
      // Process the results - PostgreSQL already returns proper data types
      const activities = result || [];
      
      // Process each activity to ensure string fields are properly formatted
      const processedActivities = activities.map((activity: any) => {
        // Create a new processed activity object
        const processedActivity: any = { ...activity };
        
        // Ensure text fields are strings
        processedActivity.QUERY_TEXT = ensureString(activity.QUERY_TEXT);
        processedActivity.SQL_GENERATED = ensureString(activity.SQL_GENERATED);
        
        return processedActivity;
      });
      
      // Return the results
      console.log("Recent Activity: Retrieved", processedActivities.length, "records");
      
      return NextResponse.json({
        activities: processedActivities,
        totalPages,
        currentPage: page,
        totalCount,
        filter,
        search
      }, { status: 200 });
      
    } finally {
      // PostgreSQL connections are handled by the query function
      console.log("Recent Activity: Request completed");
    }
  } catch (error) {
    console.error("Recent Activity API error:", error);
    
    // Return empty result in case of error
    return NextResponse.json({ 
      error: "Failed to retrieve recent activity",
      activities: [],
      totalPages: 0,
      currentPage: 1
    }, { status: 500 });
  }
};