// app/api/organization/members/add/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { extractUserIdFromCookies } from '@/lib/auth';
import { generateVerificationToken } from '@/lib/auth';
import nodemailer from "nodemailer";
import { query } from '@/lib/db';

// Setup email transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: 'ai@apexexperts.net',
    pass: 'H~eW_PtjR8mL',
  }
});

// Function to send verification email
async function sendVerificationEmail(email: string, name: string, token: string) {
  // Create verification link - ensure to replace base_url with your site URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL as string;
  const verificationUrl = `${baseUrl}/verify?token=${token}`;

  // Email content with HTML formatting
  const htmlContent = `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activate Your Account</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f7f9fc;
      color: #333;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      color: #4f46e5;
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-text {
      margin-left: 8px;
    }
    .logo-highlight {
      color: #8b5cf6;
    }
    h1 {
      color: #4f46e5;
      margin-top: 0;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      height: 40px;
      width: auto;
      min-width: 200px;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 6px;
      background-color: #8b5cf6;
      color: #ffffff;
      font-weight: bold;
      padding: 10px 20px;
      font-size: 16px;
      text-decoration: none;
      margin: 20px auto;
      text-align: center;
      transition: all 0.2s ease;
    }
    .button:hover {
      background-color: #7c3aed;
    }
    .note {
      font-size: 14px;
      color: #666;
      margin-top: 20px;
      padding: 15px;
      background-color: #f8fafc;
      border-radius: 8px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <!-- Simple CPU icon as SVG -->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
          <rect x="9" y="9" width="6" height="6"></rect>
          <line x1="9" y1="1" x2="9" y2="4"></line>
          <line x1="15" y1="1" x2="15" y2="4"></line>
          <line x1="9" y1="20" x2="9" y2="23"></line>
          <line x1="15" y1="20" x2="15" y2="23"></line>
          <line x1="20" y1="9" x2="23" y2="9"></line>
          <line x1="20" y1="14" x2="23" y2="14"></line>
          <line x1="1" y1="9" x2="4" y2="9"></line>
          <line x1="1" y1="14" x2="4" y2="14"></line>
        </svg>
        <span class="logo-text">
          <span class="logo-highlight">AI</span>Query
        </span>
      </div>
      <h1>Welcome to MyQuery</h1>
    </div>
    
    <div class="content">
      <p>Hello <strong>${name}</strong>,</p>
      <p>You have been added as a team member to MyQuery. To activate your account and take advantage of the app's features, please click on the button below:</p>
      
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Activate Your Account</a>
      </div>
      
      <p>Or you can copy and paste the following link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px;">${verificationUrl}</p>
      
      <div class="note">
        <p>Note: The activation link will expire within 24 hours. If the link has expired, you can request a new one by contacting your administrator.</p>
      </div>
    </div>
    
    <div class="footer">
      <p>Regards, AI Query Team</p>
      <p>If you did not expect this email, please contact your administrator.</p>
    </div>
  </div>
</body>
</html>
  `;

  // Send email with text and HTML versions
  const info = await transporter.sendMail({
    from: '"AI Query System" <ai@apexexperts.net>',
    to: email,
    subject: "Activate Your Account in AI Query",
    text: `Hello ${name},
    
You have been added as a team member to MyQuery. To activate your account, please visit this link: ${verificationUrl}

Note: The activation link will expire within 24 hours.

Regards,
AI Query Team`,
    html: htmlContent,
  });

  console.log("Verification email sent: %s", info.messageId);
  return info;
}

