// app/api/database/tables/[tableId]/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '@/lib/auth';
import { query } from '@/lib/db';

// POST handler for updating table details
export async function POST(req: NextRequest) {
  try {
    // استخراج tableId من URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const tableIdIndex = pathSegments.findIndex(segment => segment === 'tables') + 1;
    const tableIdStr = pathSegments[tableIdIndex];
    
    console.log(`Update Table API called for table ID ${tableIdStr}`);
    
    const tableId = parseInt(tableIdStr, 10);
    
    if (isNaN(tableId)) {
      return NextResponse.json({ 
        error: "Invalid table ID",
        message: "The table ID must be a valid number"
      }, { status: 400 });
    }
    
    // Parse request body to get table updates
    const updateData = await req.json();
    
    // Validate input
    if (!updateData || ((!updateData.TABLE_NAME || updateData.TABLE_NAME.trim() === '') && 
                       (!updateData.TABLE_DESCRIPTION && updateData.TABLE_DESCRIPTION !== ''))) {
      return NextResponse.json({ 
        error: "Missing required fields",
        message: "Table name or description is required"
      }, { status: 400 });
    }
    
    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Update Table: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Update Table: UserId found:", userId);
    
    try {
      console.log("Update Table: Using PostgreSQL connection");

      // Verify user has access to this table (through organization) and is an admin or manager
      const accessCheckResult = await query(
        `SELECT t."ORG_ID", u."ROLE"
         FROM "NL2SQL_AVAILABLE_TABLES" t
         JOIN "NL2SQL_USERS" u ON t."ORG_ID" = u."ORG_ID"
         WHERE t."ID" = $1 AND u."ID" = $2`,
        [tableId, userId]
      );
      
      if (!accessCheckResult || accessCheckResult.length === 0) {
        console.log("Update Table: User does not have access to this table");
        return NextResponse.json({ 
          error: "Access denied",
          message: "You do not have access to this table"
        }, { status: 403 });
      }
      
      // Check if user has appropriate role (ADMIN or MANAGER)
      const userRole = accessCheckResult[0].ROLE;
      if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        console.log(`Update Table: User role ${userRole} does not have permission`);
        return NextResponse.json({ 
          error: "Permission denied",
          message: "You do not have permission to update table details"
        }, { status: 403 });
      }

      // Build the SQL query dynamically based on what's being updated
      let setClauses = [];
      let values = []; 
      let paramIndex = 1;
      
      if (updateData.TABLE_NAME !== undefined) {
        setClauses.push(`"TABLE_NAME" = $${paramIndex}`);
        values.push(updateData.TABLE_NAME);
        paramIndex++;
      }
      
      if (updateData.TABLE_DESCRIPTION !== undefined) {
        setClauses.push(`"TABLE_DESCRIPTION" = $${paramIndex}`);
        values.push(updateData.TABLE_DESCRIPTION);
        paramIndex++;
      }
      
      // Always update the UPDATED_AT field
      setClauses.push(`"UPDATED_AT" = NOW()`);
      
      // Add tableId as the last parameter
      values.push(tableId);
      
      // Execute the update
      const updateQuery = `
        UPDATE "NL2SQL_AVAILABLE_TABLES"
        SET ${setClauses.join(', ')}
        WHERE "ID" = $${paramIndex}
        RETURNING "ID"
      `;
      
      const updateResult = await query(updateQuery, values);
      
      // Check if any rows were updated
      if (!updateResult || updateResult.length === 0) {
        console.log("Update Table: No rows updated");
        return NextResponse.json({ 
          error: "Update failed",
          message: "Failed to update table"
        }, { status: 500 });
      }
      
      console.log(`Update Table: Successfully updated table ID ${tableId}`);
      
      // Get updated table data
      const tableResult = await query(
        `SELECT 
          "ID",
          "ORG_ID",
          "TABLE_NAME",
          "TABLE_DESCRIPTION",
          "IS_ACTIVE",
          TO_CHAR("CREATED_AT", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "CREATED_AT",
          TO_CHAR("UPDATED_AT", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "UPDATED_AT"
        FROM "NL2SQL_AVAILABLE_TABLES"
        WHERE "ID" = $1`,
        [tableId]
      );
      
      const tableData = tableResult && tableResult.length > 0 ? tableResult[0] : { ID: tableId };
      
      return NextResponse.json({
        message: "Table updated successfully",
        ...tableData
      }, { status: 200 });
    } finally {
      // No need to close connection with PostgreSQL pool
      console.log("Update Table: Query completed");
    }
  } catch (error) {
    console.error("Update table error:", error);
    
    return NextResponse.json(
      { error: "Failed to update table", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}