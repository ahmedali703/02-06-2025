import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Initialize empty data array as default response
    const emptyResponse = {
      data: [],
      period: 'week'
    };

    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', ...emptyResponse },
        { status: 401 }
      );
    }

    // Verify token
    const verifiedToken = verifyJWT(token);
    if (!verifiedToken) {
      return NextResponse.json(
        { error: 'Invalid token', ...emptyResponse },
        { status: 401 }
      );
    }

    // Get period from query params
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';
    emptyResponse.period = period;

    // Get user ID from token
    const userId = verifiedToken.userId;
    
    // Get user role from database - with error handling
    let userRole = '';
    try {
      const userRoleResult = await query(
        'SELECT "ROLE" FROM "NL2SQL_USERS" WHERE "ID" = $1',
        [userId]
      );
      
      if (userRoleResult && userRoleResult.length > 0) {
        userRole = userRoleResult[0].ROLE || '';
      } else {
        return NextResponse.json(
          { error: 'User role not found', ...emptyResponse },
          { status: 404 }
        );
      }
    } catch (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json(
        { error: 'Failed to fetch user role', ...emptyResponse },
        { status: 500 }
      );
    }
    
    // Only admin users can access user activity data
    if (userRole.toUpperCase() !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required', ...emptyResponse },
        { status: 403 }
      );
    }

    // Get organization ID - with error handling
    let organizationId = null;
    try {
      const userResult = await query(
        'SELECT "ORG_ID" FROM "NL2SQL_USERS" WHERE "ID" = $1',
        [userId]
      );
      
      if (userResult && userResult.length > 0) {
        organizationId = userResult[0].ORG_ID;
      } else {
        return NextResponse.json(
          { error: 'User not found', ...emptyResponse },
          { status: 404 }
        );
      }
    } catch (orgError) {
      console.error('Error fetching organization ID:', orgError);
      return NextResponse.json(
        { error: 'Failed to fetch organization data', ...emptyResponse },
        { status: 500 }
      );
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7); // Default to week
    }

    // Query to get user activity data for the organization
    const userActivityQuery = `
      SELECT 
        u."NAME" as "user",
        COUNT(q."ID") as "queries",
        (SUM(CASE WHEN q."EXECUTION_STATUS" = 'SUCCESS' THEN 1 ELSE 0 END) * 100.0 / 
          CASE WHEN COUNT(q."ID") = 0 THEN 1 ELSE COUNT(q."ID") END) as "successRate"
      FROM 
        "NL2SQL_USERS" u
      LEFT JOIN 
        "NL2SQL_QUERIES" q ON q."USER_ID" = u."ID" AND 
                           q."EXECUTION_DATE" >= $1 AND 
                           q."EXECUTION_DATE" <= $2
      WHERE 
        u."ORG_ID" = $3
      GROUP BY 
        u."ID", u."NAME"
      ORDER BY 
        COUNT(q."ID") DESC
      LIMIT 10
    `;
    
    let userActivityData: any[] = []; // Initialize with an empty array

    try {
      const result = await query(userActivityQuery, [startDate, now, organizationId]);
      // Ensure result is an array before assigning
      userActivityData = Array.isArray(result) ? result : [];
    } catch (queryError) {
      console.error('Database query error in /api/analytics/user-activity:', queryError);
      // userActivityData remains an empty array on error
    }

    // Always return a valid response with an array
    return NextResponse.json({
      data: userActivityData,
      period
    });
    
  } catch (error) {
    console.error('Error fetching user activity data:', error);
    // Return empty array on any error
    return NextResponse.json({
      error: 'Failed to fetch user activity data',
      data: [],
      period: 'week'
    }, { status: 500 });
  }
}
