// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateVerificationToken } from '@/lib/auth';
import nodemailer from "nodemailer";
import { query } from '@/lib/db';

// Setup email transporter - Using the same configuration from your add member API
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: 'ai@apexexperts.net',
    pass: 'H~eW_PtjR8mL',
  }
});

// Function to send verification email (reusing from your add member API)
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
      <h1>Verify Your Email Address</h1>
    </div>
    
    <div class="content">
      <p>Hello <strong>${name}</strong>,</p>
      <p>You recently requested a new verification link for your MyQuery account. To verify your email address and activate your account, please click on the button below:</p>
      
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Verify Your Email</a>
      </div>
      
      <p>Or you can copy and paste the following link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px;">${verificationUrl}</p>
      
      <div class="note">
        <p>Note: The verification link will expire within 24 hours. If you did not request this verification link, please disregard this email.</p>
      </div>
    </div>
    
    <div class="footer">
      <p>Regards, AI Query Team</p>
      <p>If you need assistance, please contact your administrator.</p>
    </div>
  </div>
</body>
</html>
  `;

  // Send email with text and HTML versions
  const info = await transporter.sendMail({
    from: '"AI Query System" <ai@apexexperts.net>',
    to: email,
    subject: "Verify Your Email Address - AI Query",
    text: `Hello ${name},
    
You recently requested a new verification link for your MyQuery account. To verify your email address, please visit this link: ${verificationUrl}

Note: The verification link will expire within 24 hours.

Regards,
AI Query Team`,
    html: htmlContent,
  });

  console.log("Verification email sent: %s", info.messageId);
  return info;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });
    }

    try {
      console.log("Resend Verification API: Using PostgreSQL connection");

      // Check if user exists and is not yet verified
      const userResult = await query(
        `SELECT "ID", "NAME", "EMAIL", "IS_VERIFIED" FROM "NL2SQL_USERS" WHERE "EMAIL" = $1`,
        [email]
      );

      if (!userResult || userResult.length === 0) {
        return NextResponse.json({ error: "No account found with this email address" }, { status: 404 });
      }

      const user = userResult[0];

      // Check if already verified
      if (user.IS_VERIFIED === 'Y') {
        return NextResponse.json(
          { message: "Your account is already verified. You can login directly." }, 
          { status: 200 }
        );
      }

      // Generate new verification token
      const verificationToken = generateVerificationToken();
      
      // Set token expiry date (24 hours from now)
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);
      
      // Update user with new verification token
      await query(
        `UPDATE "NL2SQL_USERS" 
         SET "VERIFICATION_TOKEN" = $1,
             "TOKEN_EXPIRY" = (CURRENT_TIMESTAMP + INTERVAL '1 day'),
             "UPDATED_AT" = CURRENT_TIMESTAMP
         WHERE "ID" = $2`,
        [verificationToken, user.ID]
      );

      // Send verification email
      try {
        await sendVerificationEmail(user.EMAIL, user.NAME, verificationToken);
        console.log("Resend Verification API: Verification email sent to", user.EMAIL);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Continue even if email sending fails, but inform the client
        return NextResponse.json(
          { warning: "Account updated but failed to send email. Please contact support." }, 
          { status: 200 }
        );
      }

      return NextResponse.json(
        { message: "Verification email sent successfully" }, 
        { status: 200 }
      );
    } finally {
      // No need to close connection with PostgreSQL pool
      console.log("Resend Verification API: Query completed");
    }
  } catch (error) {
    console.error("Resend verification API error:", error);
    
    return NextResponse.json(
      { error: "Failed to process request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}