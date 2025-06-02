//app/api/get-db-types/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const GET = async () => {
  try {
    const result = await query(
      `SELECT "TYPE_ID", "DB_NAME" FROM "NL2SQL_DATABASE_TYPE" WHERE "DB_STATUS" = true`
    );

    return NextResponse.json({ 
      dbTypes: result.map(row => ({ 
        id: row.TYPE_ID, 
        name: row.DB_NAME 
      })) 
    });
  } catch (error) {
    console.error("Error fetching database types:", error);
    return NextResponse.json({ error: "Failed to fetch database types" }, { status: 500 });
  }
};
