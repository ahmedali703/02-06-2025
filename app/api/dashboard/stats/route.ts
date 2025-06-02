// app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '@/lib/auth';
import { cookies } from "next/headers";
import { query } from "@/lib/db";

// Interface for the activity record returned from the database
interface ActivityRecord {
  ID: number;
  QUERY_TEXT: string;
  SQL_GENERATED: string | null;
  EXECUTION_STATUS: string;
  EXECUTION_TIME: number | null;
  ROWS_RETURNED: number | null;
  EXECUTION_DATE: string;
  USER_ID: number;
  USER_EMAIL: string | null;
  USER_FULL_NAME?: string;
}

// Helper function to sanitize circular references in objects
function sanitizeForJSON(obj: any): any {
  // For null, undefined, or primitive types, return as is
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle circular references by creating a new object with only serializable properties
  const seen = new WeakSet();
  
  function sanitize(data: any): any {
    // Short-circuit for null or primitives
    if (data === null || data === undefined || typeof data !== 'object') {
      return data;
    }
    
    // Detect circular references
    if (seen.has(data)) {
      return "[Circular Reference]";
    }
    
    // Add this object to our seen set
    seen.add(data);
    
    // Handle Date objects - convert to ISO string
    if (data instanceof Date) {
      return data.toISOString();
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => sanitize(item));
    }
    
    // Skip special Oracle DB objects or objects with special constructors
    const constructor = data.constructor?.name;
    if (constructor && constructor !== 'Object' && constructor !== 'Array') {
      if (constructor === 'NVPair' || constructor.startsWith('Oracle')) {
        return "[Oracle Object]";
      }
    }
    
    // Process normal objects
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Skip functions, symbols, and other non-serializable types
        if (typeof data[key] !== 'function' && typeof data[key] !== 'symbol') {
          try {
            result[key] = sanitize(data[key]);
          } catch (err) {
            // If any error occurs, replace with placeholder
            result[key] = "[Non-serializable data]";
          }
        }
      }
    }
    
    return result;
  }
  
  return sanitize(obj);
}

// PostgreSQL results are already in the correct format, so no conversion is needed

