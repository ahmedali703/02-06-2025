// app/api/user/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { query } from "@/lib/db";

// Interface for decoded JWT token
interface DecodedToken {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

export async function GET(req: NextRequest) {
  try {
    // Get the JWT token from cookies to identify the user
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      console.log("API/USER/ME: Token not found in cookies");
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Validate and decode the token
    let userId: number;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
      userId = decoded.userId;
      console.log(`API/USER/ME: Successfully decoded token for userId: ${userId}`);
    } catch (error) {
      console.error("API/USER/ME: Token verification failed:", error);
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    console.log(`API/USER/ME: Preparing to fetch data for userId: ${userId}`);

    try {
      // Get user details using PostgreSQL
      const userResult = await query(
        `SELECT 
          "ID",
          "EMAIL",
          "NAME",
          "ROLE",
          "ORG_ID",
          "EXPERIENCE_LEVEL",
          "NOTIFICATIONS_ENABLED",
          TO_CHAR("CREATED_AT", 'YYYY-MM-DD') AS "CREATED_AT",
          TO_CHAR("UPDATED_AT", 'YYYY-MM-DD') AS "UPDATED_AT"
        FROM "NL2SQL_USERS" 
        WHERE "ID" = $1`,
        [userId]
      );
      
      if (!userResult || userResult.length === 0) {
        console.log(`API/USER/ME: User not found for userId: ${userId}`);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const userData = userResult[0];
      console.log(`API/USER/ME: User data retrieved for userId: ${userId}, orgId: ${userData.ORG_ID}`);

      // Get organization details if available
      if (userData.ORG_ID) {
        try {
          console.log(`API/USER/ME: Fetching organization data for orgId: ${userData.ORG_ID}`);
          
          const orgResult = await query(
            `SELECT 
              "ORG_ID",
              "ORG_NAME",
              "ORG_STATUS",
              "DATABASE_TYPE",
              "CREATED_AT"::text AS "CREATED_AT"
            FROM "NL2SQL_ORG"
            WHERE "ORG_ID" = $1`,
            [userData.ORG_ID]
          );

          console.log(`API/USER/ME: Organization query result:`, orgResult ? orgResult.length : 'No rows');

          if (orgResult && orgResult.length > 0) {
            userData.organization = orgResult[0];
            console.log(`API/USER/ME: Organization data added to user response`);
          } else {
            console.log(`API/USER/ME: No organization found for orgId: ${userData.ORG_ID}`);
            // Add default organization info to avoid UI errors
            userData.organization = {
              ORG_ID: userData.ORG_ID,
              ORG_NAME: "Organization Data Unavailable",
              ORG_STATUS: "Y",
              DATABASE_TYPE: "postgresql",
              CREATED_AT: userData.CREATED_AT
            };
          }
        } catch (orgError) {
          console.error(`API/USER/ME: Error fetching organization:`, orgError);
          // Add default organization info to avoid UI errors
          userData.organization = {
            ORG_ID: userData.ORG_ID,
            ORG_NAME: "Error Fetching Organization",
            ORG_STATUS: "Y",
            DATABASE_TYPE: "postgresql",
            CREATED_AT: userData.CREATED_AT
          };
        }
      } else {
        console.log(`API/USER/ME: User does not have an organization ID`);
      }

      const response = NextResponse.json(userData, { status: 200 });
      
      // Add tracking info in header to help debug user and organization data
      response.headers.set('X-Debug-Info', `User: ${userId}, Org: ${userData.ORG_ID || 'None'}`);
      
      return response;
    } catch (dbError) {
      console.error("API/USER/ME: Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch user data from database", details: dbError instanceof Error ? dbError.message : String(dbError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API/USER/ME: Uncaught error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}