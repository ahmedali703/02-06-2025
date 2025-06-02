//app/api/aiquery/rerun/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '@/lib/auth';
import { sanitizeForJSON } from '@/lib/utils';
import { query } from '@/lib/db';

/**
 * Endpoint to handle re-running of previously executed queries
 * Accepts a queryId parameter to retrieve the original query and SQL
 * Returns data needed to re-execute the query in the frontend
 */
export async function POST(req: NextRequest) {
  try {
    console.log("Re-run query API called");
    
    // Get user ID
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Re-run Query: No userId found");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { queryId, sqlQuery, originalQuestion } = body;
    
    if (!queryId) {
      return NextResponse.json({ 
        error: "Query ID is required"
      }, { status: 400 });
    }
    
    let orgId: number | null = null;
    
    try {
      console.log("Re-run Query: Using PostgreSQL connection");
      
      // Get organization ID for the user
      const userResult = await query(
        `SELECT "ORG_ID" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
        [userId]
      );
      
      if (userResult && userResult.length > 0) {
        orgId = userResult[0].ORG_ID;
        console.log("Re-run Query: Found orgId:", orgId);
      } else {
        return NextResponse.json({ 
          error: "User not found or has no organization"
        }, { status: 404 });
      }
      
      // Get the query details if not provided
      let queryDetails;
      
      if (!sqlQuery || !originalQuestion) {
        const queryResult = await query(
          `SELECT 
            q."ID",
            q."QUERY_TEXT",
            q."SQL_GENERATED",
            q."EXECUTION_STATUS"
          FROM "NL2SQL_QUERIES" q
          WHERE q."ID" = $1
          AND q."ORG_ID" = $2`,
          [queryId, orgId]
        );
        
        if (!queryResult || queryResult.length === 0) {
          return NextResponse.json({ 
            error: "Query not found"
          }, { status: 404 });
        }
        
        queryDetails = sanitizeForJSON(queryResult[0]);
      } else {
        queryDetails = {
          ID: queryId,
          QUERY_TEXT: originalQuestion,
          SQL_GENERATED: sqlQuery,
          EXECUTION_STATUS: "SUCCESS" // Assume successful for direct rerun
        };
      }
      
      // Insert a log entry for this rerun action
      await query(
        `INSERT INTO "NL2SQL_USER_ACTIVITY" (
          "USER_ID", "ORG_ID", "ACTIVITY_TYPE", "ACTIVITY_DETAILS", "ACTIVITY_DATE"
        ) VALUES (
          $1, $2, 'RERUN_QUERY', 'Rerun query ID: ' || $3, CURRENT_TIMESTAMP
        )`,
        [userId, orgId, queryId]
      );
      
      // Return the query information needed for re-execution
      return NextResponse.json({
        success: true,
        message: "Query ready for re-execution",
        query: {
          id: queryDetails.ID,
          text: queryDetails.QUERY_TEXT,
          sql: queryDetails.SQL_GENERATED
        }
      }, { status: 200 });
      
    } finally {
      // No need to close connection with PostgreSQL pool
      console.log("Re-run Query: Query completed");
    }
  } catch (error) {
    console.error("Re-run query API error:", error);
    
    return NextResponse.json({ 
      error: "Failed to prepare query for re-execution",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}