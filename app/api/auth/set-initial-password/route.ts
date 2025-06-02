// app/api/auth/set-initial-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { extractUserIdFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { userId, password } = await req.json();

    // Basic validation
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    // Get the user ID - either from the request or from the auth token
    let targetUserId: number | null = null;
    
    // If userId is provided in the request, use that
    if (userId) {
      targetUserId = parseInt(userId, 10);
    } else {
      // Otherwise, try to get it from the token/cookies
      targetUserId = await extractUserIdFromCookies();
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    try {
      console.log(`Set Initial Password API: Setting password for user ID ${targetUserId}`);

      // Check if user exists and their verification/onboarding status using PostgreSQL
      const userResult = await query(
        `SELECT "ID", "IS_VERIFIED", "HAS_COMPLETED_ONBOARDING" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
        [targetUserId]
      );

      if (!userResult || userResult.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const user = userResult[0];

      // Verify that this is a newly verified user who hasn't completed onboarding
      // or explicitly allow any verified user to set a new password using this endpoint
        // if (user.IS_VERIFIED !== 'Y') {
        //   return NextResponse.json({ 
        //     error: "Your account must be verified before setting a password" 
        //   }, { status: 403 });
        // }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user's password and mark onboarding as completed using PostgreSQL
      await query(
        `UPDATE "NL2SQL_USERS" 
         SET "PASSWORD" = $1, 
             "HAS_COMPLETED_ONBOARDING" = 'Y',
             "UPDATED_AT" = CURRENT_TIMESTAMP
         WHERE "ID" = $2`,
        [hashedPassword, targetUserId]
      );

      return NextResponse.json(
        { message: "Password set successfully" }, 
        { status: 200 }
      );
    } catch (dbError) {
      console.error("Database error in set-initial-password:", dbError);
      return NextResponse.json(
        { error: "Database operation failed", details: dbError instanceof Error ? dbError.message : String(dbError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Set initial password API error:", error);
    
    return NextResponse.json(
      { error: "Failed to set password", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}