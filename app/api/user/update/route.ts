// app/api/user/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '@/lib/auth';
import { query } from '@/lib/db';

// POST handler for updating user profile
export const POST = async (req: NextRequest) => {
  try {
    console.log("User Update API called");
    
    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("User Update: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("User Update: UserId found:", userId);
    
    // Parse request body to get profile updates
    const updateData = await req.json();
    
    // Validate update data
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        error: "No data to update",
        message: "Please provide data to update"
      }, { status: 400 });
    }
    
    // Define allowed fields for updating
    const allowedFields = [
      'NAME', 
      'EMAIL', 
      'ROLE', 
      'EXPERIENCE_LEVEL', 
      'NOTIFICATIONS_ENABLED'
    ];
    
    // Filter to only include allowed fields
    const fieldsToUpdate = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {} as Record<string, any>);
    
    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json({ 
        error: "No valid fields to update",
        message: "None of the provided fields are allowed to be updated"
      }, { status: 400 });
    }
    
    try {
      console.log("User Update: Starting database operation");

      // Construct SQL for updating user profile
      const setClauses = Object.keys(fieldsToUpdate)
        .map((field, index) => `"${field}" = $${index + 1}`)
        .join(', ');
      
      const sql = `
        UPDATE "NL2SQL_USERS"
        SET ${setClauses}, "UPDATED_AT" = CURRENT_TIMESTAMP
        WHERE "ID" = $${Object.keys(fieldsToUpdate).length + 1}
        RETURNING "ID"
      `;
      
      // Create parameters array for the query
      const params = [
        ...Object.values(fieldsToUpdate),
        userId
      ];
      
      // Execute the update
      const updateResult = await query(sql, params);
      
      // Check if any rows were updated
      if (!updateResult || updateResult.length === 0) {
        console.log("User Update: No rows updated");
        return NextResponse.json({ 
          error: "Update failed",
          message: "Failed to update user profile"
        }, { status: 500 });
      }
      
      console.log(`User Update: Successfully updated user ID ${userId}`);
      
      // Get updated user data
      const userResult = await query(
        `SELECT 
          "ID",
          "EMAIL",
          "NAME",
          "ROLE",
          "ORG_ID",
          "EXPERIENCE_LEVEL",
          "NOTIFICATIONS_ENABLED",
          "CREATED_AT"::text,
          "UPDATED_AT"::text
        FROM "NL2SQL_USERS" 
        WHERE "ID" = $1`,
        [userId]
      );
      
      const userData = userResult?.[0] || { ID: userId };
      
      return NextResponse.json({ 
        message: "Profile updated successfully",
        ...userData
      }, { status: 200 });
    } catch (dbError) {
      console.error("Database operation error:", dbError);
      return NextResponse.json({ 
        error: "Database operation failed",
        message: "Failed to update user profile"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("User update error:", error);
    
    return NextResponse.json(
      { error: "Failed to update user profile", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};