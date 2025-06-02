// app/api/organization/members/[memberId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { extractUserIdFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

// Handler for GET requests
export async function GET(req: NextRequest, context: unknown) {
  const { params } = context as { params: Record<string, string> };

  try {
    const memberId = parseInt(params.memberId, 10);
    if (isNaN(memberId)) {
      return NextResponse.json(
        { 
          error: "Invalid member ID",
          message: "Member ID must be a number"
        },
        { status: 400 }
      );
    }

    console.log(`GET Member API called for member ID ${memberId}`);

    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();
    if (!userId) {
      console.log("GET Member API: No userId found in token or cookies");
      return NextResponse.json(
        { 
          error: "Authentication required",
          message: "Please login to access this resource"
        },
        { status: 401 }
      );
    }

    try {
      console.log("GET Member API: Using PostgreSQL connection");

      // Get organization ID and role for the current user
      const userResult = await query(
        `SELECT "ORG_ID", "ROLE" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
        [userId]
      );
      if (!userResult || userResult.length === 0) {
        return NextResponse.json(
          { 
            error: "User not found",
            message: "Your user account was not found"
          },
          { status: 404 }
        );
      }

      const orgId = userResult[0].ORG_ID;
      const userRole = userResult[0].ROLE;
      if (!orgId) {
        return NextResponse.json(
          { 
            error: "No organization found",
            message: "You need to be part of an organization to access this resource"
          },
          { status: 404 }
        );
      }

      // Only ADMIN and MANAGER roles can view member details
      // Regular users can only view their own details
      if (userRole !== "ADMIN" && userRole !== "MANAGER" && memberId !== userId) {
        return NextResponse.json(
          { 
            error: "Permission denied",
            message: "You don't have permission to view this member's details"
          },
          { status: 403 }
        );
      }

      // Get member details
      const memberResult = await query(
        `SELECT 
          "ID",
          "NAME",
          "EMAIL",
          "ROLE",
          "EXPERIENCE_LEVEL",
          "INTERESTS",
          "NOTIFICATIONS_ENABLED",
          "HAS_COMPLETED_ONBOARDING",
          "IS_VERIFIED",
          TO_CHAR("CREATED_AT", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "CREATED_AT",
          TO_CHAR("UPDATED_AT", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "UPDATED_AT"
        FROM "NL2SQL_USERS"
        WHERE "ID" = $1 AND "ORG_ID" = $2`,
        [memberId, orgId]
      );
      if (!memberResult || memberResult.length === 0) {
        return NextResponse.json(
          { 
            error: "Member not found",
            message: "The requested member does not exist in your organization"
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(memberResult[0], { status: 200 });
    } finally {
      // No need to close connection with PostgreSQL pool
      console.log("GET Member API: Query completed");
    }
  } catch (error) {
    console.error("GET member API error:", error);
    return NextResponse.json(
      { error: "Failed to get member", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Handler for PATCH requests
export async function PATCH(req: NextRequest, context: unknown) {
  const { params } = context as { params: Record<string, string> };

  try {
    const memberId = parseInt(params.memberId, 10);
    if (isNaN(memberId)) {
      return NextResponse.json(
        { 
          error: "Invalid member ID",
          message: "Member ID must be a number"
        },
        { status: 400 }
      );
    }
    
    console.log(`PATCH Member API called for member ID ${memberId}`);
    const userId = await extractUserIdFromCookies();
    if (!userId) {
      console.log("PATCH Member API: No userId found in token or cookies");
      return NextResponse.json(
        { 
          error: "Authentication required",
          message: "Please login to access this resource"
        },
        { status: 401 }
      );
    }

    try {
      console.log("PATCH Member API: Using PostgreSQL connection");

      const userResult = await query(
        `SELECT "ORG_ID", "ROLE" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
        [userId]
      );
      if (!userResult || userResult.length === 0) {
        return NextResponse.json(
          { 
            error: "User not found",
            message: "Your user account was not found"
          },
          { status: 404 }
        );
      }

      const orgId = userResult[0].ORG_ID;
      const userRole = userResult[0].ROLE;
      if (!orgId) {
        return NextResponse.json(
          { 
            error: "No organization found",
            message: "You need to be part of an organization to access this resource"
          },
          { status: 404 }
        );
      }

      const updateData = await req.json();
      const memberResult = await query(
        `SELECT "ROLE" FROM "NL2SQL_USERS" WHERE "ID" = $1 AND "ORG_ID" = $2`,
        [memberId, orgId]
      );
      if (!memberResult || memberResult.length === 0) {
        return NextResponse.json(
          { 
            error: "Member not found",
            message: "The requested member does not exist in your organization"
          },
          { status: 404 }
        );
      }

      const memberRole = memberResult[0].ROLE;
      const canUpdateAllFields = userRole === "ADMIN";
      const canUpdateSomeFields = userRole === "MANAGER";
      if (
        (userRole === "USER" && memberId !== userId) ||
        (userRole === "MANAGER" && (memberRole === "ADMIN" || memberRole === "MANAGER"))
      ) {
        return NextResponse.json(
          { 
            error: "Permission denied",
            message: "You don't have permission to update this member's details"
          },
          { status: 403 }
        );
      }

      let allowedFields: string[] = [];
      if (canUpdateAllFields) {
        allowedFields = [
          "NAME", "EMAIL", "ROLE", "EXPERIENCE_LEVEL", "INTERESTS",
          "NOTIFICATIONS_ENABLED", "HAS_COMPLETED_ONBOARDING"
        ];
      } else if (canUpdateSomeFields) {
        allowedFields = [
          "NAME", "EMAIL", "EXPERIENCE_LEVEL", "INTERESTS",
          "NOTIFICATIONS_ENABLED", "HAS_COMPLETED_ONBOARDING"
        ];
        if (memberRole === "USER") {
          allowedFields.push("ROLE");
        }
      } else {
        allowedFields = [
          "NAME", "EXPERIENCE_LEVEL", "INTERESTS",
          "NOTIFICATIONS_ENABLED"
        ];
      }

      const fieldsToUpdate = Object.keys(updateData)
        .filter((key) => allowedFields.includes(key.toUpperCase()))
        .reduce((obj, key) => {
          obj[key.toUpperCase()] = updateData[key];
          return obj;
        }, {} as Record<string, any>);

      if (Object.keys(fieldsToUpdate).length === 0) {
        return NextResponse.json(
          { 
            error: "No valid fields to update",
            message: "None of the provided fields can be updated with your permissions"
          },
          { status: 400 }
        );
      }

      if (updateData.password && (canUpdateAllFields || userId === memberId)) {
        const hashedPassword = await bcrypt.hash(updateData.password, 10);
        fieldsToUpdate.PASSWORD = hashedPassword;
      }

      // Prepare values for parameterized query
      const values = Object.values(fieldsToUpdate);
      values.push(memberId);

      // Convert set clauses to use PostgreSQL parameter style
      const setClauses = Object.keys(fieldsToUpdate)
        .map((field, index) => `"${field}" = $${index + 1}`)
        .join(", ");

      const updateQuery = `
        UPDATE "NL2SQL_USERS"
        SET ${setClauses}, "UPDATED_AT" = NOW()
        WHERE "ID" = $${values.length}
        RETURNING "ID"
      `;
      const updateResult = await query(updateQuery, values);

      const updatedId = updateResult && updateResult.length > 0 ? updateResult[0].ID : null;
      if (!updatedId) {
        console.log("Update Member API: No rows updated");
        return NextResponse.json(
          { 
            error: "Update failed",
            message: "Failed to update member"
          },
          { status: 500 }
        );
      }

      console.log(`Update Member API: Successfully updated member ID ${memberId}`);
      const updatedMemberResult = await query(
        `SELECT 
          "ID",
          "NAME",
          "EMAIL",
          "ROLE",
          "EXPERIENCE_LEVEL",
          "INTERESTS",
          "NOTIFICATIONS_ENABLED",
          "HAS_COMPLETED_ONBOARDING",
          "IS_VERIFIED",
          TO_CHAR("CREATED_AT", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "CREATED_AT",
          TO_CHAR("UPDATED_AT", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "UPDATED_AT"
        FROM "NL2SQL_USERS"
        WHERE "ID" = $1`,
        [memberId]
      );

      const memberData = updatedMemberResult && updatedMemberResult.length > 0 ? updatedMemberResult[0] : { ID: memberId };
      return NextResponse.json(
        { 
          message: "Member updated successfully",
          ...memberData
        },
        { status: 200 }
      );
    } finally {
      // No need to close connection with PostgreSQL pool
      console.log("PATCH Member API: Query completed");
    }
  } catch (error) {
    console.error("PATCH member API error:", error);
    return NextResponse.json(
      { error: "Failed to update member", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Handler for DELETE requests
export async function DELETE(req: NextRequest, context: unknown) {
  const { params } = context as { params: Record<string, string> };

  try {
    const memberId = parseInt(params.memberId, 10);
    if (isNaN(memberId)) {
      return NextResponse.json(
        { 
          error: "Invalid member ID",
          message: "Member ID must be a number"
        },
        { status: 400 }
      );
    }
    
    console.log(`DELETE Member API called for member ID ${memberId}`);
    const userId = await extractUserIdFromCookies();
    if (!userId) {
      console.log("DELETE Member API: No userId found in token or cookies");
      return NextResponse.json(
        { 
          error: "Authentication required",
          message: "Please login to access this resource"
        },
        { status: 401 }
      );
    }

    if (memberId === userId) {
      return NextResponse.json(
        { 
          error: "Cannot delete yourself",
          message: "You cannot delete your own account through this API"
        },
        { status: 400 }
      );
    }

    try {
      console.log("DELETE Member API: Using PostgreSQL connection");

      const userResult = await query(
        `SELECT "ORG_ID", "ROLE" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
        [userId]
      );
      if (!userResult || userResult.length === 0) {
        return NextResponse.json(
          { 
            error: "User not found",
            message: "Your user account was not found"
          },
          { status: 404 }
        );
      }

      const orgId = userResult[0].ORG_ID;
      const userRole = userResult[0].ROLE;
      if (!orgId) {
        return NextResponse.json(
          { 
            error: "No organization found",
            message: "You need to be part of an organization to access this resource"
          },
          { status: 404 }
        );
      }

      if (userRole !== "ADMIN") {
        return NextResponse.json(
          { 
            error: "Permission denied",
            message: "Only administrators can delete members"
          },
          { status: 403 }
        );
      }

      const memberResult = await query(
        `SELECT "ROLE" FROM "NL2SQL_USERS" WHERE "ID" = $1 AND "ORG_ID" = $2`,
        [memberId, orgId]
      );
      if (!memberResult || memberResult.length === 0) {
        return NextResponse.json(
          { 
            error: "Member not found",
            message: "The requested member does not exist in your organization"
          },
          { status: 404 }
        );
      }

      const deleteResult = await query(
        `DELETE FROM "NL2SQL_USERS" WHERE "ID" = $1 AND "ORG_ID" = $2 RETURNING "ID"`,
        [memberId, orgId]
      );
      if (!deleteResult || deleteResult.length === 0) {
        return NextResponse.json(
          { 
            error: "Delete failed",
            message: "Failed to delete member"
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          message: "Member deleted successfully",
          id: memberId
        },
        { status: 200 }
      );
    } finally {
      // No need to close connection with PostgreSQL pool
      console.log("DELETE Member API: Query completed");
    }
  } catch (error) {
    console.error("DELETE member API error:", error);
    return NextResponse.json(
      { error: "Failed to delete member", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
