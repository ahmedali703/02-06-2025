import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * API endpoint to fetch available databases for the current user's organization
 */
export async function GET(request: Request) {
  try {
    // // Get userId from query parameters if available
    // const { searchParams } = new URL(request.url);
    // const userId = searchParams.get('userId');
    
    // console.log(`API /databases - Request with userId: ${userId}`);
    
    // // If userId is provided, filter by user's organization
    // if (userId) {
    //   // Get the user's organization ID
    //   console.log(`API /databases - Getting organization for user ${userId}`);
    //   const userResult = await query(
    //     `SELECT "ORG_ID" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
    //     [userId]
    //   );
      
    //   console.log(`API /databases - User query result:`, userResult);
      
    //   if (userResult && userResult.length > 0) {
    //     const orgId = userResult[0].ORG_ID;
    //     console.log(`API /databases - Found orgId: ${orgId} for user ${userId}`);
        
    //     // Fetch databases available to this organization
    //     console.log(`API /databases - Fetching databases for orgId: ${orgId}`);
    //     const databases = await query(
    //       `SELECT 
    //         "ORG_ID", 
    //         "ORG_NAME", 
    //         "DATABASE_TYPE", 
    //         "ORG_STATUS",
    //         "DATABASE_INFO"
    //       FROM 
    //         "NL2SQL_ORG" 
    //       WHERE 
    //         "ORG_ID" = $1
    //       ORDER BY 
    //         "ORG_NAME" ASC`,
    //       [orgId]
    //     );
        
    //     // Log the raw database results for debugging
    //     console.log(`API /databases - Raw database results:`, JSON.stringify(databases, null, 2));
        
    //     console.log(`API /databases - Found ${databases.length} databases for orgId: ${orgId}`);
        
    //     // Process the results to ensure database type is correctly set
    //     for (const db of databases) {
    //       // If DATABASE_INFO exists, check if it contains Oracle connection details
    //       if (db.DATABASE_INFO) {
    //         try {
    //           const dbInfo = JSON.parse(db.DATABASE_INFO);
    //           // If connectString exists, it's an Oracle connection
    //           if (dbInfo.connectString) {
    //             db.DATABASE_TYPE = 'oracle';
    //           } else if (dbInfo.host && dbInfo.port === '5432') {
    //             db.DATABASE_TYPE = 'postgres';
    //           } else if (dbInfo.host && dbInfo.port === '3306') {
    //             db.DATABASE_TYPE = 'mysql';
    //           } else if (dbInfo.server) {
    //             db.DATABASE_TYPE = 'mssql';
    //           }
    //           console.log(`API /databases - Database ${db.ORG_NAME} type set to: ${db.DATABASE_TYPE}`);
    //         } catch (e) {
    //           console.error('Error parsing DATABASE_INFO:', e);
    //         }
    //       }
          
    //       // Remove the DATABASE_INFO from the response to avoid sending sensitive data
    //       delete db.DATABASE_INFO;
    //     }
        
    //     return NextResponse.json(databases);
    //   } else {
    //     console.log(`API /databases - No organization found for user ${userId}`);
    //   }
    // }
    
    // // If no userId or no matching organization, return all available databases
    // console.log(`API /databases - No specific user, fetching all databases`);
    // const databases = await query(
    //   `SELECT 
    //     "ORG_ID", 
    //     "ORG_NAME", 
    //     "DATABASE_TYPE", 
    //     "ORG_STATUS",
    //     "DATABASE_INFO"
    //   FROM 
    //     "NL2SQL_ORG" 
    //   ORDER BY 
    //     "ORG_NAME" ASC`,
    //   []
    // );
    
    // // Log the raw database results for debugging
    // console.log(`API /databases - Raw database results:`, JSON.stringify(databases, null, 2));
    
    // // Process the results to ensure database type is correctly set
    // for (const db of databases) {
    //   // If DATABASE_INFO exists, check if it contains Oracle connection details
    //   if (db.DATABASE_INFO) {
    //     try {
    //       const dbInfo = JSON.parse(db.DATABASE_INFO);
    //       // If connectString exists, it's an Oracle connection
    //       if (dbInfo.connectString) {
    //         db.DATABASE_TYPE = 'oracle';
    //       } else if (dbInfo.host && dbInfo.port === '5432') {
    //         db.DATABASE_TYPE = 'postgres';
    //       } else if (dbInfo.host && dbInfo.port === '3306') {
    //         db.DATABASE_TYPE = 'mysql';
    //       } else if (dbInfo.server) {
    //         db.DATABASE_TYPE = 'mssql';
    //       }
    //     } catch (e) {
    //       console.error('Error parsing DATABASE_INFO:', e);
    //     }
    //   }
      
    //   // Remove the DATABASE_INFO from the response to avoid sending sensitive data
    //   delete db.DATABASE_INFO;
    // }
    
    // return NextResponse.json(databases);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error fetching databases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch databases' },
      { status: 500 }
    );
  }
}