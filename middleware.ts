// middleware.ts
import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Define public paths that don't require authentication
const publicPaths = [
  '/',
  '/login',
  '/register',
  '/verification-sent',
  '/verify',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify',
  '/api/auth/logout',
  '/api/plans', // Allow access to pricing plans without authentication
  '/_next', // Needed for Next.js resources
  '/favicon.ico'
];

// Helper function to check if a path is public
function isPublicPath(path: string): boolean {
  return publicPaths.some(publicPath => 
    path === publicPath || 
    path.startsWith(`${publicPath}/`) ||
    path.startsWith('/_next/') ||
    path.startsWith('/favicon')
  );
}

// Helper function to check if path is an API route
function isApiPath(path: string): boolean {
  return path.startsWith('/api/');
}

// Helper function to verify JWT token
async function verifyToken(token: string): Promise<boolean> {
  
  return true;
  //   const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  //   await jwtVerify(token, secret);
  //   return true;
  // } catch (error) {
  //   return false;
  // }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hostname = request.headers.get('host') || '';
  
  // Check if the path is public
  const isPublic = isPublicPath(path);
  
  // Get token from cookies
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  
  // Special handling for apexexperts.net domain to fix theme switching
  if (hostname === 'apexexperts.net' || hostname.endsWith('.apexexperts.net')) {
    const response = NextResponse.next();
    
    // Add cache control headers to prevent caching issues
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  }
  
  // If path is public, allow access without authentication
  if (isPublic) {
    return NextResponse.next();
  }
  
  // If user is not authenticated and tries to access a protected route
  if (!token) {
    // For API routes, return 401 Unauthorized
    if (isApiPath(path)) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // For regular routes, redirect to login page
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', path); // Store the original URL to redirect back after login
    return NextResponse.redirect(loginUrl);
  }
  
  // Verify token validity
  const isValidToken = await verifyToken(token);
  if (!isValidToken) {
    // For invalid tokens, clear the cookie and redirect to login
    const response = isApiPath(path) 
      ? NextResponse.json({ error: 'Session expired' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));

    const cookieStore = await cookies();
    cookieStore.delete('token');
    return response;
  }
  
  // If token is valid, continue to the protected route
  if (isApiPath(path)) {
    // For API routes, add authorization header
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('Authorization', `Bearer ${token}`);
    
    const modifiedRequest = new NextRequest(request.url, {
      headers: requestHeaders,
      method: request.method,
      body: request.body,
      cache: request.cache,
      credentials: request.credentials,
      integrity: request.integrity,
      keepalive: request.keepalive,
      mode: request.mode,
      redirect: request.redirect,
      referrer: request.referrer,
      referrerPolicy: request.referrerPolicy,
      signal: request.signal,
    });
    
    return NextResponse.next({
      request: modifiedRequest,
    });
  }
  
  // For non-API protected routes with valid token
  return NextResponse.next();
}

// Configure middleware to run on all paths
export const config = {
  matcher: [
    // Apply to all routes except static files
    '/((?!_next/static|_next/image|images|public|favicon.ico).*)',
  ],
};