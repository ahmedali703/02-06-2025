import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '@/lib/auth';
import { safelyConvertRowsToObjects } from '@/lib/utils';
import { 
  queryWithOrgConnection, 
  getOrgConnectionDetails,
  query as dbQuery 
} from '@/lib/db';
import { optimizeSQLQuery, evaluateSQLQuery } from '@/lib/optimizer';

// Type للـ orgId الذي يمكن أن يكون null
type OrgIdType = number | null;

/**
 * Function لضمان استرجاع البيانات كنص
 */
function ensureString(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  // Handle Buffer objects
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }
  
  // Handle ArrayBuffer or TypedArray
  if (
    value instanceof ArrayBuffer || 
    value instanceof Uint8Array ||
    value instanceof Int8Array ||
    value instanceof Uint16Array ||
    value instanceof Int16Array ||
    value instanceof Uint32Array ||
    value instanceof Int32Array
  ) {
    return new TextDecoder().decode(value);
  }
  
  // Handle objects with type and data properties
  if (typeof value === 'object' && value !== null && 'type' in value && 'data' in value) {
    if (Array.isArray(value.data)) {
      try {
        const buffer = Buffer.from(value.data);
        return buffer.toString('utf8');
      } catch (e) {
        return '[Binary Data]';
      }
    }
    return '[Complex Binary Object]';
  }
  
  // General object handling
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return '[Complex Object]';
    }
  }
  
  // Any other type
  return String(value);
}

/**
 * Function لإزالة التعليقات من بداية الاستعلام
 */
function stripLeadingComments(query: string): string {
  const lines = query.split('\n').map((line) => line.trim());
  const nonCommentLines = lines.filter(
    (line) => line && !line.startsWith('--')
  );
  return nonCommentLines.join(' ').trim();
}

/**
 * Function لتنسيق النتائج للعرض
 */
function formatResults(data: any[]): any[] {
  return data.map((row: any) => {
    const formattedRow = { ...row };
    Object.keys(formattedRow).forEach((key) => {
      // تنسيق التواريخ
      if (formattedRow[key] instanceof Date) {
        formattedRow[key] = formattedRow[key].toLocaleDateString();
      }
      // تنسيق الأرقام بين 1000 و 9999
      if (
        typeof formattedRow[key] === 'number' &&
        formattedRow[key] >= 1000 &&
        formattedRow[key] <= 9999
      ) {
        formattedRow[key] = formattedRow[key].toString();
      }
      // تقريب الأرقام العشرية
      if (
        typeof formattedRow[key] === 'number' &&
        !Number.isInteger(formattedRow[key])
      ) {
        formattedRow[key] = Number(formattedRow[key].toFixed(2));
      }
    });
    return formattedRow;
  });
}

/**
 * Function لحفظ الاستعلام في قاعدة البيانات
 */
async function saveQuery(
  orgId: number,
  userId: number,
  queryText: string,
  sqlGenerated: string,
  executionStatus: string,
  errorMessage: string | null,
  executionTime: number,
  rowsReturned: number
): Promise<void> {
  try {
    console.log(`Saving query for user ${userId}, org ${orgId}`);
    
    await dbQuery(
      `INSERT INTO "NL2SQL_QUERIES" (
        "ORG_ID", "USER_ID", "QUERY_TEXT", "SQL_GENERATED", 
        "EXECUTION_STATUS", "ERROR_MESSAGE", "EXECUTION_TIME", 
        "ROWS_RETURNED", "EXECUTION_DATE", "CREATED_AT"
      ) VALUES (
        $1, $2, $3, $4, 
        $5, $6, $7, 
        $8, NOW(), NOW()
      )`,
      [
        orgId, 
        userId, 
        queryText || "Re-executed query", 
        sqlGenerated, 
        executionStatus, 
        errorMessage, 
        executionTime, 
        rowsReturned
      ]
    );
    
    console.log('Query saved successfully');
  } catch (error) {
    console.error('Error saving query:', error);
  }
}

