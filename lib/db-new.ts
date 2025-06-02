//lib/db.ts
import { Pool, QueryResult } from 'pg';
import 'dotenv/config';
import { Result } from '@/lib/types';

// Connection pool for the default database
let pool: Pool | null = null;

/**
 * Initialize the database connection pool
 */
async function initPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 15,
      min: 5,
      idleTimeoutMillis: 30000,
    });
  }
}

/**
 * Execute a SELECT query against the database
 * @param sql SQL query to execute
 * @param params Query parameters
 * @returns Array of result rows
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (!pool) {
    await initPool();
  }

  const client = await pool!.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } catch (err) {
    console.error('Database error:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute a DML query (INSERT, UPDATE, DELETE) against the database
 * @param sql SQL query to execute
 * @param params Query parameters
 * @returns Object with rowCount property indicating affected rows
 */
export async function exec(sql: string, params: any[] = []): Promise<{rowCount: number}> {
  if (!pool) {
    await initPool();
  }

  const client = await pool!.connect();
  try {
    const result = await client.query(sql, params);
    return { rowCount: result.rowCount || 0 };
  } catch (error) {
    console.error("❌ Database exec error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create a database connection for an organization
 * @param connectionInfo Connection details
 * @returns Pool object for the organization's database
 */
function createOrgPool(connectionInfo: {
  user: string;
  password: string;
  host: string;
  port?: number;
  database: string;
}): Pool {
  return new Pool({
    user: connectionInfo.user,
    password: connectionInfo.password,
    host: connectionInfo.host,
    port: connectionInfo.port || 5432,
    database: connectionInfo.database,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    min: 1,
    idleTimeoutMillis: 30000
  });
}

/**
 * Execute a SELECT query against an organization's database
 * @param orgId Organization ID
 * @param connectionInfo Connection details
 * @param sql SQL query to execute
 * @param params Query parameters
 * @returns Array of result rows
 */
export async function queryWithOrgConnection<T = any>(
  orgId: number, 
  connectionInfo: any, 
  sql: string, 
  params: any[] = []
): Promise<T[]> {
  const orgPool = createOrgPool(connectionInfo);
  
  const client = await orgPool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } catch (err) {
    console.error(`Database error for org ${orgId}:`, err);
    throw err;
  } finally {
    client.release();
    await orgPool.end();
  }
}

/**
 * Execute a DML query against an organization's database
 * @param orgId Organization ID
 * @param connectionInfo Connection details
 * @param sql SQL query to execute
 * @param params Query parameters
 * @returns Object with rowCount property indicating affected rows
 */
export async function execWithOrgConnection(
  orgId: number, 
  connectionInfo: any, 
  sql: string, 
  params: any[] = []
): Promise<{rowCount: number}> {
  const orgPool = createOrgPool(connectionInfo);
  
  const client = await orgPool.connect();
  try {
    const result = await client.query(sql, params);
    return { rowCount: result.rowCount || 0 };
  } catch (err) {
    console.error(`Database error for org ${orgId}:`, err);
    throw err;
  } finally {
    client.release();
    await orgPool.end();
  }
}

/**
 * Get connection details for an organization
 * @param orgId Organization ID
 * @returns Connection details or null if not found
 */
export async function getOrgConnectionDetails(orgId: number) {
  try {
    const result = await query(
      `SELECT "DATABASE_INFO" FROM "NL2SQL_ORG" WHERE "ORG_ID" = $1`,
      [orgId]
    );
    
    if (result && result.length > 0 && result[0].DATABASE_INFO) {
      return JSON.parse(result[0].DATABASE_INFO);
    }
    return null;
  } catch (error) {
    console.error("Error getting organization connection details:", error);
    return null;
  }
}

export { initPool, pool };
