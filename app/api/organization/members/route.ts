// app/api/organization/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '@/lib/auth';
import { query } from '@/lib/db';

export const GET = async (req: NextRequest) => {
  try {
    console.log("Organization Members API called");
    
    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Members API: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Members API: UserId found:", userId);
    
    let orgId: number | null = null;
    
    try {
      console.log("Members API: Starting database operation");

      // Get organization ID for the user
      const userResult = await query(
        `SELECT "ORG_ID", "ROLE" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
        [userId]
      );
      
      if (userResult && userResult.length > 0) {
        orgId = userResult[0].ORG_ID;
        const userRole = userResult[0].ROLE;
        
        console.log("Members API: Found orgId:", orgId);
        console.log("Members API: User role:", userRole);
        
        if (!orgId) {
          return NextResponse.json({ 
            error: "No organization found",
            message: "You need to be part of an organization to view members"
          }, { status: 404 });
        }
        
        // Only ADMIN and MANAGER roles can view all members
        if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
          return NextResponse.json({ 
            error: "Permission denied",
            message: "You don't have permission to view all members"
          }, { status: 403 });
        }
      } else {
        console.log("Members API: User not found or has no organization");
        return NextResponse.json({ 
          error: "No organization found",
          message: "You need to be part of an organization to view members"
        }, { status: 404 });
      }

      // Fetch all members of the organization
      const membersResult = await query(
        `SELECT 
          "ID",
          "NAME",
          "EMAIL",
          "ROLE",
          "IS_VERIFIED",
          "EXPERIENCE_LEVEL",
          "NOTIFICATIONS_ENABLED",
          "HAS_COMPLETED_ONBOARDING",
          "CREATED_AT"::text,
          "UPDATED_AT"::text
        FROM "NL2SQL_USERS"
        WHERE "ORG_ID" = $1
        ORDER BY "CREATED_AT" DESC`,
        [orgId]
      );

      console.log(`Members API: Retrieved ${membersResult?.length || 0} members for organization ${orgId}`);
      
      return NextResponse.json({ members: membersResult || [] }, { 
        status: 200,
        headers: { 'X-Organization-Id': orgId.toString() }
      });
    } catch (dbError) {
      console.error("Database operation error:", dbError);
      return NextResponse.json({ 
        error: "Database operation failed",
        message: "Failed to fetch organization members"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Members API error:", error);
    
    return NextResponse.json(
      { error: "Failed to fetch members", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};