/**
 * تحديث إحصائيات أداء الاستعلامات
 */
async function updateQueryPerformance(
  orgId: number,
  isSuccessful: boolean,
  executionTime: number
): Promise<void> {
  try {
    // الحصول على التاريخ الحالي بتنسيق YYYY-MM-DD
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    console.log(`Updating query performance for org ${orgId}, date ${currentDate.toISOString()}`);
    
    // التحقق من وجود سجل لليوم الحالي
    const existingRecord = await dbQuery(
      `SELECT "ID" FROM "NL2SQL_QUERY_PERFORMANCE" 
       WHERE "ORG_ID" = $1 
       AND DATE_TRUNC('day', "DATE_PERIOD") = DATE_TRUNC('day', $2) 
       AND "PERIOD_TYPE" = 'daily'`,
      [orgId, currentDate]
    );
    
    if (existingRecord && existingRecord.length > 0) {
      // تحديث السجل الموجود
      await dbQuery(
        `UPDATE "NL2SQL_QUERY_PERFORMANCE" 
         SET 
           "TOTAL_QUERIES" = "TOTAL_QUERIES" + 1,
           "SUCCESSFUL_QUERIES" = "SUCCESSFUL_QUERIES" + $1,
           "FAILED_QUERIES" = "FAILED_QUERIES" + $2,
           "AVG_EXECUTION_TIME" = (("AVG_EXECUTION_TIME" * "TOTAL_QUERIES") + $3) / ("TOTAL_QUERIES" + 1),
           "UPDATED_AT" = NOW()
         WHERE "ORG_ID" = $4 
         AND DATE_TRUNC('day', "DATE_PERIOD") = DATE_TRUNC('day', $5) 
         AND "PERIOD_TYPE" = 'daily'`,
        [
          isSuccessful ? 1 : 0,
          isSuccessful ? 0 : 1,
          executionTime,
          orgId,
          currentDate
        ]
      );
      console.log('Updated existing performance record');
    } else {
      // إنشاء سجل جديد
      await dbQuery(
        `INSERT INTO "NL2SQL_QUERY_PERFORMANCE" (
          "ORG_ID", "DATE_PERIOD", "PERIOD_TYPE", "TOTAL_QUERIES",
          "SUCCESSFUL_QUERIES", "FAILED_QUERIES", "AVG_EXECUTION_TIME",
          "CREATED_AT", "UPDATED_AT"
        ) VALUES (
          $1, $2, 'daily', 1,
          $3, $4, $5,
          NOW(), NOW()
        )`,
        [
          orgId,
          currentDate,
          isSuccessful ? 1 : 0,
          isSuccessful ? 0 : 1,
          executionTime
        ]
      );
      console.log('Created new performance record');
    }
    
    console.log('Query performance updated successfully');
  } catch (error) {
    console.error('Error updating query performance:', error);
  }
}

/**
 * API endpoint لتنفيذ استعلام SQL مباشرة
 */
