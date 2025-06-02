import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token
    const verifiedToken = verifyJWT(token);
    if (!verifiedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user ID from token
    const userId = verifiedToken.userId;
    
    // Get request body
    const body = await request.json();
    const { dashboardName, dataSourceId, dashboardConfig } = body;
    
    if (!dashboardName || !dataSourceId || !dashboardConfig) {
      return NextResponse.json(
        { error: 'Dashboard name, data source ID, and configuration are required' },
        { status: 400 }
      );
    }
    
    // Get user's organization ID
    let organizationId = null;
    
    try {
      const userResult = await query(
        'SELECT ORG_ID FROM NL2SQL_USERS WHERE ID = :userId',
        [userId]
      );
      
      if (userResult && userResult.length > 0) {
        organizationId = userResult[0].ORG_ID;
      } else {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    } catch (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }
    
    // Verify that the data source belongs to the user's organization
    try {
      const dataSourceResult = await query(
        `SELECT DATA_SOURCE_ID 
         FROM NL2SQL_DASHBOARD_DATASOURCES 
         WHERE DATA_SOURCE_ID = :dataSourceId 
         AND ORG_ID = :organizationId
         AND IS_ACTIVE = 'Y'`,
        [dataSourceId, organizationId]
      );
      
      if (!dataSourceResult || dataSourceResult.length === 0) {
        return NextResponse.json(
          { error: 'Data source not found or access denied' },
          { status: 403 }
        );
      }
    } catch (accessError) {
      console.error('Error verifying access:', accessError);
      return NextResponse.json(
        { error: 'Failed to verify access to data source' },
        { status: 500 }
      );
    }

    // Generate a UUID for the dashboard
    const dashboardUuid = uuidv4();
    
    // Save the dashboard
    try {
      await query(
        `INSERT INTO NL2SQL_SAVED_DASHBOARDS (
          DASHBOARD_UUID,
          DASHBOARD_NAME,
          ORG_ID,
          USER_ID,
          DATA_SOURCE_ID,
          DASHBOARD_CONFIG,
          CREATED_AT,
          UPDATED_AT
        ) VALUES (
          :dashboardUuid,
          :dashboardName,
          :organizationId,
          :userId,
          :dataSourceId,
          :dashboardConfig,
          SYSDATE,
          SYSDATE
        )`,
        [dashboardUuid, dashboardName, organizationId, userId, dataSourceId, dashboardConfig]
      );
      
      // Log user activity
      try {
        await query(
          `INSERT INTO NL2SQL_USER_ACTIVITY (
            USER_ID,
            ORG_ID,
            ACTIVITY_TYPE,
            ACTIVITY_DETAILS,
            ACTIVITY_DATE
          ) VALUES (
            :userId,
            :organizationId,
            'DASHBOARD_CREATED',
            :activityDetails,
            SYSTIMESTAMP
          )`,
          [userId, organizationId, `Created dashboard: ${dashboardName}`]
        );
      } catch (activityError) {
        console.error('Error logging user activity:', activityError);
        // Continue even if activity logging fails
      }
      
      return NextResponse.json({
        success: true,
        message: 'Dashboard saved successfully',
        dashboardUuid
      });
    } catch (saveError) {
      console.error('Error saving dashboard:', saveError);
      return NextResponse.json(
        { error: 'Failed to save dashboard' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in save dashboard API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
