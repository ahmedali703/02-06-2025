// lib/auth.ts - Fixed extractUserIdFromCookies function
import { NextRequest } from "next/server";
import { randomBytes, createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface AuthUser {
  userId: number;
  email: string;
}

export async function getAuthUser(req?: NextRequest): Promise<AuthUser | null> {
  try {
    // Get token from either request cookies or browser cookies
    let token;
    
    if (req) {
      // Method 1: Use NextRequest.cookies
      token = req.cookies.get('token')?.value;
      
      // Method 2: Use header
      if (!token) {
        const authHeader = req.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
    } else {
      // For use in Server Components
      const cookieStore = await cookies();
      token = cookieStore.get('token')?.value;
    }

    // Print token value for debugging
    console.log("Token found in auth.ts:", token ? "Yes" : "No");

    if (!token) {
      return null;
    }

    // Verify token
    const decoded = verifyJWT(token);
    
    if (!decoded || !decoded.userId || !decoded.email) {
      console.log("Invalid token decoded:", decoded);
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email
    };
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated(req?: NextRequest): Promise<boolean> {
  const user = await getAuthUser(req);
  return !!user;
}

// Get user ID directly
export async function getUserId(req?: NextRequest): Promise<number | null> {
  const user = await getAuthUser(req);
  return user?.userId || null;
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateJWT(payload: any): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }); 
}

export function verifyJWT(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

export function getGravatarUrl(email: string): string {
  const hash = createHash('md5')
    .update(email.toLowerCase().trim())
    .digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?d=mp`;
}

// Helper function to check token and return user ID from cookies
// Now has fallback to get userId directly from cookies if token verification fails
export async function extractUserIdFromCookies(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    
    // Try to extract from JWT token first (preferred method)
    const token = cookieStore.get('token')?.value;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
          const userId = decoded.userId as number;
          console.log("UserId extracted from token:", userId);
          return userId;
        } else {
          console.log("Invalid token decoded:", decoded);
          return null;
        }
      } catch (tokenError) {
        console.error("Token verification failed:", tokenError);
        return null;
      }
    } else {
      console.log("No token found in cookies");
      return null;
      }

  } catch (error) {
    console.error("Failed to extract userId from cookies:", error);
    return null;
  }
}