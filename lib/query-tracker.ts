// lib/query-tracker.ts
import { Pool } from 'pg';
import { query, exec } from '@/lib/db';

interface QueryExecutionData {
  orgId: number;
  userId: number;
  queryText: string;
  sqlGenerated: string;
  executionStatus: 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';
  errorMessage?: string;
  executionTime?: number; // بالملي ثانية
  rowsReturned?: number;
}

/**
 * تسجيل كل استعلام يتم تنفيذه في النظام
 */
export async function trackQueryExecution(data: QueryExecutionData): Promise<number> {
  try {
    // إدخال السجل في جدول الاستعلامات
    const result = await query(
      `INSERT INTO "NL2SQL_QUERIES" (
        "ORG_ID",
        "USER_ID",
        "QUERY_TEXT",
        "SQL_GENERATED",
        "EXECUTION_STATUS",
        "ERROR_MESSAGE",
        "EXECUTION_TIME",
        "ROWS_RETURNED",
        "EXECUTION_DATE",
        "CREATED_AT"
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        NOW(),
        NOW()
      ) RETURNING "ID"`,
      [
        data.orgId,
        data.userId,
        data.queryText,
        data.sqlGenerated || null,
        data.executionStatus,
        data.errorMessage || null,
        data.executionTime || null,
        data.rowsReturned || null
      ]
    );

    // تسجيل نشاط المستخدم
    await query(
      `INSERT INTO "NL2SQL_USER_ACTIVITY" (
        "USER_ID",
        "ORG_ID",
        "ACTIVITY_TYPE",
        "ACTIVITY_DETAILS",
        "ACTIVITY_DATE"
      ) VALUES (
        $1,
        $2,
        'QUERY',
        $3,
        NOW()
      )`,
      [
        data.userId,
        data.orgId,
        `Executed query: ${data.queryText.substring(0, 200)}${data.queryText.length > 200 ? '...' : ''}`
      ]
    );

    // تحديث إحصائيات الأداء اليومية
    await updatePerformanceStats(data);
    
    return result[0].ID;
  } catch (error) {
    console.error('Error tracking query execution:', error);
    return 0; // فشل في تسجيل الاستعلام
  }
}

/**
 * تحديث إحصائيات الأداء للفترات الزمنية (يوم، أسبوع، شهر)
 */
async function updatePerformanceStats(data: QueryExecutionData): Promise<void> {
  // تحديث إحصائيات اليوم
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // تحويل التاريخ إلى صيغة ISO
  const todayStr = today.toISOString().split('T')[0];
  
  // التحقق من وجود إحصائيات اليوم
  const dayStatResult = await query(
    `SELECT "ID" FROM "NL2SQL_QUERY_PERFORMANCE" 
     WHERE "ORG_ID" = $1 
     AND "PERIOD_TYPE" = 'DAY' 
     AND TO_CHAR("DATE_PERIOD", 'YYYY-MM-DD') = $2`,
    [data.orgId, todayStr]
  );
  
  if (dayStatResult && dayStatResult.length > 0) {
    // تحديث الإحصائيات الموجودة
    await query(
      `UPDATE "NL2SQL_QUERY_PERFORMANCE" SET
       "TOTAL_QUERIES" = "TOTAL_QUERIES" + 1,
       "SUCCESSFUL_QUERIES" = "SUCCESSFUL_QUERIES" + CASE WHEN $1 = 'SUCCESS' THEN 1 ELSE 0 END,
       "FAILED_QUERIES" = "FAILED_QUERIES" + CASE WHEN $1 != 'SUCCESS' THEN 1 ELSE 0 END,
       "AVG_EXECUTION_TIME" = CASE 
         WHEN $2 IS NOT NULL THEN 
           ("AVG_EXECUTION_TIME" * "TOTAL_QUERIES" + $2) / ("TOTAL_QUERIES" + 1)
         ELSE "AVG_EXECUTION_TIME"
       END,
       "UPDATED_AT" = NOW()
       WHERE "ID" = $3`,
      [
        data.executionStatus,
        data.executionTime || null,
        dayStatResult[0].ID
      ]
    );
  } else {
    // إنشاء إحصائيات جديدة لليوم
    await query(
      `INSERT INTO "NL2SQL_QUERY_PERFORMANCE" (
         "ORG_ID",
         "DATE_PERIOD",
         "PERIOD_TYPE",
         "TOTAL_QUERIES",
         "SUCCESSFUL_QUERIES",
         "FAILED_QUERIES",
         "AVG_EXECUTION_TIME",
         "CREATED_AT",
         "UPDATED_AT"
       ) VALUES (
         $1,
         TO_DATE($2, 'YYYY-MM-DD'),
         'DAY',
         1,
         CASE WHEN $3 = 'SUCCESS' THEN 1 ELSE 0 END,
         CASE WHEN $3 != 'SUCCESS' THEN 1 ELSE 0 END,
         $4,
         NOW(),
         NOW()
       )`,
      [
        data.orgId,
        todayStr,
        data.executionStatus,
        data.executionTime || null
      ]
    );
  }
  
  // يمكن أيضًا تحديث إحصائيات الأسبوع والشهر بنفس الطريقة
  // ...
}