export const GET = async (req: NextRequest) => {
  try {
    console.log("Dashboard stats API called");
    
    // Fix: Await the Promise to get the actual userId value
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Dashboard Stats: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Dashboard Stats: UserId found:", userId);
    
    let orgId: number | null = null;
    
    try {
      console.log("Dashboard Stats: Preparing to fetch data");

      // Get organization ID for the user using PostgreSQL
      const userResult = await query(
        `SELECT "ORG_ID", "NAME", "EMAIL" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
        [userId]
      );
      
      if (userResult && userResult.length > 0) {
        orgId = userResult[0].ORG_ID;
        const userName = userResult[0].NAME;
        const userEmail = userResult[0].EMAIL;
        console.log("Dashboard Stats: Found orgId:", orgId);
        console.log("Dashboard Stats: User name:", userName);
        
        // If user has no organization ID, check if we should create a default one
        if (!orgId) {
          console.log("Dashboard Stats: User has no organization ID. Checking if default should be created.");
          
          // For users without organization, consider creating a default one
          // or showing a special onboarding message
          const defaultData = {
            stats: {
              totalQueries: 0,
              successfulQueries: 0,
              failedQueries: 0,
              successRate: 0,
              organizationUsers: 1,
              activeUsers: 1,
              totalTables: 0,
            },
            recentActivity: [],
            performance: [],
            recentInvoices: [],
            organization: { 
              ORG_NAME: userName ? `${userName}'s Organization` : "Your Organization", 
              ORG_STATUS: "Y", 
              DATABASE_TYPE: "oracle",
              CREATED_AT: new Date().toISOString()
            },
            subscription: null,
            needsOnboarding: true,
            userName: userName,
            userEmail: userEmail
          };
          
          return NextResponse.json(defaultData, { 
            status: 200,
            headers: { 
              'X-Data-Status': 'default',
              'X-Needs-Onboarding': 'true' 
            }
          });
        }
      } else {
        console.log("Dashboard Stats: User not found in database");
        
        // Default data when user not found
        const defaultData = {
          stats: {
            totalQueries: 0,
            successfulQueries: 0,
            failedQueries: 0,
            successRate: 0,
            organizationUsers: 0,
            activeUsers: 0,
            totalTables: 0,
          },
          recentActivity: [],
          performance: [],
          recentInvoices: [],
          organization: { 
            ORG_NAME: "Your Organization", 
            ORG_STATUS: "Y", 
            DATABASE_TYPE: "oracle",
            CREATED_AT: new Date().toISOString()
          },
          subscription: null,
          error: "User data not found"
        };
        
        return NextResponse.json(defaultData, { 
          status: 200,
          headers: { 'X-Data-Status': 'default' }
        });
      }


      // Run queries inside a separate try/catch to handle query errors
      let dashboardData;
      try {
        // Fetch query statistics
        const statsResult = await query(
          `SELECT 
            COUNT(*) AS "TOTAL_QUERIES",
            SUM(CASE WHEN "EXECUTION_STATUS" = 'SUCCESS' THEN 1 ELSE 0 END) AS "SUCCESSFUL_QUERIES",
            SUM(CASE WHEN "EXECUTION_STATUS" != 'SUCCESS' THEN 1 ELSE 0 END) AS "FAILED_QUERIES",
            ROUND(SUM(CASE WHEN "EXECUTION_STATUS" = 'SUCCESS' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)::numeric * 100, 1) AS "SUCCESS_RATE"
          FROM "NL2SQL_QUERIES"
          WHERE "ORG_ID" = $1`,
          [orgId]
        );

        const statsRows = statsResult;
        console.log("Dashboard Stats: Query stats fetched successfully");

        // Fetch user statistics
        const userStatsResult = await query(
          `SELECT 
            COUNT(*) AS "TOTAL_USERS",
            SUM(CASE WHEN EXISTS (
              SELECT 1 FROM "NL2SQL_USER_ACTIVITY" 
              WHERE "USER_ID" = u."ID" 
              AND "ACTIVITY_DATE" > NOW() - INTERVAL '7 days'
            ) THEN 1 ELSE 0 END) AS "ACTIVE_USERS"
          FROM "NL2SQL_USERS" u
          WHERE "ORG_ID" = $1`,
          [orgId]
        );

        const userStatsRows = userStatsResult;
        console.log("Dashboard Stats: User stats fetched successfully");

        // Fetch table count for the organization
        const tableCountResult = await query(
          `SELECT 
            COUNT(*) AS "TOTAL_TABLES"
          FROM "NL2SQL_AVAILABLE_TABLES"
          WHERE "ORG_ID" = $1 AND "IS_ACTIVE" = 'Y'`,
          [orgId]
        );

        const tableCountRows = tableCountResult;
        console.log("Dashboard Stats: Table count fetched successfully");

        // Fetch recent activity
        const recentActivityResult = await query(
          `SELECT 
            q."ID",
            q."QUERY_TEXT",
            q."SQL_GENERATED",
            q."EXECUTION_STATUS",
            q."EXECUTION_TIME",
            q."ROWS_RETURNED",
            q."EXECUTION_DATE",
            u."ID" AS "USER_ID",
            u."EMAIL" AS "USER_EMAIL",
            u."NAME" AS "USER_FULL_NAME"
          FROM "NL2SQL_QUERIES" q
          JOIN "NL2SQL_USERS" u ON q."USER_ID" = u."ID"
          WHERE q."ORG_ID" = $1
          ORDER BY q."EXECUTION_DATE" DESC
          LIMIT 5`,
          [orgId]
        );

        const recentActivityRows = recentActivityResult;
        console.log("Dashboard Stats: Recent activity fetched successfully");

        // Process the results to format user names - now with explicit typing
        const processedRecentActivity = recentActivityRows 
          ? recentActivityRows.map((activity: any) => {
              return {
                ...activity,
                // Use full name if available, otherwise create a username from the email
                USER_NAME: activity.USER_FULL_NAME || (activity.USER_EMAIL ? activity.USER_EMAIL.split('@')[0] : `User ${activity.USER_ID}`)
              };
            })
          : [];

        // Fetch performance data for charts - initially empty if no data
        let performanceRows = [];
        try {
          const performanceResult = await query(
            `SELECT 
              TO_CHAR("DATE_PERIOD"::timestamp, 'YYYY-MM-DD') AS "DATE_PERIOD",
              "TOTAL_QUERIES",
              "SUCCESSFUL_QUERIES",
              "FAILED_QUERIES",
              "AVG_EXECUTION_TIME"
            FROM "NL2SQL_QUERY_PERFORMANCE"
            WHERE "ORG_ID" = $1
            AND "PERIOD_TYPE" = 'daily'
            ORDER BY "DATE_PERIOD"
            LIMIT 14`,
            [orgId]
          );
          
          if (performanceResult) {
            performanceRows = performanceResult;
          }

          console.log("Dashboard Stats: Performance data fetched successfully");
        } catch (error) {
          console.error("Performance data fetch error (non-critical):", error);
          // Continue execution even if this query fails
        }

        // Fetch recent invoices - initially empty if no data
        let invoiceRows = [];
        try {
          const invoicesResult = await query(
            `SELECT 
              i."INVOICE_NUMBER",
              i."TOTAL_AMOUNT" AS "AMOUNT",
              i."STATUS",
              TO_CHAR(i."INVOICE_DATE"::timestamp, 'YYYY-MM-DD') AS "INVOICE_DATE"
            FROM "NL2SQL_INVOICES" i
            WHERE i."ORG_ID" = $1
            ORDER BY i."INVOICE_DATE" DESC
            LIMIT 3`,
            [orgId]
          );
          
          if (invoicesResult) {
            invoiceRows = invoicesResult;
          }

          console.log("Dashboard Stats: Invoices data fetched successfully");
        } catch (error) {
          console.error("Invoices data fetch error (non-critical):", error);
          // Continue execution even if this query fails
        }

        // Fetch organization data
        let orgData = {};
        try {
          const orgResult = await query(
            `SELECT 
              "ORG_ID",
              "ORG_NAME",
              "ORG_STATUS",
              "DATABASE_TYPE",
              TO_CHAR("CREATED_AT", 'YYYY-MM-DD') AS "CREATED_AT"
            FROM "NL2SQL_ORG"
            WHERE "ORG_ID" = $1`,
            [orgId]
          );

          if (orgResult && orgResult.length > 0) {
            orgData = orgResult[0];
          }

          console.log("Dashboard Stats: Organization data fetched successfully");
        } catch (error) {
          console.error("Organization data fetch error:", error);
          orgData = { 
            ORG_ID: orgId,
            ORG_NAME: "Your Organization", 
            ORG_STATUS: "Y", 
            DATABASE_TYPE: "oracle",
            CREATED_AT: new Date().toISOString()
          };
        }

        // Fetch active subscription - initially null if no data
        let subscriptionRow = null;
        try {
          const subscriptionResult = await query(
            `SELECT 
              s."ID",
              p.plan_name,
              p.price_monthly
            FROM "NL2SQL_SUBSCRIPTIONS" s
            JOIN nl2sql_plans p ON s."PLAN_ID" = p.id
            WHERE s."ORG_ID" = $1
            AND s."STATUS" = 'ACTIVE'
            AND s."END_DATE" >= NOW()
            ORDER BY s."END_DATE" DESC
            LIMIT 1`,
            [orgId]
          );
          
          if (subscriptionResult && subscriptionResult.length > 0) {
            subscriptionRow = subscriptionResult[0];
          }

          console.log("Dashboard Stats: Subscription data fetched successfully");
        } catch (error) {
          console.error("Subscription data fetch error (non-critical):", error);
          // Continue execution even if this query fails
        }

        // Fetch user details
        let userData = {};
        try {
          const userDetailResult = await query(
            `SELECT 
              "ID",
              "NAME",
              "EMAIL", 
              "ROLE"
            FROM "NL2SQL_USERS"
            WHERE "ID" = $1`,
            [userId]
          );
          
          if (userDetailResult && userDetailResult.length > 0) {
            userData = userDetailResult[0];
          }

          console.log("Dashboard Stats: User data fetched successfully");
        } catch (error) {
          console.error("User data fetch error (non-critical):", error);
          // Provide minimal user data if fetch fails
          userData = { ID: userId };
        }
        
        // Check if the user has completed onboarding
        let hasCompletedOnboarding = false;
        try {
          const onboardingResult = await query(
            `SELECT "HAS_COMPLETED_ONBOARDING" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
            [userId]
          );
          
          if (onboardingResult && onboardingResult.length > 0) {
            hasCompletedOnboarding = onboardingResult[0].HAS_COMPLETED_ONBOARDING;
          }
          console.log("Dashboard Stats: Onboarding status fetched", hasCompletedOnboarding);
        } catch (error) {
          console.error("Error fetching onboarding status:", error);
        }

        // Combine all results into a plain JS object
        dashboardData = {
          stats: {
            totalQueries: Number(statsRows?.[0]?.TOTAL_QUERIES) || 0,
            successfulQueries: Number(statsRows?.[0]?.SUCCESSFUL_QUERIES) || 0,
            failedQueries: Number(statsRows?.[0]?.FAILED_QUERIES) || 0,
            successRate: Number(statsRows?.[0]?.SUCCESS_RATE) || 0,
            organizationUsers: Number(userStatsRows?.[0]?.TOTAL_USERS) || 0,
            activeUsers: Number(userStatsRows?.[0]?.ACTIVE_USERS) || 0,
            totalTables: Number(tableCountRows?.[0]?.TOTAL_TABLES) || 0,
          },
          recentActivity: processedRecentActivity || [],
          performance: performanceRows || [],
          recentInvoices: invoiceRows || [],
          organization: orgData,
          subscription: subscriptionRow,
          user: userData,
          needsOnboarding: !hasCompletedOnboarding
        };
        
        console.log("Dashboard Stats: All data combined successfully");
      } catch (queryError) {
        console.error("Dashboard Stats: Error in fetching data:", queryError);
        
        // Use default data if queries fail
        dashboardData = {
          stats: {
            totalQueries: 0,
            successfulQueries: 0,
            failedQueries: 0,
            successRate: 0,
            organizationUsers: 0,
            activeUsers: 0,
            totalTables: 0,
          },
          recentActivity: [],
          performance: [],
          recentInvoices: [],
          organization: { 
            ORG_ID: orgId,
            ORG_NAME: "Your Organization", 
            ORG_STATUS: "Y", 
            DATABASE_TYPE: "oracle",
            CREATED_AT: new Date().toISOString()
          },
          subscription: null,
          error: "Error fetching dashboard data"
        };
      }

      // Sanitize the data to remove any circular references
      const sanitizedData = sanitizeForJSON(dashboardData);

      // Add headers for tracking
      const headers = new Headers();
      headers.set('X-User-Id', userId.toString());
      headers.set('X-Org-Id', orgId ? orgId.toString() : 'none');
      
      return NextResponse.json(sanitizedData, { 
        status: 200,
        headers
      });
    } finally {
      // PostgreSQL connections are handled by the query function
      console.log("Dashboard Stats: Request completed");
    }
  } catch (error) {
    console.error("Dashboard stats error:", error);
    
    // Return default data in case of error
    const fallbackData = {
      stats: {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        successRate: 0,
        organizationUsers: 1,
        activeUsers: 1,
        totalTables: 0,
      },
      recentActivity: [],
      performance: [],
      recentInvoices: [],
      organization: { 
        ORG_NAME: "Your Organization", 
        ORG_STATUS: "Y", 
        DATABASE_TYPE: "oracle",
        CREATED_AT: new Date().toISOString()
      },
      subscription: null,
      fallbackUsed: true,
      needsOnboarding: true
    };
    
    return NextResponse.json(fallbackData, { 
      status: 200,
      headers: { 'X-Error-Fallback': 'true' }
    });
  }
};