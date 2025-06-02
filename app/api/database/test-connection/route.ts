// app/api/database/test-connection/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Pool } from 'pg';
import { extractUserIdFromCookies } from '@/lib/auth';

// Define interfaces for database tables and columns
interface DbColumn {
  name: string;
  type: string;
}

interface DbTable {
  name: string;
  columns: DbColumn[];
}

// POST handler for testing database connection
export const POST = async (req: NextRequest) => {
  try {
    console.log("Test Database Connection API called");
    
    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Test Connection: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Test Connection: UserId found:", userId);
    
    // Parse request body to get connection details
    const connectionData = await req.json();
    const { databaseType } = connectionData;
    
    if (!databaseType) {
      return NextResponse.json({ 
        error: "Database type is required",
        message: "Please specify the database type"
      }, { status: 400 });
    }
    
    // Handle different database types
    let testResult;
    
    switch (databaseType.toLowerCase()) {
      case 'oracle':
        testResult = await testOracleConnection(connectionData);
        break;
      case 'postgres':
        testResult = await testPostgresConnection(connectionData);
        break;
      case 'mysql':
        testResult = await testMySQLConnection(connectionData);
        break;
      case 'mssql':
        testResult = await testMSSQLConnection(connectionData);
        break;
      default:
        return NextResponse.json({ 
          error: "Unsupported database type",
          message: `Database type '${databaseType}' is not supported`
        }, { status: 400 });
    }
    
    if (testResult.success) {
      return NextResponse.json({ 
        message: "Connection test successful",
        databaseType: databaseType,
        details: testResult.details
      }, { status: 200 });
    } else {
      return NextResponse.json({ 
        error: "Connection test failed",
        message: testResult.error,
        details: testResult.details
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Test connection error:", error);
    
    return NextResponse.json(
      { error: "Failed to test database connection", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};

// Test Oracle connection (kept for backward compatibility)
async function testOracleConnection(connectionData: any) {
  try {
    console.log("Testing Oracle connection");
    
    const { user, password, connectString } = connectionData;
    
    if (!user || !password || !connectString) {
      console.log("Oracle connection: Missing required parameters");
      return {
        success: false,
        error: "Missing required parameters",
        details: "User, password, and connect string are required for Oracle connections"
      };
    }
    
    // Dynamically import oracledb only when needed
    const oracledb = await import('oracledb');
    
    // Create connection to the external database
    const externalConnection = await oracledb.default.getConnection({
      user,
      password,
      connectString,
    });
    
    console.log("Connected to external Oracle database");
    
    // Query to get tables and columns
    const tablesQuery = `
      SELECT 
        table_name as "name"
      FROM 
        user_tables
      ORDER BY 
        table_name
    `;
    
    const tablesResult = await externalConnection.execute(tablesQuery, [], { outFormat: oracledb.default.OUT_FORMAT_OBJECT });
    console.log(`Found ${tablesResult.rows?.length || 0} tables in external Oracle database`);
    
    // Process tables and get columns for each
    const tables: DbTable[] = [];
    
    if (tablesResult.rows && tablesResult.rows.length > 0) {
      for (const tableRow of tablesResult.rows) {
        const tableName = tableRow.name;
        
        // Query to get columns for this table
        const columnsQuery = `
          SELECT 
            column_name as "name", 
            data_type as "type"
          FROM 
            user_tab_columns 
          WHERE 
            table_name = :tableName
          ORDER BY 
            column_id
        `;
        
        const columnsResult = await externalConnection.execute(
          columnsQuery, 
          { tableName },
          { outFormat: oracledb.default.OUT_FORMAT_OBJECT }
        );
        
        if (columnsResult.rows && columnsResult.rows.length > 0) {
          tables.push({
            name: tableName,
            columns: columnsResult.rows.map((col: any) => ({
              name: col.name,
              type: col.type
            }))
          });
        }
      }
    }
    
    // Close the connection
    await externalConnection.close();
    
    return {
      success: true,
      tables
    };
  } catch (error) {
    console.error("Error testing Oracle connection:", error);
    return {
      success: false,
      error: "Failed to connect to Oracle database",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

// Test PostgreSQL connection
async function testPostgresConnection(connectionData: any) {
  try {
    console.log("Testing PostgreSQL connection");
    
    const { host, port, database, user, password } = connectionData;
    
    if (!host || !port || !database || !user || !password) {
      console.log("PostgreSQL connection: Missing required parameters");
      return {
        success: false,
        error: "Missing required parameters",
        details: "Host, port, database, user, and password are required for PostgreSQL connections"
      };
    }
    
    const pool = new Pool({
      host,
      port: parseInt(port, 10),
      database,
      user,
      password,
      // Set a short connection timeout
      connectionTimeoutMillis: 5000,
    });
    
    const client = await pool.connect();
    try {
      // Test the connection with a simple query
      await client.query('SELECT 1');
      return {
        success: true,
        details: "Successfully connected to PostgreSQL database"
      };
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error("PostgreSQL connection test error:", error);
    return {
      success: false,
      error: "Failed to connect to PostgreSQL database",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

// Test MySQL connection (mock implementation)
async function testMySQLConnection(connectionData: any) {
  try {
    console.log("Testing MySQL connection");
    
    const { host, port, database, user, password } = connectionData;
    
    if (!host || !port || !database || !user || !password) {
      console.log("MySQL connection: Missing required parameters");
      return {
        success: false,
        error: "Missing required parameters",
        details: "Host, port, database, user, and password are required for MySQL connections"
      };
    }
    
    // In an actual implementation, you would use a MySQL client library
    // For now, we'll simulate a successful connection
    return {
      success: true,
      details: "Successfully connected to MySQL database (simulated)"
    };
  } catch (error) {
    console.error("MySQL connection test error:", error);
    return {
      success: false,
      error: "Failed to connect to MySQL database",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

// Test SQL Server connection (mock implementation)
async function testMSSQLConnection(connectionData: any) {
  try {
    console.log("Testing SQL Server connection");
    
    const { server, database, username, password } = connectionData;
    
    if (!server || !database || !username || !password) {
      console.log("SQL Server connection: Missing required parameters");
      return {
        success: false,
        error: "Missing required parameters",
        details: "Server, database, username, and password are required for SQL Server connections"
      };
    }
    
    // In an actual implementation, you would use an SQL Server client library
    // For now, we'll simulate a successful connection
    return {
      success: true,
      details: "Successfully connected to SQL Server database (simulated)"
    };
  } catch (error) {
    console.error("SQL Server connection test error:", error);
    return {
      success: false,
      error: "Failed to connect to SQL Server database",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}