/**
 * تسجيل نشاط المستخدم العام
 */
export async function trackUserActivity(
  userId: number, 
  orgId: number, 
  activityType: string, 
  details: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    // تسجيل النشاط
    await query(
      `INSERT INTO "NL2SQL_USER_ACTIVITY" (
        "USER_ID",
        "ORG_ID",
        "ACTIVITY_TYPE",
        "ACTIVITY_DETAILS",
        "IP_ADDRESS",
        "USER_AGENT",
        "ACTIVITY_DATE"
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        NOW()
      )`,
      [
        userId,
        orgId,
        activityType,
        details,
        ipAddress || null,
        userAgent || null
      ]
    );
  } catch (error) {
    console.error('Error tracking user activity:', error);
  }
}

// api/dashboard/generate-report.ts - دالة لإنشاء تقارير الأداء الدورية

/**
 * إنشاء تقرير أداء شهري وإرساله بالبريد الإلكتروني
 */
export async function generateMonthlyReport(orgId: number): Promise<boolean> {
  try {
    // الحصول على إحصائيات الشهر
    const stats = await query(
      `SELECT 
         SUM("TOTAL_QUERIES") AS "TOTAL_QUERIES",
         SUM("SUCCESSFUL_QUERIES") AS "SUCCESSFUL_QUERIES",
         SUM("FAILED_QUERIES") AS "FAILED_QUERIES",
         ROUND(AVG("AVG_EXECUTION_TIME"), 2) AS "AVG_EXECUTION_TIME"
       FROM "NL2SQL_QUERY_PERFORMANCE"
       WHERE "ORG_ID" = $1
       AND "PERIOD_TYPE" = 'DAY'
       AND "DATE_PERIOD" >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
       AND "DATE_PERIOD" < DATE_TRUNC('month', CURRENT_DATE)`,
      [orgId]
    );

    // الحصول على معلومات المؤسسة
    const orgInfo = await query(
      `SELECT "ORG_NAME", "ORG_STATUS", "DATABASE_TYPE" FROM "NL2SQL_ORG" WHERE "ORG_ID" = $1`,
      [orgId]
    );

    // الحصول على قائمة المستخدمين النشطين
    const activeUsers = await query(
      `SELECT COUNT(DISTINCT "USER_ID") AS "ACTIVE_USERS"
       FROM "NL2SQL_USER_ACTIVITY"
       WHERE "ORG_ID" = $1
       AND "ACTIVITY_DATE" >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'`,
      [orgId]
    );

    // إنشاء التقرير
    const reportData = {
      stats: stats && stats.length > 0 ? stats[0] : null,
      organization: orgInfo && orgInfo.length > 0 ? orgInfo[0] : null,
      activeUsers: activeUsers && activeUsers.length > 0 ? activeUsers[0].ACTIVE_USERS : 0,
      month: new Date().toLocaleString('ar-SA', { month: 'long', year: 'numeric' })
    };

    // هنا يمكن استدعاء دالة لإرسال التقرير بالبريد الإلكتروني
    // await sendReportByEmail(orgId, reportData);

    return true;
  } catch (error) {
    console.error('Error generating monthly report:', error);
    return false;
  }
}