export async function POST(req: NextRequest) {
  try {
    console.log("Execute Query API called");
    
    // الحصول على معرّف المستخدم
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Execute Query: No userId found");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    // تحليل جسم الطلب
    const body = await req.json();
    const { sqlQuery: rawSqlQuery, queryId } = body;
    
    // التأكد من أن استعلام SQL هو سلسلة نصية مناسبة
    const sqlQuery = ensureString(rawSqlQuery);
    
    if (!sqlQuery || sqlQuery.trim() === '') {
      console.error("Execute Query: Empty or invalid SQL query provided");
      return NextResponse.json({ 
        error: "SQL query is required",
        message: "A valid SQL query must be provided"
      }, { status: 400 });
    }

    console.log(`Execute Query: Query ID ${queryId}, User ID ${userId}`);
    console.log(`Execute Query: Raw SQL length: ${rawSqlQuery ? (typeof rawSqlQuery === 'string' ? rawSqlQuery.length : 'not a string') : 'undefined'}`);
    console.log(`Execute Query: Processed SQL (first 100 chars): ${sqlQuery.substring(0, 100)}`);
    
    // الحصول على معرّف المؤسسة
    let orgId: OrgIdType = null;
    
    try {
      // الحصول على معرّف المؤسسة للمستخدم
      const userResult = await dbQuery(
        `SELECT "ORG_ID" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
        [userId]
      );
      
      if (userResult && userResult.length > 0) {
        orgId = userResult[0].ORG_ID;
        console.log("Execute Query: Found orgId:", orgId);
      } else {
        return NextResponse.json({ 
          error: "User not found or has no organization"
        }, { status: 404 });
      }

      // تنظيف والتحقق من صحة استعلام SQL
      let cleanedQuery = sqlQuery.trim().replace(/;+\s*$/, '');
      const lowercaseQuery = stripLeadingComments(cleanedQuery).toLowerCase();
      
      // السماح فقط باستعلامات SELECT لأسباب أمنية
      if (!lowercaseQuery.startsWith('select') && !lowercaseQuery.startsWith('with')) {
        return NextResponse.json({ 
          error: "Only SELECT queries are allowed for direct execution",
          message: "For security reasons, only SELECT and WITH (CTE) queries are allowed."
        }, { status: 400 });
      }
      
      // التحقق من أمان الاستعلام للوقاية من هجمات حقن SQL
      if (
        lowercaseQuery.includes('drop ') || 
        lowercaseQuery.includes('delete ') || 
        lowercaseQuery.includes('update ') || 
        lowercaseQuery.includes('insert ') || 
        lowercaseQuery.includes('alter ') || 
        lowercaseQuery.includes('truncate ') || 
        lowercaseQuery.includes('exec ') || 
        lowercaseQuery.includes('execute ')
      ) {
        return NextResponse.json({ 
          error: "Potentially unsafe query detected",
          message: "The provided query contains potentially unsafe operations."
        }, { status: 400 });
      }
      
      // محاولة تحسين الاستعلام (مثل runGenerateSQLQuery)
      try {
        const optimizedQuery = await optimizeSQLQuery(cleanedQuery);
        console.log("Execute Query: Optimized SQL:", optimizedQuery);
        cleanedQuery = optimizedQuery;
      } catch (optimizeError) {
        console.warn("Execute Query: Could not optimize query:", optimizeError);
        // متابعة باستخدام الاستعلام الأصلي في حالة فشل التحسين
      }
      
      console.log("Execute Query: Executing SQL:", cleanedQuery);
      
      // تنفيذ الاستعلام
      const startTime = Date.now();
      let result;
      
      // تنفيذ الاستعلام باستخدام معلومات الاتصال المناسبة
      if (orgId !== null) {
        // الحصول على تفاصيل الاتصال بالمؤسسة
        const orgDetails = await getOrgConnectionDetails(orgId);
        
        if (orgDetails) {
          console.log(`Execute Query: Using org connection for execution, orgId: ${orgId}`);
          try {
            result = await queryWithOrgConnection(
              orgId, 
              orgDetails, 
              cleanedQuery, 
              []
            );
          } catch (queryError) {
            console.error("Error executing query with org connection:", queryError);
            throw queryError;
          }
        } else {
          console.log("Execute Query: No org details found, using default connection");
          result = await dbQuery(cleanedQuery, []);
        }
      } else {
        console.log("Execute Query: No orgId available, using default connection");
        result = await dbQuery(cleanedQuery, []);
      }
      
      const executionTime = Date.now() - startTime;
      
      console.log(`Execute Query: Query executed in ${executionTime}ms, processing results...`);
      
      // تنسيق النتائج (مماثل لـ runGenerateSQLQuery)
      let formattedRows;
      if (Array.isArray(result)) {
        formattedRows = formatResults(result);
      } else {
        // في حالة عدم كون النتيجة مصفوفة
        formattedRows = formatResults([]);
      }
      
      // استخراج أسماء الأعمدة
      const columns = formattedRows.length > 0 ? Object.keys(formattedRows[0]) : [];
      
      console.log(`Execute Query: Formatted ${formattedRows.length} rows with ${columns.length} columns`);
      
      // تسجيل تنفيذ الاستعلام في قاعدة البيانات
      if (queryId && orgId !== null) {
        try {
          // تحديث سجل الاستعلام الأصلي بإحصائيات التنفيذ الجديدة
          await dbQuery(
            `UPDATE "NL2SQL_QUERIES" 
             SET 
               "EXECUTION_STATUS" = 'SUCCESS',
               "EXECUTION_TIME" = $1,
               "ROWS_RETURNED" = $2,
               "EXECUTION_DATE" = NOW()
             WHERE "ID" = $3 AND "ORG_ID" = $4`,
            [
              executionTime,
              formattedRows.length,
              queryId,
              orgId
            ]
          );
          
          // إضافة سجل نشاط لهذا التنفيذ
          await dbQuery(
            `INSERT INTO "NL2SQL_USER_ACTIVITY" (
              "USER_ID", "ORG_ID", "ACTIVITY_TYPE", "ACTIVITY_DETAILS", "ACTIVITY_DATE"
            ) VALUES (
              $1, $2, 'EXECUTE_QUERY', 'Re-executed query ID: ' || $3, NOW()
            )`,
            [userId, orgId, queryId]
          );
          
          // تحديث إحصائيات أداء الاستعلامات
          if (orgId !== null) {
            await updateQueryPerformance(orgId, true, executionTime / 1000); // تحويل إلى ثوانٍ
          }
          
          console.log("Execute Query: Updated query record and added activity log");
        } catch (logError) {
          console.error("Error logging query execution:", logError);
          // متابعة حتى في حالة فشل التسجيل
        }
      }
      
      // إعادة النتائج
      return NextResponse.json({
        success: true,
        columns,
        rows: formattedRows,
        executionTime,
        message: "Query executed successfully"
      }, { status: 200 });
      
    } catch (error: any) {
      console.error("Error executing query:", error);
      
      // محاولة تسجيل الفشل إذا كان لدينا معرّف استعلام
      if (queryId && orgId !== null) {
        try {
          await dbQuery(
            `UPDATE "NL2SQL_QUERIES" 
             SET 
               "EXECUTION_STATUS" = 'FAILED',
               "EXECUTION_DATE" = NOW()
             WHERE "ID" = $1 AND "ORG_ID" = $2`,
            [queryId, orgId]
          );
          
          await dbQuery(
            `INSERT INTO "NL2SQL_USER_ACTIVITY" (
              "USER_ID", "ORG_ID", "ACTIVITY_TYPE", "ACTIVITY_DETAILS", "ACTIVITY_DATE"
            ) VALUES (
              $1, $2, 'FAILED_QUERY', 'Failed to execute query ID: ' || $3 || '. Error: ' || $4, NOW()
            )`,
            [ 
              userId, 
              orgId, 
              queryId,
              error.message?.substring(0, 500) || 'Unknown error'
            ]
          );
          
          // تحديث إحصائيات الأداء للاستعلام الفاشل
          if (orgId !== null) {
            await updateQueryPerformance(orgId, false, 0);
          }
        } catch (logError) {
          console.error("Error logging query failure:", logError);
        }
      }
      
      // رسالة خطأ محددة للجدول أو العرض غير الموجود
      if (error.message && (error.message.includes('relation') || error.message.includes('does not exist'))) {
        return NextResponse.json({ 
          error: "Table or view does not exist",
          message: "Table or view does not exist or is not accessible in the database"
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: "Failed to execute query",
        message: error.message || "An unknown error occurred"
      }, { status: 500 });
    } finally {
      // لا حاجة لإغلاق الاتصال مع PostgreSQL لأنه يستخدم مجمع الاتصالات
      console.log("Execute Query: Query processing completed");
    }
  } catch (error: any) {
    console.error("Execute Query API error:", error);
    
    return NextResponse.json({ 
      error: "Failed to process query execution request",
      message: error.message || "An unknown error occurred"
    }, { status: 500 });
  }
}