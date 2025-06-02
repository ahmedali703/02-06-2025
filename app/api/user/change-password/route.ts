// app/api/user/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { extractUserIdFromCookies } from '@/lib/auth';
import { query } from '@/lib/db';

// POST handler for changing user password
export const POST = async (req: NextRequest) => {
  try {
    console.log("Change Password API called");
    
    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Change Password: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Change Password: UserId found:", userId);
    
    // Parse request body to get passwords
    const { currentPassword, newPassword } = await req.json();
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ 
        error: "Missing required fields",
        message: "Both current password and new password are required"
      }, { status: 400 });
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json({ 
        error: "Password too short",
        message: "New password must be at least 8 characters long"
      }, { status: 400 });
    }
    
    try {
      console.log("Change Password: Starting database operation");

      // Get current hashed password from database
      const userResult = await query(
        `SELECT "PASSWORD" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
        [userId]
      );
      
      if (!userResult || userResult.length === 0) {
        console.log("Change Password: User not found");
        return NextResponse.json({ 
          error: "User not found",
          message: "Your user account was not found"
        }, { status: 404 });
      }
      
      const hashedPassword = userResult[0].PASSWORD;
      
      // Verify current password
      const isPasswordCorrect = await bcrypt.compare(currentPassword, hashedPassword);
      
      if (!isPasswordCorrect) {
        console.log("Change Password: Current password is incorrect");
        return NextResponse.json({ 
          error: "Incorrect password",
          message: "Your current password is incorrect"
        }, { status: 400 });
      }
      
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const newHashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update password in database
      const updateResult = await query(
        `UPDATE "NL2SQL_USERS"
         SET "PASSWORD" = $1, "UPDATED_AT" = CURRENT_TIMESTAMP
         WHERE "ID" = $2
         RETURNING "ID"`,
        [newHashedPassword, userId]
      );
      
      // Check if any rows were updated
      if (!updateResult || updateResult.length === 0) {
        console.log("Change Password: No rows updated");
        return NextResponse.json({ 
          error: "Update failed",
          message: "Failed to update password"
        }, { status: 500 });
      }
      
      console.log("Change Password: Password updated successfully");
      
      return NextResponse.json({ 
        message: "Password updated successfully"
      }, { status: 200 });
    } catch (dbError) {
      console.error("Database operation error:", dbError);
      return NextResponse.json({ 
        error: "Database operation failed",
        message: "Failed to update password"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Change password error:", error);
    
    return NextResponse.json(
      { error: "Failed to change password", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};