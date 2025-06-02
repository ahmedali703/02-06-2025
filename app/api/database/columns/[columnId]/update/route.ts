// app/api/database/columns/[columnId]/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '@/lib/auth';
import { query } from '@/lib/db';

// POST handler for updating column details
export async function POST(req: NextRequest) {
  try {
    // استخراج columnId من URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const columnIdIndex = pathSegments.findIndex(segment => segment === 'columns') + 1;
    const columnIdStr = pathSegments[columnIdIndex];
    
    console.log(`Update Column API called for column ID ${columnIdStr}`);
    
    const columnId = parseInt(columnIdStr, 10);
    
    if (isNaN(columnId)) {
      return NextResponse.json({ 
        error: "Invalid column ID",
        message: "The column ID must be a valid number"
      }, { status: 400 });
    }
    
    // Parse request body to get column updates
    const updateData = await req.json();
    
    // Validate input
    if (!updateData || Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        error: "Missing update data",
        message: "No fields provided for update"
      }, { status: 400 });
    }
    
    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Update Column: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Update Column: UserId found:", userId);
    
    try {
      console.log("Update Column: Using PostgreSQL connection");

      // First, get the table ID from the column to check user's permissions
      const columnResult = await query(
        `SELECT "TABLE_ID", "COLUMN_NAME" FROM "NL2SQL_TABLE_COLUMNS" WHERE "ID" = $1`,
        [columnId]
      );
      
      if (!columnResult || columnResult.length === 0) {
        console.log("Update Column: Column not found");
        return NextResponse.json({ 
          error: "Column not found",
          message: "The specified column does not exist"
        }, { status: 404 });
      }
      
      const tableId = columnResult[0].TABLE_ID;
      const currentColumnName = columnResult[0].COLUMN_NAME;

      // Verify user has access to this table (through organization) and is an admin or manager
      const accessCheckResult = await query(
        `SELECT t."ORG_ID", u."ROLE"
         FROM "NL2SQL_AVAILABLE_TABLES" t
         JOIN "NL2SQL_USERS" u ON t."ORG_ID" = u."ORG_ID"
         WHERE t."ID" = $1 AND u."ID" = $2`,
        [tableId, userId]
      );
      
      if (!accessCheckResult || accessCheckResult.length === 0) {
        console.log("Update Column: User does not have access to this table");
        return NextResponse.json({ 
          error: "Access denied",
          message: "You do not have access to this column"
        }, { status: 403 });
      }
      
      // Check if user has appropriate role (ADMIN or MANAGER)
      const userRole = accessCheckResult[0].ROLE;
      if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        console.log(`Update Column: User role ${userRole} does not have permission`);
        return NextResponse.json({ 
          error: "Permission denied",
          message: "You do not have permission to update column details"
        }, { status: 403 });
      }

      // Build the SQL query dynamically based on what's being updated
      let setClauses: string[] = [];
      let values: any[] = [];
      let paramIndex = 1;
      
      // Allow updating only certain fields
      const allowedFields = ['COLUMN_NAME', 'COLUMN_DESCRIPTION', 'IS_SEARCHABLE'];
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          setClauses.push(`"${field}" = $${paramIndex}`);
          values.push(updateData[field]);
          paramIndex++;
        }
      });
      
      if (setClauses.length === 0) {
        return NextResponse.json({ 
          error: "No valid fields to update",
          message: "None of the provided fields are allowed to be updated"
        }, { status: 400 });
      }
      
      // Add columnId as the last parameter
      values.push(columnId);
      
      // Execute the update
      const updateQuery = `
        UPDATE "NL2SQL_TABLE_COLUMNS"
        SET ${setClauses.join(', ')}
        WHERE "ID" = $${paramIndex}
        RETURNING "ID", "COLUMN_NAME"
      `;
      
      const updateResult = await query(updateQuery, values);
      
      // Check if any rows were updated
      if (!updateResult || updateResult.length === 0) {
        console.log("Update Column: No rows updated");
        return NextResponse.json({ 
          error: "Update failed",
          message: "Failed to update column details"
        }, { status: 500 });
      }
      
      const updatedId = updateResult[0].ID;
      const updatedName = updateResult[0].COLUMN_NAME;
      
      console.log(`Update Column: Successfully updated column ID ${columnId} (${currentColumnName} -> ${updatedName})`);
      
      // Get updated column data
      const updatedColumnResult = await query(
        `SELECT 
          "ID",
          "TABLE_ID",
          "COLUMN_NAME",
          "COLUMN_TYPE",
          "COLUMN_DESCRIPTION",
          "IS_SEARCHABLE",
          TO_CHAR("CREATED_AT", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "CREATED_AT"
        FROM "NL2SQL_TABLE_COLUMNS"
        WHERE "ID" = $1`,
        [columnId]
      );
      
      const columnData = updatedColumnResult && updatedColumnResult.length > 0 ? updatedColumnResult[0] : { 
        ID: columnId,
        COLUMN_NAME: updatedName || currentColumnName
      };
      
      return NextResponse.json({
        message: "Column updated successfully",
        ...columnData
      }, { status: 200 });
    } finally {
      // No need to close connection with PostgreSQL pool
      console.log("Update Column: Query completed");
    }
  } catch (error) {
    console.error("Update column error:", error);
    
    return NextResponse.json(
      { error: "Failed to update column details", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}