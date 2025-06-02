// app/api/database/tables/[tableId]/columns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '@/lib/auth';
import { query } from '@/lib/db';

// GET handler for retrieving columns for a specific table
export async function GET(req: NextRequest) {
  try {
    // استخراج tableId من URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const tableIdIndex = pathSegments.findIndex(segment => segment === 'tables') + 1;
    const tableIdStr = pathSegments[tableIdIndex];
    
    console.log(`Table Columns API called for table ID ${tableIdStr}`);
    
    const tableId = parseInt(tableIdStr, 10);
    
    if (isNaN(tableId)) {
      return NextResponse.json({ 
        error: "Invalid table ID",
        message: "The table ID must be a valid number"
      }, { status: 400 });
    }
    
    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Table Columns: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Table Columns: UserId found:", userId);
    
    // Use PostgreSQL connection
    try {
      console.log("Table Columns: Using PostgreSQL connection");

      // Verify user has access to this table (through organization)
      const accessCheckResult = await query(
        `SELECT t."ORG_ID"
         FROM "NL2SQL_AVAILABLE_TABLES" t
         JOIN "NL2SQL_USERS" u ON t."ORG_ID" = u."ORG_ID"
         WHERE t."ID" = $1 AND u."ID" = $2`,
        [tableId, userId]
      );
      
      if (!accessCheckResult || accessCheckResult.length === 0) {
        console.log("Table Columns: User does not have access to this table");
        return NextResponse.json({ 
          error: "Access denied",
          message: "You do not have access to this table"
        }, { status: 403 });
      }

      // Fetch columns for the table
      const columnsResult = await query(
        `SELECT 
          "ID",
          "TABLE_ID",
          "COLUMN_NAME",
          "COLUMN_TYPE",
          "COLUMN_DESCRIPTION",
          "IS_SEARCHABLE",
          TO_CHAR("CREATED_AT"::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "CREATED_AT"
        FROM "NL2SQL_TABLE_COLUMNS"
        WHERE "TABLE_ID" = $1
        ORDER BY "ID"`,
        [tableId]
      );

      console.log(`Table Columns: Retrieved ${columnsResult?.length || 0} columns for table ID ${tableId}`);
      
      return NextResponse.json(columnsResult || [], { status: 200 });
    } catch (error) {
      console.error("Error in table columns query:", error);
      throw error;
    }
  } catch (error) {
    console.error("Table columns error:", error);
    
    return NextResponse.json(
      { error: "Failed to fetch table columns", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}