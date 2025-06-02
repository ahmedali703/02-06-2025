// app/api/database/columns/[columnId]/toggle-searchable/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '@/lib/auth';
import { query } from '@/lib/db';

// In Next.js 15, we use this style of route handler
export async function POST(
  request: NextRequest,
) {
  try {
    // Get the columnId from the URL using searchParams
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const columnIdIndex = pathSegments.findIndex(segment => segment === 'columns') + 1;
    const columnIdStr = pathSegments[columnIdIndex];
    
    console.log(`Toggle Column Searchable API called for column ID ${columnIdStr}`);
    
    const columnId = parseInt(columnIdStr, 10);
    
    if (isNaN(columnId)) {
      return NextResponse.json({ 
        error: "Invalid column ID",
        message: "The column ID must be a valid number"
      }, { status: 400 });
    }
    
    // Parse request body to get new status
    const { status } = await request.json();
    
    if (status !== 'Y' && status !== 'N') {
      return NextResponse.json({ 
        error: "Invalid status value",
        message: "Status must be either 'Y' or 'N'"
      }, { status: 400 });
    }
    
    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Toggle Column Searchable: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Toggle Column Searchable: UserId found:", userId);
    
    try {
      console.log("Toggle Column Searchable: Using PostgreSQL connection");

      // First, get the table ID from the column
      const columnResult = await query(
        `SELECT "TABLE_ID" FROM "NL2SQL_TABLE_COLUMNS" WHERE "ID" = $1`,
        [columnId]
      );
      
      if (!columnResult || columnResult.length === 0) {
        console.log("Toggle Column Searchable: Column not found");
        return NextResponse.json({ 
          error: "Column not found",
          message: "The specified column does not exist"
        }, { status: 404 });
      }
      
      const tableId = columnResult[0].TABLE_ID;

      // Verify user has access to this table (through organization) and is an admin or manager
      const accessCheckResult = await query(
        `SELECT t."ORG_ID", u."ROLE"
         FROM "NL2SQL_AVAILABLE_TABLES" t
         JOIN "NL2SQL_USERS" u ON t."ORG_ID" = u."ORG_ID"
         WHERE t."ID" = $1 AND u."ID" = $2`,
        [tableId, userId]
      );
      
      if (!accessCheckResult || accessCheckResult.length === 0) {
        console.log("Toggle Column Searchable: User does not have access to this table");
        return NextResponse.json({ 
          error: "Access denied",
          message: "You do not have access to this column"
        }, { status: 403 });
      }
      
      // Check if user has appropriate role (ADMIN or MANAGER)
      const userRole = accessCheckResult[0].ROLE;
      if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        console.log(`Toggle Column Searchable: User role ${userRole} does not have permission`);
        return NextResponse.json({ 
          error: "Permission denied",
          message: "You do not have permission to toggle column searchable status"
        }, { status: 403 });
      }

      // Update the column searchable status
      const updateResult = await query(
        `UPDATE "NL2SQL_TABLE_COLUMNS"
         SET "IS_SEARCHABLE" = $1
         WHERE "ID" = $2
         RETURNING "ID", "COLUMN_NAME"`,
        [status, columnId]
      );
      
      // Check if any rows were updated
      if (!updateResult || updateResult.length === 0) {
        console.log("Toggle Column Searchable: No rows updated");
        return NextResponse.json({ 
          error: "Update failed",
          message: "Failed to update column searchable status"
        }, { status: 500 });
      }
      
      const updatedId = updateResult[0].ID;
      const columnName = updateResult[0].COLUMN_NAME;
      
      console.log(`Toggle Column Searchable: Successfully updated column ID ${columnId} (${columnName}) searchable status to ${status}`);
      
      return NextResponse.json({ 
        id: columnId,
        tableId: tableId,
        name: columnName,
        status: status,
        message: "Column searchable status updated successfully"
      }, { status: 200 });
    } finally {
      // No need to close connection with PostgreSQL pool
      console.log("Toggle Column Searchable: Query completed");
    }
  } catch (error) {
    console.error("Toggle column searchable error:", error);
    
    return NextResponse.json(
      { error: "Failed to update column searchable status", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};