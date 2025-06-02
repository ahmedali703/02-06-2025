// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { cookies } from 'next/headers'

export const POST = async (req: NextRequest) => {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Search for user in the database using PostgreSQL
    const result = await query(
      `SELECT "ID", "PASSWORD", "NAME", "EMAIL", "ORG_ID", "HAS_COMPLETED_ONBOARDING" FROM "NL2SQL_USERS" WHERE "EMAIL" = $1`,
      [email]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    const user = result[0];
    const hashedPassword = user.PASSWORD;

    // Verify password
    const passwordMatch = await bcrypt.compare(password, hashedPassword);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.ID, 
        email: user.EMAIL 
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' } as jwt.SignOptions
    );

    // Create a response with the token stored in a cookie
    const response = NextResponse.json(
      { 
        message: "Login successful", 
        userId: user.ID,
        name: user.NAME,
        email: user.EMAIL,
        orgId: user.ORG_ID
      },
      { status: 200 }
    );

    // Set the token as a cookie
    // response.cookies.set({
    //   name: 'token',
    //   value: token,
    //   path: '/',
    //   httpOnly: true,
    //   maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    //   sameSite: 'lax',
    //   secure: process.env.NODE_ENV === 'production',
    //   priority: 'high'
    // });

    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Failed to login", details: error.message },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { error: "Failed to login", details: "An unknown error occurred" },
        { status: 500 }
      );
    }
  }
};