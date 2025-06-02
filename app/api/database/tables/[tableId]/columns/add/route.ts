// app/api/database/tables/[tableId]/columns/add/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '@/lib/auth';
import { query } from '@/lib/db';

// POST handler for adding a new column to a table
export async function POST(req: NextRequest) {
  try {
    // استخراج tableId من URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const tableIdIndex = pathSegments.findIndex(segment => segment === 'tables') + 1;
    const tableIdStr = pathSegments[tableIdIndex];
    
    console.log(`Add Column API called for table ID ${tableIdStr}`);
    
    const tableId = parseInt(tableIdStr, 10);
    
    if (isNaN(tableId)) {
      return NextResponse.json({ 
        error: "Invalid table ID",
        message: "The table ID must be a valid number"
      }, { status: 400 });
    }
    
    // Parse request body to get column data
    const columnData = await req.json();
    
    // Validate input
    if (!columnData || !columnData.COLUMN_NAME || !columnData.COLUMN_TYPE) {
      return NextResponse.json({ 
        error: "Missing required fields",
        message: "Column name and type are required"
      }, { status: 400 });
    }
    
    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Add Column: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Add Column: UserId found:", userId);
    
    try {
      console.log("Add Column: Using PostgreSQL connection");

      // Verify user has access to this table (through organization) and is an admin or manager
      const accessCheckResult = await query(
        `SELECT t."ORG_ID", t."TABLE_NAME", u."ROLE"
         FROM "NL2SQL_AVAILABLE_TABLES" t
         JOIN "NL2SQL_USERS" u ON t."ORG_ID" = u."ORG_ID"
         WHERE t."ID" = $1 AND u."ID" = $2`,
        [tableId, userId]
      );
      
      if (!accessCheckResult || accessCheckResult.length === 0) {
        console.log("Add Column: User does not have access to this table");
        return NextResponse.json({ 
          error: "Access denied",
          message: "You do not have access to this table"
        }, { status: 403 });
      }
      
      // Check if user has appropriate role (ADMIN or MANAGER)
      const userRole = accessCheckResult[0].ROLE;
      if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        console.log(`Add Column: User role ${userRole} does not have permission`);
        return NextResponse.json({ 
          error: "Permission denied",
          message: "You do not have permission to add columns to this table"
        }, { status: 403 });
      }
      
      const tableName = accessCheckResult[0].TABLE_NAME;

      // Check if column name already exists in this table
      const checkResult = await query(
        `SELECT COUNT(*) AS "COUNT"
         FROM "NL2SQL_TABLE_COLUMNS"
         WHERE "TABLE_ID" = $1 AND UPPER("COLUMN_NAME") = UPPER($2)`,
        [tableId, columnData.COLUMN_NAME]
      );
      
      if (checkResult && parseInt(checkResult[0].COUNT) > 0) {
        console.log(`Add Column: Column name '${columnData.COLUMN_NAME}' already exists in table ${tableName}`);
        return NextResponse.json({ 
          error: "Duplicate column name",
          message: `Column '${columnData.COLUMN_NAME}' already exists in this table`
        }, { status: 400 });
      }

      // Insert the new column
      const insertResult = await query(
        `INSERT INTO "NL2SQL_TABLE_COLUMNS" (
          "TABLE_ID",
          "COLUMN_NAME",
          "COLUMN_TYPE",
          "COLUMN_DESCRIPTION",
          "IS_SEARCHABLE",
          "CREATED_AT"
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NOW()
        ) RETURNING "ID"`,
        [ 
          tableId,
          columnData.COLUMN_NAME,
          columnData.COLUMN_TYPE,
          columnData.COLUMN_DESCRIPTION || null,
          columnData.IS_SEARCHABLE || 'Y'
        ]
      );
      
      // Get the ID of the inserted column
      const newColumnId = insertResult && insertResult.length > 0 ? insertResult[0].ID : null;
      
      if (!newColumnId) {
        console.log("Add Column: Failed to insert column");
        return NextResponse.json({ 
          error: "Insert failed",
          message: "Failed to add new column"
        }, { status: 500 });
      }
      
      console.log(`Add Column: Successfully added column '${columnData.COLUMN_NAME}' to table ${tableName}`);
      
      // Get the complete column data
      const columnResult = await query(
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
        [newColumnId]
      );
      
      const newColumn = columnResult && columnResult.length > 0 ? columnResult[0] : {
        ID: newColumnId,
        TABLE_ID: tableId,
        COLUMN_NAME: columnData.COLUMN_NAME,
        COLUMN_TYPE: columnData.COLUMN_TYPE,
        COLUMN_DESCRIPTION: columnData.COLUMN_DESCRIPTION || null,
        IS_SEARCHABLE: columnData.IS_SEARCHABLE || 'Y',
        CREATED_AT: new Date().toISOString()
      };
      
      return NextResponse.json(newColumn, { status: 201 });
    } finally {
      // No need to close connection with PostgreSQL pool
      console.log("Add Column: Query completed");
    }
  } catch (error) {
    console.error("Add column error:", error);
    
    return NextResponse.json(
      { error: "Failed to add column", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}