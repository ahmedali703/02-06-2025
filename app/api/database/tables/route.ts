// app/api/database/tables/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '../../../../lib/auth';
import { query } from '../../../../lib/db';

// GET handler for retrieving all tables for the user's organization
export const GET = async (req: NextRequest) => {
  try {
    console.log("Database Tables API called");
    
    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();  
    
    if (!userId) {
      console.log("Database Tables: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Database Tables: UserId found:", userId);
    
    // Use PostgreSQL connection
    let orgId: number | null = null;
    
    try {
      console.log("Database Tables: Using PostgreSQL connection");

      // Get organization ID for the user
      const userResult = await query(
        `SELECT "ORG_ID" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
        [userId]
      );
      
      if (userResult && userResult.length > 0) {
        orgId = userResult[0].ORG_ID;
        console.log("Database Tables: Found orgId:", orgId);
        
        if (!orgId) {
          return NextResponse.json({ 
            error: "No organization found",
            message: "You need to be part of an organization to access tables"
          }, { status: 404 });
        }
      } else {
        console.log("Database Tables: User not found or has no organization");
        return NextResponse.json({ 
          error: "No organization found",
          message: "You need to be part of an organization to access tables"
        }, { status: 404 });
      }

      // Fetch available tables for the organization
      const tablesResult = await query(
        `SELECT 
          "ID",
          "TABLE_NAME",
          "TABLE_DESCRIPTION",
          "IS_ACTIVE",
          TO_CHAR("CREATED_AT"::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "CREATED_AT",
          TO_CHAR("UPDATED_AT"::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "UPDATED_AT"
        FROM "NL2SQL_AVAILABLE_TABLES"
        WHERE "ORG_ID" = $1
        ORDER BY "TABLE_NAME"`,
        [orgId]
      );

      console.log(`Database Tables: Retrieved ${tablesResult?.length || 0} tables`);
      
      return NextResponse.json(tablesResult || [], { 
        status: 200,
        headers: { 'X-Organization-Id': orgId.toString() }
      });
    } catch (error) {
      console.error("Error in database tables query:", error);
      throw error;
    }
  } catch (error) {
    console.error("Database tables error:", error);
    
    return NextResponse.json(
      { error: "Failed to fetch tables", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};