// app/api/database/tables/[tableId]/toggle-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '@/lib/auth';
import { query } from '@/lib/db';

// POST handler for toggling table active status
export async function POST(req: NextRequest) {
  try {
    // استخراج tableId من URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const tableIdIndex = pathSegments.findIndex(segment => segment === 'tables') + 1;
    const tableIdStr = pathSegments[tableIdIndex];
    
    console.log(`Toggle Table Status API called for table ID ${tableIdStr}`);
    
    const tableId = parseInt(tableIdStr, 10);
    
    if (isNaN(tableId)) {
      return NextResponse.json({ 
        error: "Invalid table ID",
        message: "The table ID must be a valid number"
      }, { status: 400 });
    }
    
    // Parse request body to get new status
    const { status } = await req.json();
    
    if (status !== 'Y' && status !== 'N') {
      return NextResponse.json({ 
        error: "Invalid status value",
        message: "Status must be either 'Y' or 'N'"
      }, { status: 400 });
    }
    
    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Toggle Table Status: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Toggle Table Status: UserId found:", userId);
    
    try {
      console.log("Toggle Table Status: Using PostgreSQL connection");

      // Verify user has access to this table (through organization) and is an admin or manager
      const accessCheckResult = await query(
        `SELECT t."ORG_ID", u."ROLE"
         FROM "NL2SQL_AVAILABLE_TABLES" t
         JOIN "NL2SQL_USERS" u ON t."ORG_ID" = u."ORG_ID"
         WHERE t."ID" = $1 AND u."ID" = $2`,
        [tableId, userId]
      );
      
      if (!accessCheckResult || accessCheckResult.length === 0) {
        console.log("Toggle Table Status: User does not have access to this table");
        return NextResponse.json({ 
          error: "Access denied",
          message: "You do not have access to this table"
        }, { status: 403 });
      }
      
      // Check if user has appropriate role (ADMIN or MANAGER)
      const userRole = accessCheckResult[0].ROLE;
      if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        console.log(`Toggle Table Status: User role ${userRole} does not have permission`);
        return NextResponse.json({ 
          error: "Permission denied",
          message: "You do not have permission to toggle table status"
        }, { status: 403 });
      }

      // Update the table status
      const updateResult = await query(
        `UPDATE "NL2SQL_AVAILABLE_TABLES"
         SET "IS_ACTIVE" = $1, "UPDATED_AT" = NOW()
         WHERE "ID" = $2
         RETURNING "ID"`,
        [status, tableId]
      );
      
      // Check if any rows were updated
      if (!updateResult || updateResult.length === 0) {
        console.log("Toggle Table Status: No rows updated");
        return NextResponse.json({ 
          error: "Update failed",
          message: "Failed to update table status"
        }, { status: 500 });
      }
      
      console.log(`Toggle Table Status: Successfully updated table ID ${tableId} status to ${status}`);
      
      return NextResponse.json({ 
        id: tableId,
        status: status,
        message: "Table status updated successfully"
      }, { status: 200 });
    } finally {
      // No need to close connection with PostgreSQL pool
      console.log("Toggle Table Status: Query completed");
    }
  } catch (error) {
    console.error("Toggle table status error:", error);
    
    return NextResponse.json(
      { error: "Failed to update table status", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}