export const POST = async (req: NextRequest) => {
  try {
    console.log("Add Member API called");
    
    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Add Member API: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Add Member API: UserId found:", userId);
    
    // Parse request body
    const { name, email, password, role, experienceLevel, interests, notificationsEnabled } = await req.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json({ 
        error: "Missing required fields",
        message: "Name, email, and password are required"
      }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ 
        error: "Invalid password",
        message: "Password must be at least 8 characters long"
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: "Invalid email",
        message: "Please provide a valid email address"
      }, { status: 400 });
    }

    // Validate role
    const validRoles = ['ADMIN', 'MANAGER', 'USER'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ 
        error: "Invalid role",
        message: "Role must be one of: ADMIN, MANAGER, USER"
      }, { status: 400 });
    }

    // Validate experience level
    const validExperienceLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', ''];
    if (experienceLevel && !validExperienceLevels.includes(experienceLevel)) {
      return NextResponse.json({ 
        error: "Invalid experience level",
        message: "Experience level must be one of: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT"
      }, { status: 400 });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Use PostgreSQL connection
    let orgId: number | null = null;
    
    try {
      console.log("Add Member API: Using PostgreSQL connection");

      // Get organization ID and role for the current user
      const userResult = await query(
        `SELECT "ORG_ID", "ROLE" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
        [userId]
      );
      
      if (userResult && userResult.length > 0) {
        orgId = userResult[0].ORG_ID;
        const userRole = userResult[0].ROLE;
        
        console.log("Add Member API: Found orgId:", orgId);
        console.log("Add Member API: User role:", userRole);
        
        if (!orgId) {
          return NextResponse.json({ 
            error: "No organization found",
            message: "You need to be part of an organization to add members"
          }, { status: 404 });
        }
        
        // Only ADMIN and MANAGER roles can add members
        if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
          return NextResponse.json({ 
            error: "Permission denied",
            message: "You don't have permission to add members"
          }, { status: 403 });
        }
        
        // MANAGER can only add USER role, not other MANAGER or ADMIN
        if (userRole === 'MANAGER' && (role === 'ADMIN' || role === 'MANAGER')) {
          return NextResponse.json({ 
            error: "Permission denied",
            message: "Managers can only add users with 'USER' role"
          }, { status: 403 });
        }
      } else {
        console.log("Add Member API: User not found or has no organization");
        return NextResponse.json({ 
          error: "No organization found",
          message: "You need to be part of an organization to add members"
        }, { status: 404 });
      }

      // Check if email already exists in the organization
      const emailCheckResult = await query(
        `SELECT COUNT(*) AS "COUNT" FROM "NL2SQL_USERS" 
         WHERE "EMAIL" = $1 AND "ORG_ID" = $2`,
        [email, orgId]
      );
      
      const emailExists = emailCheckResult && emailCheckResult[0] && parseInt(emailCheckResult[0].COUNT) > 0;
      
      if (emailExists) {
        return NextResponse.json({ 
          error: "Email already exists",
          message: "A user with this email already exists in your organization"
        }, { status: 400 });
      }

      // Generate verification token
      const verificationToken = generateVerificationToken();
      
      // Set token expiry date (24 hours from now)
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);
      
      // Insert new user
      const result = await query(
        `INSERT INTO "NL2SQL_USERS" (
          "EMAIL", 
          "PASSWORD", 
          "NAME", 
          "ROLE",
          "ORG_ID",
          "EXPERIENCE_LEVEL",
          "INTERESTS",
          "NOTIFICATIONS_ENABLED",
          "HAS_COMPLETED_ONBOARDING",
          "CREATED_AT", 
          "UPDATED_AT",
          "IS_VERIFIED",
          "VERIFICATION_TOKEN",
          "TOKEN_EXPIRY"
        ) VALUES (
          $1, 
          $2, 
          $3, 
          $4,
          $5,
          $6,
          $7,
          $8,
          'N',
          NOW(), 
          NOW(),
          'N',
          $9,
          NOW() + INTERVAL '1 day'
        ) RETURNING "ID"`,
        [ 
          email, 
          hashedPassword, 
          name,
          role || 'USER',
          orgId,
          experienceLevel || null,
          interests || null,
          notificationsEnabled === false ? 'N' : 'Y',
          verificationToken
        ]
      );

      // Get the ID of the new user
      const newUserId = result && result[0] ? result[0].ID : null;

      // Log the activity
      await query(
        `INSERT INTO "NL2SQL_USER_ACTIVITY" (
          "USER_ID",
          "ORG_ID",
          "ACTIVITY_TYPE",
          "ACTIVITY_DETAILS",
          "ACTIVITY_DATE"
        ) VALUES (
          $1,
          $2,
          'ADD_MEMBER',
          'Added new member: ' || $3,
          NOW()
        )`,
        [ 
          userId,
          orgId,
          email
        ]
      );
      
      // Send verification email
      try {
        await sendVerificationEmail(email, name, verificationToken);
        console.log("Add Member API: Verification email sent to", email);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Continue even if email sending fails
      }

      return NextResponse.json({ 
        message: "Member added successfully", 
        userId: newUserId 
      }, { status: 201 });
    } finally {
      // No need to close connection with PostgreSQL pool
      console.log("Add Member API: PostgreSQL query completed");
    }
  } catch (error) {
    console.error("Add member API error:", error);
    
    return NextResponse.json(
      { error: "Failed to add member", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};

