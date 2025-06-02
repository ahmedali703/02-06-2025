import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';
import { Pool } from 'pg';

export async function POST(request: Request) {
  try {
    // Initialize empty data array as default response
    const emptyResponse = {
      rows: [],
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

    // Get user ID from token
    const userId = verifiedToken.userId;
    
    // Get request body
    const body = await request.json();
    const { dataSourceId, sql: sqlQuery } = body;
    
    if (!dataSourceId || !sqlQuery) {
      return NextResponse.json(
        { error: 'Data source ID and SQL query are required', ...emptyResponse },
        { status: 400 }
      );
    }
    
    // Get user's organization ID and verify access to data source
    let organizationId = null;
    
    try {
      const userResult = await query(
        'SELECT u."ORG_ID" FROM "NL2SQL_USERS" u WHERE u."ID" = $1',
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
      
      // Verify that the data source belongs to the user's organization and is active
      const dataSourceResult = await query(
        `SELECT "DATA_SOURCE_ID" 
         FROM "NL2SQL_DASHBOARD_DATASOURCES" 
         WHERE "DATA_SOURCE_ID" = $1 
         AND "ORG_ID" = $2
         AND "IS_ACTIVE" = 'Y'`,
        [dataSourceId, organizationId]
      );
      
      if (!dataSourceResult || dataSourceResult.length === 0) {
        return NextResponse.json(
          { error: 'Data source not found or access denied', ...emptyResponse },
          { status: 403 }
        );
      }
    } catch (accessError) {
      console.error('Error verifying access:', accessError);
      return NextResponse.json(
        { error: 'Failed to verify access to data source', ...emptyResponse },
        { status: 500 }
      );
    }

    // Get connection info for the data source
    let connectionInfo;
    try {
      const connectionResult = await query(
        `SELECT "CONNECTION_INFO" FROM "NL2SQL_DATA_SOURCES" WHERE "ID" = $1 AND "ORG_ID" = $2`,
        [dataSourceId, organizationId]
      );
      
      if (connectionResult && connectionResult.length > 0) {
        connectionInfo = JSON.parse(connectionResult[0].CONNECTION_INFO);
      } else {
        return NextResponse.json(
          { error: 'Data source connection information not found', ...emptyResponse },
          { status: 404 }
        );
      }
    } catch (connError) {
      console.error('Error fetching connection info:', connError);
      return NextResponse.json(
        { error: 'Failed to retrieve connection information', ...emptyResponse },
        { status: 500 }
      );
    }

    // Ensure connectionInfo is not null or undefined before proceeding
    if (!connectionInfo) {
      return NextResponse.json(
        { error: 'Invalid connection information for data source', ...emptyResponse },
        { status: 500 }
      );
    }

    // Use the fetched connectionInfo to create a new pool and execute the query
    const pool = new Pool(connectionInfo);
    const client = await pool.connect();
    
    try {
      // Log query execution for analytics
      await query(
        `INSERT INTO NL2SQL_QUERIES (
          ORG_ID, 
          USER_ID, 
          QUERY_TEXT, 
          SQL_GENERATED, 
          EXECUTION_STATUS,
          EXECUTION_DATE
        ) VALUES (
          :organizationId,
          :userId,
          'Dashboard Chart Query',
          :sqlQuery,
          'PENDING',
          SYSTIMESTAMP
        )`,
        [organizationId, userId, sqlQuery]
      );
      
      // Execute the query
      const result = await client.query(sqlQuery); // Execute user's query
      
      // Update query status
      // In a real implementation, you would update the status based on the result
      
      // Return the result
      // The 'pg' client.query() result object has a 'rows' property
      if (result && result.rows) {
        return NextResponse.json({
          rows: result.rows
        });
      } else {
        // Should ideally not happen if query executes but returns no 'rows' structure
        return NextResponse.json(emptyResponse);
      }
    } catch (error: any) {
      console.error('Error in POST /api/dashboard/execute-query:', error);
      // Log the query that caused the error, but be careful with sensitive data
      // console.error('Failed SQL Query:', sqlQuery);
      
      // Log query failure
      try {
        await query(
          `UPDATE NL2SQL_QUERIES 
           SET EXECUTION_STATUS = 'FAILED', 
               ERROR_MESSAGE = :errorMessage
           WHERE ORG_ID = :organizationId 
           AND USER_ID = :userId 
           AND SQL_GENERATED = :sqlQuery 
           AND EXECUTION_DATE = (
             SELECT MAX(EXECUTION_DATE) 
             FROM NL2SQL_QUERIES 
             WHERE ORG_ID = :organizationId 
             AND USER_ID = :userId 
             AND SQL_GENERATED = :sqlQuery
           )`,
          [error.message || 'Unknown error', organizationId, userId, sqlQuery, organizationId, userId, sqlQuery]
        );
      } catch (logError) {
        console.error('Error logging query failure:', logError);
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to execute query due to an internal error', ...emptyResponse },
        { status: 500 }
      );
    } finally {
      client.release();
      await pool.end(); // Important to close the dynamically created pool
    }
  } catch (error) {
    console.error('Error in execute-query API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', rows: [] },
      { status: 500 }
    );
  }
}
