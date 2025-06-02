// middleware.ts
import { NextResponse, NextRequest } from 'next/server';

// تحديد المسارات التي لا تتطلب مصادقة
const publicPaths = [
  '/',
  '/login',
  '/register',
  '/verification-sent',
  '/verify',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify'
];

// دالة للتحقق ما إذا كان المسار عام (لا يتطلب مصادقة)
function isPublicPath(path: string): boolean {
  return publicPaths.some(publicPath => path.startsWith(publicPath));
}

// دالة للتحقق ما إذا كان المسار يبدأ بـ API
function isApiPath(path: string): boolean {
  return path.startsWith('/api/');
}

export function middleware(request: NextRequest) {
  // Get the current path
  const path = request.nextUrl.pathname;
  
  // Check if path is public
  const isPublic = isPublicPath(path);
  
  // Get token from cookie
  const token = request.cookies.get('token')?.value;

  // Add cache control headers to prevent caching issues
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  // If path is public, allow access without authentication
  if (isPublic) {
    return response;
  }

  // If no token is present and path requires authentication
  if (!token) {
    if (isApiPath(path)) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', path);
    return NextResponse.redirect(loginUrl);
  }

  // For non-public paths with token, add token to Authorization header
  if (isApiPath(path)) {
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

  return response;
}

// تكوين المسارات التي يتم تطبيق middleware عليها
export const config = {
  matcher: [
    // تطبيق على كل المسارات باستثناء:
    // - المسارات التي تبدأ بـ public/
    // - المسارات التي تبدأ بـ _next/static
    // - المسارات التي تبدأ بـ _next/image
    // - المسارات التي تبدأ بـ favicon
    '/((?!public/|_next/static|_next/image|favicon).*)',
  ],
}