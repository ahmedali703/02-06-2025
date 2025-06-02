// app/api/connect-database/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import sql from 'mssql';
import { query as adminQuery } from '@/lib/db'; // يستخدم اتصال المسؤول (Environment Variables)

// تعريف واجهة أعمدة الجداول
interface ColumnInfo {
  tableName: string;
  columnName: string;
  dataType: string;
}

/**
 * دالة لاسترجاع بيانات الاتصال الخاصة بالمؤسسة من جدول NL2SQL_ORG
 * حيث يتم قراءة حقل DATABASE_INFO وتحويله من JSON إلى كائن.
 *
 * @param orgId معرف المؤسسة
 * @returns كائن يحتوي على بيانات الاتصال مثل user, password, connectString, libDir
 */
async function getOrgConnectionInfo(orgId: number): Promise<any> {
  const result = await adminQuery(
    `SELECT "DATABASE_INFO" FROM "NL2SQL_ORG" WHERE "ORG_ID" = $1`,
    [orgId]
  );
  
  if (!result || result.length === 0) {
    throw new Error(`No connection info found for orgId ${orgId}`);
  }
  
  const dbInfoStr = result[0].DATABASE_INFO;
  try {
    const dbInfo = JSON.parse(dbInfoStr);
    return dbInfo;
  } catch (err) {
    throw new Error("Failed to parse DATABASE_INFO as JSON");
  }
}

