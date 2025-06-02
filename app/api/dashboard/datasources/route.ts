import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Initialize empty data array as default response
    const emptyResponse = {
      dataSources: [],
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
          { error: 'User not found', ...emptyResponse },
          { status: 404 }
        );
      }
    } catch (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data', ...emptyResponse },
        { status: 500 }
      );
    }

    // Query to get databases for the organization (same as sidebar)
    const dataSourcesQuery = `
      SELECT 
        ORG_ID as DATA_SOURCE_ID,
        ORG_NAME as DATA_SOURCE_NAME,
        DATABASE_TYPE as DB_TYPE,
        DATABASE_INFO
      FROM 
        NL2SQL_ORG 
      WHERE 
        ORG_ID = :organizationId
        AND ORG_STATUS = true
      ORDER BY 
        ORG_NAME
    `;
    
    // Default to empty array
    let dataSources = [];
    
    try {
      const result = await query(dataSourcesQuery, [organizationId]);
      
      // Process the results to ensure database type is correctly set
      for (const db of result) {
        // If DATABASE_INFO exists, check if it contains Oracle connection details
        if (db.DATABASE_INFO) {
          try {
            const dbInfo = JSON.parse(db.DATABASE_INFO);
            // If connectString exists, it's an Oracle connection
            if (dbInfo.connectString) {
              db.DB_TYPE = 'oracle';
            } else if (dbInfo.host && dbInfo.port === '5432') {
              db.DB_TYPE = 'postgres';
            } else if (dbInfo.host && dbInfo.port === '3306') {
              db.DB_TYPE = 'mysql';
            } else if (dbInfo.server) {
              db.DB_TYPE = 'mssql';
            }
          } catch (e) {
            console.error('Error parsing DATABASE_INFO:', e);
          }
        }
        
        // Remove the DATABASE_INFO from the response to avoid sending sensitive data
        delete db.DATABASE_INFO;
      }
      
      // If no data sources found for the organization, fetch all available databases
      if (!result || result.length === 0) {
        console.log('No data sources found for organization, fetching all available databases');
        
        // Fetch all available databases as fallback
        const allDatabasesQuery = `
          SELECT 
            ORG_ID as DATA_SOURCE_ID,
            ORG_NAME as DATA_SOURCE_NAME,
            DATABASE_TYPE as DB_TYPE,
            DATABASE_INFO
          FROM 
            NL2SQL_ORG 
          WHERE 
            ORG_STATUS = true
          ORDER BY 
            ORG_NAME
        `;
        
        const allDbResult = await query(allDatabasesQuery);
        if (allDbResult && allDbResult.length > 0) {
          // Process the results to ensure database type is correctly set
          for (const db of allDbResult) {
            // If DATABASE_INFO exists, check if it contains Oracle connection details
            if (db.DATABASE_INFO) {
              try {
                const dbInfo = JSON.parse(db.DATABASE_INFO);
                // If connectString exists, it's an Oracle connection
                if (dbInfo.connectString) {
                  db.DB_TYPE = 'oracle';
                } else if (dbInfo.host && dbInfo.port === '5432') {
                  db.DB_TYPE = 'postgres';
                } else if (dbInfo.host && dbInfo.port === '3306') {
                  db.DB_TYPE = 'mysql';
                } else if (dbInfo.server) {
                  db.DB_TYPE = 'mssql';
                }
              } catch (e) {
                console.error('Error parsing DATABASE_INFO:', e);
              }
            }
            
            // Remove the DATABASE_INFO from the response to avoid sending sensitive data
            delete db.DATABASE_INFO;
          }
          dataSources = Array.isArray(allDbResult) ? allDbResult : [];
        }
      } else {
        dataSources = Array.isArray(result) ? result : [];
      }
    } catch (queryError) {
      console.error('Database query error:', queryError);
      // Continue with empty array on error
    }

    // Always return a valid response with an array
    return NextResponse.json({
      dataSources
    });
    
  } catch (error) {
    console.error('Error fetching data sources:', error);
    // Return empty array on any error
    return NextResponse.json({
      error: 'Failed to fetch data sources',
      dataSources: []
    }, { status: 500 });
  }
}
