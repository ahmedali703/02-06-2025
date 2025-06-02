//lib/db.ts
import { Pool, QueryResult } from 'pg';
import 'dotenv/config';
import { Result } from '@/lib/types';

// Connection pool for the default database
let pool: Pool | null = null;

// Track organization-specific pools
const orgPools = new Map<number, Pool>();

/**
 * Initialize the database connection pool
 */
async function initPool() {
  if (!pool) {
    console.log(process.env.DATABASE_URL)
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
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
 * @param orgId Organization ID
 * @param connectionInfo Connection details
 * @returns Pool object for the organization's database
 */
function createOrgPool(orgId: number, connectionInfo: {
  user: string;
  password: string;
  host: string;
  port?: number;
  database: string;
}): Pool {
  // Check if pool exists
  let orgPool = orgPools.get(orgId);
  
  if (orgPool) {
    return orgPool;
  }

  // Create new pool with better limits
  orgPool = new Pool({
    user: connectionInfo.user,
    password: connectionInfo.password,
    host: connectionInfo.host,
    port: connectionInfo.port || 5432,
    database: connectionInfo.database,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Handle pool errors
  orgPool.on('error', (err) => {
    console.error(`Unexpected error on idle client for org ${orgId}:`, err);
    orgPools.delete(orgId);  // Remove failed pool
  });

  // Store the pool
  orgPools.set(orgId, orgPool);
  
  return orgPool;
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
  // Detect database type from connection info
  const isOracle = connectionInfo && connectionInfo.connectString;
  const isPostgres = connectionInfo && connectionInfo.host && (connectionInfo.port === '5432' || connectionInfo.port === 5432);
  const isMySql = connectionInfo && connectionInfo.host && (connectionInfo.port === '3306' || connectionInfo.port === 3306);
  const isMsSql = connectionInfo && connectionInfo.server;
  
  // Log connection attempt
  console.log(`Connecting to ${isOracle ? 'Oracle' : isPostgres ? 'PostgreSQL' : isMySql ? 'MySQL' : isMsSql ? 'MS SQL' : 'unknown'} database for org ${orgId}`);
  
  // Handle Oracle connections
  if (isOracle) {
    return queryWithOracleConnection(orgId, connectionInfo, sql, params);
  }
  
  // Validate PostgreSQL connection info
  if (!isOracle && (!connectionInfo || !connectionInfo.host)) {
    console.error(`Invalid connection info for org ${orgId}:`, connectionInfo);
    throw new Error(`Invalid database connection configuration for organization ${orgId}`);
  }

  console.log(`Connecting to database for org ${orgId} at ${connectionInfo.host}:${connectionInfo.port || 5432}`);
  
  let client;
  try {
    const orgPool = createOrgPool(orgId, connectionInfo);
    client = await orgPool.connect();
    
    const result = await client.query(sql, params);
    return result.rows as T[];
  } catch (err: any) {
    console.error(`Database error for org ${orgId}:`, err.message);
    
    // If we get a connection error, cleanup the pool
    if (err.message.includes('too many clients')) {
      await cleanupOrgPools();
    }
    
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Execute a SELECT query against an Oracle database
 * @param orgId Organization ID
 * @param connectionInfo Oracle connection details
 * @param sql SQL query to execute
 * @param params Query parameters
 * @returns Array of result rows
 */
async function queryWithOracleConnection<T = any>(
  orgId: number,
  connectionInfo: any,
  sql: string,
  params: any[] = []
): Promise<T[]> {
  // Validate Oracle connection info
  if (!connectionInfo || !connectionInfo.user || !connectionInfo.password || !connectionInfo.connectString) {
    console.error(`Invalid Oracle connection info for org ${orgId}:`, connectionInfo);
    throw new Error(`Invalid Oracle connection configuration for organization ${orgId}`);
  }
  
  const { user, password, connectString } = connectionInfo;
  
  try {
    // Format the connectString correctly if it doesn't have the proper format
    let formattedConnectString = connectString;
    if (!connectString.includes('/') && connectString.includes(':')) {
      // Convert from host:port/service format to proper Oracle connection string
      const [hostPort, service] = connectString.split('/');
      const [host, port] = hostPort.split(':');
      formattedConnectString = `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SERVICE_NAME=${service})))`;
      console.log(`Reformatted Oracle connect string to: ${formattedConnectString}`);
    }
    
    // Dynamically import oracledb only when needed
    const oracledb = await import('oracledb');
    
    // Configure Oracle driver
    oracledb.default.outFormat = oracledb.default.OUT_FORMAT_OBJECT;
    
    // Create connection to Oracle database
    console.log(`Connecting to Oracle database for org ${orgId} with user ${user}`);
    const connection = await oracledb.default.getConnection({
      user,
      password,
      connectionString: formattedConnectString,
    });
    
    try {
      // Adapt SQL for Oracle
      let modifiedSql = adaptSqlForOracle(sql, user);
      let modifiedParams = params;
      
      console.log(`Modified Oracle SQL: ${modifiedSql}`);
      
      // Execute the query
      const result = await connection.execute(modifiedSql, modifiedParams);
      
      // Return the rows
      return result.rows as T[];
    } catch (err: any) {
      console.error(`Oracle query error for org ${orgId}:`, err.message);
      throw err;
    } finally {
      // Close the connection
      await connection.close();
    }
  } catch (err: any) {
    console.error(`Oracle connection error for org ${orgId}:`, err.message);
    
    // Provide more helpful error message
    if (err.message.includes('TNS')) {
      throw new Error(`Cannot connect to Oracle database with connect string '${connectString}'. Please check that the database server is running and the connect string is correct.`);
    } else if (err.message.includes('ORA-01017')) {
      throw new Error(`Oracle authentication failed. Please check your username and password.`);
    } else if (err.message.includes('ORA-00942')) {
      throw new Error(`Table or view does not exist. Please check that the table exists and is accessible by the ${user} user.`);
    } else if (err.message.includes('ORA-00905')) {
      throw new Error(`SQL syntax error: missing keyword. The query syntax may not be compatible with Oracle.`);
    }
    
    throw err;
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
  // Detect database type from connection info
  const isOracle = connectionInfo && connectionInfo.connectString;
  
  // Handle Oracle connections
  if (isOracle) {
    return execWithOracleConnection(orgId, connectionInfo, sql, params);
  }
  
  // Handle PostgreSQL and other database types
  const orgPool = createOrgPool(orgId, connectionInfo);
  
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
 * Execute a DML query against an Oracle database
 * @param orgId Organization ID
 * @param connectionInfo Oracle connection details
 * @param sql SQL query to execute
 * @param params Query parameters
 * @returns Object with rowCount property indicating affected rows
 */
async function execWithOracleConnection(
  orgId: number,
  connectionInfo: any,
  sql: string,
  params: any[] = []
): Promise<{rowCount: number}> {
  // Validate Oracle connection info
  if (!connectionInfo || !connectionInfo.user || !connectionInfo.password || !connectionInfo.connectString) {
    console.error(`Invalid Oracle connection info for org ${orgId}:`, connectionInfo);
    throw new Error(`Invalid Oracle connection configuration for organization ${orgId}`);
  }
  
  const { user, password, connectString } = connectionInfo;
  
  try {
    // Format the connectString correctly if it doesn't have the proper format
    let formattedConnectString = connectString;
    if (!connectString.includes('/') && connectString.includes(':')) {
      // Convert from host:port/service format to proper Oracle connection string
      const [hostPort, service] = connectString.split('/');
      const [host, port] = hostPort.split(':');
      formattedConnectString = `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SERVICE_NAME=${service})))`;
      console.log(`Reformatted Oracle connect string to: ${formattedConnectString}`);
    }
    
    // Dynamically import oracledb only when needed
    const oracledb = await import('oracledb');
    
    // Configure Oracle driver
    oracledb.default.outFormat = oracledb.default.OUT_FORMAT_OBJECT;
    
    // Create connection to Oracle database
    console.log(`Connecting to Oracle database for org ${orgId} with user ${user}`);
    const connection = await oracledb.default.getConnection({
      user,
      password,
      connectionString: formattedConnectString,
    });
    
    try {
      // Execute the query
      const result = await connection.execute(sql, params, { autoCommit: true });
      
      // Return the rowCount (Oracle calls this rowsAffected)
      return { rowCount: result.rowsAffected || 0 };
    } catch (err: any) {
      console.error(`Oracle query error for org ${orgId}:`, err.message);
      throw err;
    } finally {
      // Close the connection
      await connection.close();
    }
  } catch (err: any) {
    console.error(`Oracle connection error for org ${orgId}:`, err.message);
    throw err;
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

/**
 * Adapt SQL query for Oracle database
 * @param sql SQL query to adapt
 * @param schemaName Schema name to prefix tables with
 * @returns Adapted SQL query
 */
function adaptSqlForOracle(sql: string, user: any): string {
  // Si no hay SQL, devolver cadena vacía
  if (!sql) return '';
  
  // Convertir SQL a mayúsculas para facilitar la coincidencia de patrones
  let upperSql = sql.toUpperCase();
  let modifiedSql = sql;
  
  // Verificar si es una consulta de estilo PostgreSQL
  const isPgStyle = upperSql.includes('"') || upperSql.includes('$1') || upperSql.includes('LIMIT');
  
  // Verificar si la consulta es para tablas del sistema
  const isSystemTableQuery = (
    upperSql.includes('ALL_TABLES') || 
    upperSql.includes('USER_TABLES') || 
    upperSql.includes('DUAL')
  );
  
  if (isPgStyle) {
    console.log('Converting PostgreSQL-style query to Oracle syntax');
    
    // Reemplazar comillas dobles con nada (Oracle no necesita comillas para identificadores regulares)
    if (!isSystemTableQuery) {
      modifiedSql = modifiedSql.replace(/"/g, '');
    }
    
    // Reemplazar $1, $2, etc. con :1, :2, etc.
    modifiedSql = modifiedSql.replace(/\$([0-9]+)/g, ':$1');
    
    // Reemplazar LIMIT con FETCH FIRST/NEXT
    if (upperSql.includes('LIMIT')) {
      const limitMatch = modifiedSql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        const limitValue = limitMatch[1];
        modifiedSql = modifiedSql.replace(/LIMIT\s+\d+/i, `FETCH FIRST ${limitValue} ROWS ONLY`);
      }
    }
  }
  
  // Si es una consulta para tablas del sistema, NO agregar prefijo de esquema
  if (isSystemTableQuery && user && user.username) {
    // Para tablas del sistema, eliminar cualquier prefijo de esquema que se haya agregado
    const schemaPrefix = new RegExp(`${user.username}\.`, 'gi');
    modifiedSql = modifiedSql.replace(schemaPrefix, '');
    return modifiedSql;
  }
  
  // Agregar prefijo de esquema para tablas de Oracle si aún no tienen uno
  if (user && user.username) {
    // Buscar nombres de tablas en cláusulas FROM y JOIN
    modifiedSql = modifiedSql.replace(
      /(?:FROM|JOIN)\s+(["']?)(\w+)(["']?)/gi,
      (match, quote1, tableName, quote2) => {
        // Si el nombre de la tabla ya tiene un prefijo de esquema, dejarlo solo
        if (tableName.includes('.')) {
          return match;
        }
        // Omitir tablas del sistema
        if (['ALL_TABLES', 'USER_TABLES', 'DUAL'].includes(tableName.toUpperCase())) {
          return match;
        }
        // De lo contrario, agregar el prefijo de esquema con el nombre de usuario actual
        return match.replace(
          `${quote1}${tableName}${quote2}`,
          `${quote1}${user.username}.${tableName}${quote2}`
        );
      }
    );
  }
  
  return modifiedSql;
}

// Add a cleanup function for org pools
async function cleanupOrgPools() {
  const orgIds = Array.from(orgPools.keys());
  for (const orgId of orgIds) {
    const pool = orgPools.get(orgId);
    if (pool) {
      try {
        await pool.end();
        orgPools.delete(orgId);
      } catch (err) {
        console.error(`Error cleaning up pool for org ${orgId}:`, err);
      }
    }
  }
}

// Add process cleanup handlers
process.on('SIGTERM', cleanupOrgPools);
process.on('SIGINT', cleanupOrgPools);