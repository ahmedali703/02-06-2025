// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateJWT } from "@/lib/auth";
import { query } from "@/lib/db";

export const POST = async (req: NextRequest) => {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
    }

    // PostgreSQL logic starts here
    // Check if user exists with the given verification token
    const userResult = await query(
      `SELECT "ID", "EMAIL", "IS_VERIFIED", "VERIFICATION_EXPIRES" 
       FROM "NL2SQL_USERS" 
       WHERE "VERIFICATION_TOKEN" = $1`,
      [token]
    );

    // Check if any results
    if (!userResult || userResult.length === 0) {
      return NextResponse.json({ error: "Invalid verification token" }, { status: 400 });
    }

    const user = userResult[0] as any; // Assuming query returns an array of objects

    // Check if account is already verified
    if (user.IS_VERIFIED === 'Y') {
      return NextResponse.json(
        {
          message: "Account already verified",
          userId: user.ID,
        },
        { status: 200 }
      );
    }

    // Check token expiry
    if (user.VERIFICATION_EXPIRES) {
      const tokenExpiry = new Date(user.VERIFICATION_EXPIRES);
      const now = new Date();

      // Log dates for debugging
      console.log("Token expiry:", tokenExpiry);
      console.log("Current time:", now);

      if (now > tokenExpiry) {
        return NextResponse.json({ error: "Verification token has expired" }, { status: 400 });
      }
    } else {
      console.log("No VERIFICATION_EXPIRES found for user");
      // Depending on policy, you might want to treat no expiry as an error or proceed
      // For now, proceeding if no expiry is set, adjust if needed.
    }

    // Update user to be verified
    await query(
      `UPDATE "NL2SQL_USERS" 
       SET "IS_VERIFIED" = 'Y', 
           "UPDATED_AT" = CURRENT_TIMESTAMP,
           "HAS_COMPLETED_ONBOARDING" = 'N' -- Assuming onboarding is a separate step
       WHERE "ID" = $1`,
      [user.ID]
    );

    // Generate JWT token for the verified user
    const jwtToken = generateJWT({ userId: user.ID, email: user.EMAIL }); 

    // Create response with cookie containing the token
    const response = NextResponse.json(
      {
        message: "Email verification successful",
        userId: user.ID,
      },
      { status: 200 }
    );

    // Add the cookie
    response.cookies.set({
      name: 'token',
      value: jwtToken,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;

  } catch (error) {
    console.error("Verification error:", error);
    // Check if the error is a known database error type if needed, otherwise generic message
    const errorMessage = error instanceof Error ? error.message : "Failed to verify email";
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 } 
    );
  }
};