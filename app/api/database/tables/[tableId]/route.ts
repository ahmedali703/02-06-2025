// app/api/database/tables/[tableId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // استخراج tableId من URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const tableIdIndex = pathSegments.findIndex(segment => segment === 'tables') + 1;
    const tableIdStr = pathSegments[tableIdIndex];
    
    const tableId = parseInt(tableIdStr, 10);
    if (isNaN(tableId)) {
      return NextResponse.json({ 
        error: "Invalid table ID", 
        message: "The table ID must be a valid number" 
      }, { status: 400 });
    }
    
    // استخراج userId للتأكد من صلاحيات المستخدم
    const userId = await extractUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ 
        error: "Authentication required", 
        message: "Please login to access this resource" 
      }, { status: 401 });
    }
    
    // استعلام لجلب بيانات الجدول المطلوب باستخدام PostgreSQL
    const result = await query(
      `SELECT 
          "ID",
          "ORG_ID",
          "TABLE_NAME",
          "TABLE_DESCRIPTION",
          "IS_ACTIVE",
          TO_CHAR("CREATED_AT"::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "CREATED_AT",
          TO_CHAR("UPDATED_AT"::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "UPDATED_AT"
       FROM "NL2SQL_AVAILABLE_TABLES"
       WHERE "ID" = $1`,
      [tableId]
    );
    
    if (!result || result.length === 0) {
      return NextResponse.json({ 
        error: "Table not found", 
        message: "The table was not found" 
      }, { status: 404 });
    }
    
    return NextResponse.json(result[0], { status: 200 });
  } catch (error) {
    console.error("Error fetching table data:", error);
    return NextResponse.json({ 
      error: "Failed to fetch table data", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}