// app/api/organization/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '../../../lib/auth';
import { query } from '../../../lib/db';

// GET handler for retrieving organization data
export const GET = async (req: NextRequest) => {
  try {
    console.log("Organization API called");
    
    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Organization API: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Organization API: UserId found:", userId);
    
    try {
      console.log("Organization API: Starting database operation");

      // Get organization ID for the user
      const userResult = await query(
        `SELECT "ORG_ID" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
        [userId]
      );
      
      if (!userResult || userResult.length === 0) {
        console.log("Organization API: User not found");
        return NextResponse.json({ 
          error: "User not found",
          message: "Your user account was not found"
        }, { status: 404 });
      }
      
      const orgId = userResult[0].ORG_ID;
      
      if (!orgId) {
        console.log("Organization API: User has no organization");
        return NextResponse.json({ 
          error: "No organization found",
          message: "You are not associated with any organization",
          needsOnboarding: true
        }, { status: 404 });
      }

      // Get organization data
      const orgResult = await query(
        `SELECT 
          o."ORG_ID",
          o."ORG_NAME",
          o."ORG_STATUS",
          o."DATABASE_TYPE",
          o."DATABASE_INFO",
          o."CREATED_AT"::text AS "CREATED_AT",
          o."UPDATED_AT"::text AS "UPDATED_AT",
          (SELECT COUNT(*) FROM "NL2SQL_USERS" WHERE "ORG_ID" = o."ORG_ID") AS "USER_COUNT",
          (SELECT COUNT(*) FROM "NL2SQL_AVAILABLE_TABLES" WHERE "ORG_ID" = o."ORG_ID") AS "TABLE_COUNT"
        FROM "NL2SQL_ORG" o
        WHERE o."ORG_ID" = $1`,
        [orgId]
      );
      
      if (!orgResult || orgResult.length === 0) {
        console.log("Organization API: Organization not found even though user has ORG_ID");
        return NextResponse.json({ 
          error: "Organization not found",
          message: "The organization associated with your account was not found"
        }, { status: 404 });
      }
      
      const orgData = orgResult[0];
      
      // Get subscription data
      let subscriptionData = null;
      try {
        const subscriptionResult = await query(
          `SELECT 
            s."ID",
            p.plan_name AS "PLAN_NAME",
            p.price_monthly AS "PRICE_MONTHLY"
          FROM "NL2SQL_SUBSCRIPTIONS" s
          JOIN nl2sql_plans p ON s."PLAN_ID" = p.id
          WHERE s."ORG_ID" = $1 AND s."STATUS" = 'ACTIVE'
          ORDER BY s."END_DATE" DESC
          LIMIT 1`,
          [orgId]
        );
        
        if (subscriptionResult && subscriptionResult.length > 0) {
          subscriptionData = subscriptionResult[0];
        }
      } catch (subError) {
        console.error("Organization API: Error fetching subscription data:", subError);
        // Continue without subscription data
      }
      
      // Include subscription data if available
      const responseData = {
        ...orgData,
        subscription: subscriptionData
      };
      
      return NextResponse.json(responseData, { 
        status: 200,
        headers: { 'X-Organization-Id': orgId.toString() }
      });
    } catch (dbError) {
      console.error("Database operation error:", dbError);
      return NextResponse.json({ 
        error: "Database operation failed",
        message: "Failed to fetch organization data"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Organization API error:", error);
    
    return NextResponse.json(
      { error: "Failed to fetch organization data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};