export const POST = async (req: NextRequest) => {
  try {
    // قراءة البيانات المرسلة في الطلب
    const requestData = await req.json();
    let connectionData: any;

    // إذا كان الطلب يحتوي على orgId يتم استرجاع بيانات الاتصال من الجدول
    if (requestData.orgId) {
      connectionData = await getOrgConnectionInfo(requestData.orgId);
    } else {
      // وإلا نستخدم البيانات المرسلة مباشرةً
      connectionData = requestData;
    }
    
    // تحديد نوع قاعدة البيانات اعتمادًا على بيانات الاتصال
    const databaseType = connectionData.databaseType || detectDatabaseType(connectionData);
    let columns: ColumnInfo[] = [];

    // استدعاء الدالة المناسبة لكل نوع من قواعد البيانات
    switch (databaseType) {
      case 'oracle':
        columns = await connectToOracle(connectionData);
        break;
      case 'postgres':
        columns = await connectToPostgres(connectionData);
        break;
      case 'mysql':
        columns = await connectToMysql(connectionData);
        break;
      case 'mssql':
        columns = await connectToMssql(connectionData);
        break;
      default:
        throw new Error(`Unsupported database type: ${databaseType}`);
    }

    // تنسيق المخطط (schema) بشكل موحد
    const schemaString = formatSchema(columns, databaseType, connectionData);

    return NextResponse.json({ schema: schemaString }, { status: 200 });
  } catch (error) {
    console.error('Database connection failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Database connection failed: ${errorMessage}` }, { status: 500 });
  }
};

// دالة لتحديد نوع قاعدة البيانات بناءً على معطيات الاتصال
function detectDatabaseType(connectionData: any): string {
  if (connectionData.host && connectionData.database && (connectionData.port === '5432' || connectionData.port === 5432)) {
    return 'postgres';
  } else if (connectionData.host && connectionData.database && (connectionData.port === '3306' || connectionData.port === 3306)) {
    return 'mysql';
  } else if (connectionData.server) {
    return 'mssql';
  } else if (connectionData.user && connectionData.connectString) {
    // Oracle connection is detected by user and connectString
    return 'oracle';
  }
  return 'postgres'; // قيمة افتراضية إذا لم يتم التعرف على نوع قاعدة البيانات
}

// ======= الاتصالات بقاعدة البيانات =======

// اتصال بـ Oracle
async function connectToOracle(connectionData: any): Promise<ColumnInfo[]> {
  try {
    const { user, password, connectString } = connectionData;
    
    if (!user || !password || !connectString) {
      throw new Error('Missing required parameters: user, password, and connectString are required for Oracle connections');
    }
    
    // Dynamically import oracledb only when needed
    const oracledb = await import('oracledb');
    
    // Create connection to Oracle database
    const connection = await oracledb.default.getConnection({
      user,
      password,
      connectionString: connectString,
    });
    
    try {
      // Query to get table and column information
      const result = await connection.execute(
        `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
         FROM ALL_TAB_COLUMNS
         WHERE OWNER = :owner
         ORDER BY TABLE_NAME, COLUMN_ID`,
        { owner: user.toUpperCase() }
      );
      
      // Close the connection
      await connection.close();
      
      // Format the results
      return (result.rows as Array<[string, string, string]>).map(([table, column, type]) => ({
        tableName: table,
        columnName: column,
        dataType: type
      }));
    } catch (error) {
      // Make sure to close the connection in case of error
      await connection.close();
      throw error;
    }
  } catch (error) {
    console.error('Oracle connection error:', error);
    throw error;
  }
}

// اتصال بـ PostgreSQL
async function connectToPostgres(connectionData: any): Promise<ColumnInfo[]> {
  const { host, port, database, user, password } = connectionData;
  
  const pool = new Pool({
    host,
    port: parseInt(port),
    database,
    user,
    password,
    ssl: connectionData.ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const result = await pool.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type
      FROM 
        information_schema.columns
      WHERE 
        table_schema = 'public'
      ORDER BY 
        table_name, 
        ordinal_position
    `);

    await pool.end();

    return result.rows.map(row => ({
      tableName: row.table_name,
      columnName: row.column_name,
      dataType: row.data_type
    }));
  } catch (error) {
    await pool.end();
    throw error;
  }
}

// اتصال بـ MySQL
async function connectToMysql(connectionData: any): Promise<ColumnInfo[]> {
  const { host, port, database, user, password } = connectionData;
  
  const connection = await mysql.createConnection({
    host,
    port: parseInt(port),
    database,
    user,
    password
  });

  try {
    const [rows] = await connection.execute(`
      SELECT 
        TABLE_NAME as tableName, 
        COLUMN_NAME as columnName, 
        DATA_TYPE as dataType
      FROM 
        INFORMATION_SCHEMA.COLUMNS
      WHERE 
        TABLE_SCHEMA = ?
      ORDER BY 
        TABLE_NAME, 
        ORDINAL_POSITION
    `, [database]);

    await connection.end();

    return (rows as any[]).map(row => ({
      tableName: row.tableName,
      columnName: row.columnName,
      dataType: row.dataType
    }));
  } catch (error) {
    await connection.end();
    throw error;
  }
}

// اتصال بـ Microsoft SQL Server
async function connectToMssql(connectionData: any): Promise<ColumnInfo[]> {
  const { server, database, username, password, port } = connectionData;
  
  const config: sql.config = {
    server,
    database,
    user: username,
    password,
    port: port ? parseInt(port) : 1433,
    options: {
      trustServerCertificate: true,
    }
  };

  try {
    await sql.connect(config);
    
    const result = await sql.query`
      SELECT 
        t.name AS tableName,
        c.name AS columnName,
        ty.name AS dataType
      FROM 
        sys.tables t
      INNER JOIN 
        sys.columns c ON t.object_id = c.object_id
      INNER JOIN 
        sys.types ty ON c.user_type_id = ty.user_type_id
      ORDER BY 
        t.name, 
        c.column_id
    `;

    await sql.pool?.close();

    return result.recordset.map(record => ({
      tableName: record.tableName,
      columnName: record.columnName,
      dataType: record.dataType
    }));
  } catch (error) {
    await sql.pool?.close();
    throw error;
  }
}

// ======= FORMATEO DEL ESQUEMA =======

function formatSchema(columns: ColumnInfo[], databaseType: string, connectionData: any): string {
  const tableMap: Record<string, string[]> = {};
  
  columns.forEach(col => {
    if (!tableMap[col.tableName]) {
      tableMap[col.tableName] = [];
    }
    tableMap[col.tableName].push(`${col.columnName} ${col.dataType}`);
  });

  let schemaName = '';
  switch (databaseType) {
    case 'postgres':
    case 'mysql':
      schemaName = connectionData.database.toLowerCase();
      break;
    case 'mssql':
      schemaName = `${connectionData.database.toLowerCase()}_dbo`;
      break;
    case 'oracle': // Kept for backward compatibility
      schemaName = connectionData.user ? connectionData.user.toLowerCase() : 'oracle_deprecated';
      break;
    default:
      schemaName = 'db';
  }

  let schemaString = `export const ${schemaName}Schema = \n\n`;
  
  for (const table in tableMap) {
    schemaString += `${table}(\n${tableMap[table].join(',\n')}\n);\n\n`;
  }
  
  schemaString += ';';
  
  return schemaString;
}
