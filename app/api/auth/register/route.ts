// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { generateVerificationToken, generateJWT } from "@/lib/auth";
import { query } from "@/lib/db";

// إعداد ناقل البريد الإلكتروني
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false, // المنفذ 465 يستخدم SSL/TLS
  auth: {
    user: 'ai@apexexperts.net',
    pass: 'H~eW_PtjR8mL',
  }
});

// دالة إرسال البريد الإلكتروني
async function sendVerificationEmail(email: string, name: string, token: string) {
  // إنشاء رابط التحقق - تأكد من استبدال base_url بعنوان موقعك
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL as string;
  const verificationUrl = `${baseUrl}/verify?token=${token}`;

  // إعداد محتوى البريد الإلكتروني بتنسيق HTML
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
      <p>Thank you for registering in MyQuery. To activate your account and take advantage of the app's features, please click on the button below:</p>
      
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Activate Your Account</a>
      </div>
      
      <p>Or you can copy and paste the following link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px;">${verificationUrl}</p>
      
      <div class="note">
        <p>Note: The activation link will expire within 24 hours. If the link has expired, you can request a new one by logging in.</p>
      </div>
    </div>
    
    <div class="footer">
      <p>Regards, AI Query Team</p>
      <p>If you did not create this account, please ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `;

  // إرسال البريد الإلكتروني مع نسخة نصية
  const info = await transporter.sendMail({
    from: '"AI Query System" <ai@apexexperts.net>',
    to: email,
    subject: "Activate Your Account in AI Query",
    text: `Hello ${name},
    
Thank you for registering in MyQuery. To activate your account, please visit this link: ${verificationUrl}

Note: The activation link will expire within 24 hours.

Regards,
AI Query Team`,
    html: htmlContent,
  });

  console.log("Message sent: %s", info.messageId);
  return info;
}

export const POST = async (req: NextRequest) => {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // PostgreSQL logic starts here
    try {
      // التحقق من عدم وجود البريد الإلكتروني مسبقاً
      const checkUserResult = await query(
        `SELECT "ID" FROM "NL2SQL_USERS" WHERE "EMAIL" = $1`,
        [email]
      );

      if (checkUserResult && checkUserResult.length > 0) {
        return NextResponse.json({ error: "Email already exists" }, { status: 409 });
      }

      // إنشاء رمز التحقق
      const verificationToken = generateVerificationToken();
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ساعة

      // No longer creating an organization during registration
      // The organization will be created during the onboarding process
      // and the user will be linked to it at that time

      // Insert new user without organization ID (will be set during onboarding)
      const userInsertResult = await query(
        `INSERT INTO "NL2SQL_USERS" ("EMAIL", "PASSWORD", "NAME", "VERIFICATION_TOKEN", "VERIFICATION_EXPIRES", "IS_VERIFIED", "CREATED_AT", "UPDATED_AT", "HAS_COMPLETED_ONBOARDING")
         VALUES ($1, $2, $3, $4, $5, 'N', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'N')
         RETURNING "ID"`,
        [
          email,
          hashedPassword,
          name,
          verificationToken,
          verificationTokenExpires
        ]
      );

      if (!userInsertResult || userInsertResult.length === 0) {
        // Potentially roll back organization creation or handle error
        throw new Error('Failed to insert new user.');
      }
      const userId = userInsertResult[0].ID;

      // إرسال بريد التحقق
      await sendVerificationEmail(email, name, verificationToken);

      // Create JWT for the new user (without orgId since it's not set yet)
      const token = await generateJWT({ userId, email, name });

      return NextResponse.json({ message: "User registered successfully. Please check your email to verify your account.", token }, { status: 201 });

    } catch (dbError: any) {
      console.error("Database operation failed during registration:", dbError);
      // Determine if it's a known constraint violation or other DB error
      let errorMessage = "Registration failed due to a database error.";
      let statusCode = 500;
      // Example: if (dbError.code === '23505') { /* unique_violation */ }
      return NextResponse.json({ error: errorMessage, details: dbError.message }, { status: statusCode });
    }
    // PostgreSQL logic ends here

  } catch (error: any) {
    console.error("Error in registration POST handler:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 });
  }
};