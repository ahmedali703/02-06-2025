//lib/orgDb.ts
import { Pool } from 'pg';

export type ConnectionInfo = {
  user: string;
  password: string;
  host: string;
  port?: number;
  database: string;
};

// تعريف نوع يمثل الـ Pool لاستخدامه مع PostgreSQL
type PostgresPool = Pool;

// تخزين Connection Pools لكل مؤسسة لتجنب إعادة إنشائها في كل مرة
const orgPools = new Map<number, PostgresPool>();

/**
 * دالة لإنشاء أو استرجاع Connection Pool للمؤسسة بناءً على ORG_ID وبيانات الاتصال الخاصة بها.
 *
 * @param orgId رقم المؤسسة
 * @param connectionInfo كائن يحتوي على بيانات الاتصال الخاصة بالمؤسسة (user, password, host, port, database)
 * @returns Pool الاتصال الخاص بالمؤسسة
 */
export async function getOrgPool(orgId: number, connectionInfo: ConnectionInfo): Promise<PostgresPool> {
  if (orgPools.has(orgId)) {
    return orgPools.get(orgId)!;
  }

  // إنشاء Pool جديد باستخدام بيانات الاتصال الخاصة بالمؤسسة
  const pool = new Pool({
    user: connectionInfo.user,
    password: connectionInfo.password,
    host: connectionInfo.host,
    port: connectionInfo.port || 5432,
    database: connectionInfo.database,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 15,
    min: 5,
    idleTimeoutMillis: 30000
  });

  orgPools.set(orgId, pool);
  return pool;
}

/**
 * دالة تنفيذ استعلام على قاعدة بيانات المؤسسة باستخدام بيانات الاتصال الخاصة بها.
 *
 * @param orgId رقم المؤسسة
 * @param connectionInfo بيانات الاتصال الخاصة بالمؤسسة
 * @param sql استعلام SQL الذي سيتم تنفيذه
 * @param params المعاملات (إن وجدت) للاستعلام
 * @returns النتائج كـ array من السجلات
 */
export async function queryOrg(
  orgId: number,
  connectionInfo: ConnectionInfo,
  sql: string,
  params: any[] = []
): Promise<any[]> {
  const pool = await getOrgPool(orgId, connectionInfo);
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows || [];
  } catch (err) {
    console.error('Org Database error:', err);
    throw err;
  } finally {
    client.release();
  }
}
