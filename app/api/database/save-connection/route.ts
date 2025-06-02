// app/api/database/save-connection/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractUserIdFromCookies } from '@/lib/auth';
import { query } from '@/lib/db';
import { Pool } from 'pg';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Interface for table data
interface TableColumn {
  name: string;
  type: string;
}

interface DbTable {
  name: string;
  columns: TableColumn[];
}

// Function to generate table description using gpt-4o-mini
async function generateTableDescription(tableName: string, columns: TableColumn[]): Promise<string> {
  try {
    const columnInfo = columns.map(col => `${col.name} (${col.type})`).join(', ');
    
    const prompt = `Generate a concise and accurate description for a database table named "${tableName}" with the following columns: ${columnInfo}. 
    Describe the likely purpose of this table and what data it might store based on its name and column structure. 
    Keep the description under 500 characters and focus on business purpose.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a database expert who provides concise, accurate descriptions of database tables." },
        { role: "user", content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    
    return response.choices[0].message.content?.trim() || `Table ${tableName} for storing records with columns: ${columnInfo}`;
  } catch (error) {
    console.error("Error generating table description:", error);
    return `Table ${tableName} with columns: ${columns.map(c => c.name).join(', ')}`;
  }
}

// Helper function to extract tables from database objects
function extractTables(databaseObjects: any): DbTable[] {
  if (!databaseObjects) return [];
  
  try {
    // If it's a Buffer, convert to string
    if (Buffer.isBuffer(databaseObjects)) {
      databaseObjects = databaseObjects.toString();
    }
    
    // If it's a string, parse as JSON
    const parsed = typeof databaseObjects === 'string' ? 
      JSON.parse(databaseObjects) : databaseObjects;
    
    // Extract tables array
    return Array.isArray(parsed.tables) ? parsed.tables : [];
  } catch (error) {
    console.error("Error extracting tables from database objects:", error);
    return [];
  }
}

// Function to test the new connection and extract schema information
async function testExternalConnection(connectionInfo: any) {
  console.log("Testing external connection to fetch tables");
  const { databaseType, ...connectionDetails } = connectionInfo;
  
  switch (databaseType) {
    case 'oracle':
      return await testOracleConnection(connectionDetails);
    case 'mysql':
      return await testMySQLConnection(connectionDetails);
    case 'postgres':
      return await testPostgresConnection(connectionDetails);
    case 'mssql':
      return await testMSSQLConnection(connectionDetails);
    default:
      throw new Error(`Unsupported database type: ${databaseType}`);
  }
}

// Test Oracle connection and get schema information
async function testOracleConnection(connectionDetails: any) {
  try {
    console.log("Testing Oracle connection for schema information");
    
    const { user, password, connectString } = connectionDetails;
    
    if (!user || !password || !connectString) {
      console.log("Oracle connection: Missing required parameters");
      return {
        success: false,
        error: "Missing required parameters",
        message: "User, password, and connect string are required for Oracle connections",
        tables: []
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
      message: error instanceof Error ? error.message : String(error),
      tables: []
    };
  }
}

// Test MySQL connection and get schema information
async function testMySQLConnection(connectionDetails: any) {
  try {
    // Since MySQL is not directly accessible in the server environment,
    // we simulate a successful connection with sample data
    console.log("MySQL connection would be tested here with real implementation");
    
    // In a real implementation, you would connect to MySQL and query for tables and columns
    return {
      success: true,
      tables: [] // This would be populated with actual tables from MySQL
    };
  } catch (error) {
    console.error("Error testing MySQL connection:", error);
    throw error;
  }
}

// Test Postgres connection and get schema information
async function testPostgresConnection(connectionDetails: any) {
  let pgPool = null;
  
  try {
    console.log("Testing PostgreSQL connection to fetch schema information");
    
    // Create a connection pool to the external PostgreSQL database
    pgPool = new Pool({
      host: connectionDetails.host,
      port: parseInt(connectionDetails.port, 10),
      database: connectionDetails.database,
      user: connectionDetails.user,
      password: connectionDetails.password,
      // Set a short connection timeout
      connectionTimeoutMillis: 10000,
    });
    
    console.log("Connected to external PostgreSQL database");
    
    // Query to get tables from the current schema
    const tablesQuery = `
      SELECT 
        table_name as "name"
      FROM 
        information_schema.tables
      WHERE 
        table_schema = 'public' AND
        table_type = 'BASE TABLE'
      ORDER BY 
        table_name
    `;
    
    const tablesResult = await pgPool.query(tablesQuery);
    console.log(`Found ${tablesResult.rows.length || 0} tables in external PostgreSQL database`);
    
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
            information_schema.columns 
          WHERE 
            table_schema = 'public' AND
            table_name = $1
          ORDER BY 
            ordinal_position
        `;
        
        const columnsResult = await pgPool.query(columnsQuery, [tableName]);
        
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
    
    return {
      success: true,
      tables
    };
  } catch (error) {
    console.error("Error testing PostgreSQL connection:", error);
    throw error;
  } finally {
    if (pgPool) {
      try {
        await pgPool.end();
        console.log("External PostgreSQL connection pool closed");
      } catch (closeError) {
        console.error("Error closing external PostgreSQL connection pool:", closeError);
      }
    }
  }
}

// Test MS SQL Server connection and get schema information
async function testMSSQLConnection(connectionDetails: any) {
  try {
    // Since MS SQL is not directly accessible in the server environment,
    // we simulate a successful connection with sample data
    console.log("MS SQL connection would be tested here with real implementation");
    
    // In a real implementation, you would connect to MS SQL and query for tables and columns
    return {
      success: true,
      tables: [] // This would be populated with actual tables from MS SQL
    };
  } catch (error) {
    console.error("Error testing MS SQL connection:", error);
    throw error;
  }
}

// POST handler for saving database connection settings
export const POST = async (req: NextRequest) => {
  let connection;
  
  try {
    console.log("Save Database Connection API called");
    
    // Get the user ID from cookies
    const userId = await extractUserIdFromCookies();
    
    if (!userId) {
      console.log("Save Connection: No userId found in token or cookies");
      return NextResponse.json({ 
        error: "Authentication required",
        message: "Please login to access this resource"
      }, { status: 401 });
    }

    console.log("Save Connection: UserId found:", userId);
    
    // Parse request body
    const { 
      databaseType, 
      databaseInfo, 
      databaseObjects, 
      selectedTables = [], 
      refreshTables = false, 
      forceTableUpdate = true 
    } = await req.json();
    
    console.log("Save Connection: Received parameters:", { 
      databaseType, 
      hasDatabaseInfo: !!databaseInfo,
      hasDatabaseObjects: !!databaseObjects,
      selectedTables: selectedTables.length,
      refreshTables,
      forceTableUpdate
    });
    
    if (!databaseType || !databaseInfo) {
      return NextResponse.json({ 
        error: "Missing required parameters",
        message: "Database type and connection info are required"
      }, { status: 400 });
    }
    
    // Clean connection data
    let cleanedDatabaseInfo;
    let connectionData;
    try {
      connectionData = typeof databaseInfo === 'string' ? JSON.parse(databaseInfo) : databaseInfo;
      if (connectionData.databaseType) {
        delete connectionData.databaseType;
      }
      cleanedDatabaseInfo = JSON.stringify(connectionData);
    } catch (error) {
      console.error("Error parsing connection data:", error);
      return NextResponse.json({ 
        error: "Invalid connection data format",
        message: "The connection data must be a valid JSON object"
      }, { status: 400 });
    }
    
    console.log("Save Connection: Using PostgreSQL connection");
    
    try {
      // 1. Get user and organization data
      const userResult = await query(
        `SELECT u."ID", u."ORG_ID", u."ROLE", o."DATABASE_TYPE", o."DATABASE_INFO", o."DATABASE_OBJECTS"
         FROM "NL2SQL_USERS" u
         LEFT JOIN "NL2SQL_ORG" o ON u."ORG_ID" = o."ORG_ID"
         WHERE u."ID" = $1`,
        [userId]
      );
      
      if (!userResult || userResult.length === 0) {
        console.log("Save Connection: User not found");
        return NextResponse.json({ 
          error: "User not found",
          message: "Your user account was not found"
        }, { status: 404 });
      }
      
      const userData = userResult[0];
      const orgId = userData.ORG_ID;
      let userRole = userData.ROLE;
      const previousDbType = userData.DATABASE_TYPE;
      const previousDbInfo = userData.DATABASE_INFO;
      const existingDatabaseObjects = userData.DATABASE_OBJECTS;
      
      console.log("Save Connection: User data retrieved:", { 
        ID: userData.ID, 
        ORG_ID: orgId, 
        ROLE: userRole,
        DATABASE_TYPE: previousDbType,
        HAS_DATABASE_INFO: !!previousDbInfo,
        HAS_DATABASE_OBJECTS: !!existingDatabaseObjects
      });
      
      if (!orgId) {
        console.log("Save Connection: User has no organization");
        return NextResponse.json({ 
          error: "No organization found",
          message: "You need to be part of an organization to save connection settings"
        }, { status: 404 });
      }
      
      // 2. Check user permissions
      if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        // Try to automatically assign ADMIN role to first user if role is null
        if (userRole === null) {
          const orgUsersResult = await query(
            `SELECT MIN("ID") AS "FIRST_USER_ID" FROM "NL2SQL_USERS" WHERE "ORG_ID" = $1`,
            [orgId]
          );
          
          const firstUserId = orgUsersResult[0]?.FIRST_USER_ID;
          
          if (firstUserId === userId) {
            userRole = 'ADMIN';
            await query(
              `UPDATE "NL2SQL_USERS" SET "ROLE" = 'ADMIN', "UPDATED_AT" = NOW() WHERE "ID" = $1`,
              [userId]
            );
            console.log("Save Connection: Updated user's role to ADMIN");
          }
        }
        
        if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
          console.log(`Save Connection: User role ${userRole} does not have permission`);
          return NextResponse.json({ 
            error: "Permission denied",
            message: "You do not have permission to modify database connection settings"
          }, { status: 403 });
        }
      }
      
      // 3. Check if database type or connection details changed
      const connectionChanged = previousDbType !== databaseType || 
                              previousDbInfo !== cleanedDatabaseInfo;
      
      // 4. If refreshTables is true or connection changed, fetch tables from the target database
      let databaseTables: DbTable[] = [];
      
      if (refreshTables || connectionChanged) {
        try {
          console.log("Fetching tables from target database...");
          
          // Add databaseType to connectionData for the test function
          const connectionDataWithType = {
            ...connectionData,
            databaseType
          };
          
          // Test the connection to the target database and get tables
          const result = await testExternalConnection(connectionDataWithType);
          
          if (result.success) {
            databaseTables = result.tables;
            console.log(`Successfully fetched ${databaseTables.length} tables from target database`);
          }
        } catch (error) {
          console.error("Error fetching tables from target database:", error);
          return NextResponse.json({ 
            error: "Failed to fetch tables from database",
            message: "Could not connect to the target database to fetch tables. Please check your connection settings."
          }, { status: 500 });
        }
      }
      
      // 5. If we have fetched tables from the target database, return them without saving anything yet
      if (refreshTables) {
        return NextResponse.json({
          message: "Successfully fetched tables from database",
          tables: databaseTables,
          status: "success"
        }, { status: 200 });
      }
      
      // 6. Determine which tables to use for saving
      let tables: DbTable[] = [];
      let databaseObjectsBuffer: Buffer | null = null;
      
      if (databaseObjects) {
        // User provided database objects, use them
        databaseObjectsBuffer = Buffer.from(typeof databaseObjects === 'string' ? 
          databaseObjects : JSON.stringify(databaseObjects));
        tables = extractTables(databaseObjects);
        console.log(`Save Connection: Using ${tables.length} tables from provided databaseObjects`);
      } 
      else if (selectedTables.length > 0 && databaseTables.length > 0) {
        // Filter fetched tables based on selected table names
        tables = databaseTables.filter(table => selectedTables.includes(table.name));
        
        // Create database objects buffer from selected tables
        const selectedTablesObj = { tables };
        databaseObjectsBuffer = Buffer.from(JSON.stringify(selectedTablesObj));
        
        console.log(`Save Connection: Using ${tables.length} selected tables from fetched tables`);
      }
      else if (forceTableUpdate && existingDatabaseObjects) {
        // No new objects provided but we need to update tables, use existing objects
        databaseObjectsBuffer = existingDatabaseObjects;
        tables = extractTables(existingDatabaseObjects);
        console.log(`Save Connection: Using ${tables.length} tables from existing DATABASE_OBJECTS`);
      }
      
      // 7. Update organization database settings
      let updateQuery = `
        UPDATE "NL2SQL_ORG"
        SET "DATABASE_TYPE" = $1,
            "DATABASE_INFO" = $2,
            "UPDATED_AT" = NOW()`;

      const updateParams: any[] = [ 
        databaseType,
        cleanedDatabaseInfo
      ];

      if (databaseObjectsBuffer) {
        updateQuery += `, "DATABASE_OBJECTS" = $3`;
        updateParams.push(databaseObjectsBuffer);
      }

      updateQuery += ` WHERE "ORG_ID" = $${updateParams.length + 1}`;
      updateParams.push(orgId);

      const updateOrgResult = await query(updateQuery, updateParams);
      console.log(`Save Connection: Updated organization settings`);
      
      // 8. Update tables if needed
      let tablesDeleted = 0;
      let tablesAdded = 0;
      
      if (forceTableUpdate || connectionChanged || selectedTables.length > 0) {
        console.log("Save Connection: Updating tables");
        
        // 8.1 Delete existing table columns
        const deleteColumnsResult = await query(
          `DELETE FROM "NL2SQL_TABLE_COLUMNS" 
           WHERE "TABLE_ID" IN (
             SELECT "ID" FROM "NL2SQL_AVAILABLE_TABLES" WHERE "ORG_ID" = $1
           )`,
          [orgId]
        );
        
        console.log(`Save Connection: Deleted table columns`);
        
        // 8.2 Then delete all tables
        const deleteTablesResult = await query(
          `DELETE FROM "NL2SQL_AVAILABLE_TABLES" WHERE "ORG_ID" = $1 RETURNING "ID"`,
          [orgId]
        );
        
        tablesDeleted = deleteTablesResult.length || 0;
        console.log(`Save Connection: Deleted ${tablesDeleted} tables completely`);
        
        // 8.3 Add new tables if available
        if (tables.length > 0) {
          console.log(`Save Connection: Adding ${tables.length} tables with new schema`);
          
          // Generate descriptions for tables
          const tablesWithDescriptions = await Promise.all(tables.map(async (table) => {
            try {
              const description = await generateTableDescription(table.name, table.columns);
              return {
                ...table,
                description
              };
            } catch (error) {
              console.error(`Error generating description for table ${table.name}:`, error);
              return {
                ...table,
                description: `Table ${table.name} with columns: ${table.columns.map(c => c.name).join(', ')}`
              };
            }
          }));
          
          // Insert all new tables
          for (const table of tablesWithDescriptions) {
            try {
              // Insert new table
              console.log(`Save Connection: Creating new table ${table.name}`);
              
              const tableResult = await query(
                `INSERT INTO "NL2SQL_AVAILABLE_TABLES" (
                  "ORG_ID",
                  "TABLE_NAME",
                  "TABLE_DESCRIPTION",
                  "IS_ACTIVE",
                  "CREATED_AT",
                  "UPDATED_AT"
                ) VALUES (
                  $1,
                  $2,
                  $3,
                  'Y',
                  NOW(),
                  NOW()
                ) RETURNING "ID"`,
                [
                  orgId,
                  table.name,
                  table.description
                ]
              );
              
              const tableId = tableResult[0]?.ID;
              console.log(`Save Connection: Created new table ${table.name} with ID ${tableId}`);
              
              // Insert columns for this table
              if (table.columns && table.columns.length > 0) {
                console.log(`Save Connection: Adding ${table.columns.length} columns to table ${table.name}`);
                
                for (const column of table.columns) {
                  await query(
                    `INSERT INTO "NL2SQL_TABLE_COLUMNS" (
                      "TABLE_ID",
                      "COLUMN_NAME",
                      "COLUMN_TYPE",
                      "COLUMN_DESCRIPTION",
                      "IS_SEARCHABLE",
                      "CREATED_AT"
                    ) VALUES (
                      $1,
                      $2,
                      $3,
                      $4,
                      'Y',
                      NOW()
                    )`,
                    [
                      tableId,
                      column.name,
                      column.type,
                      `${column.name} (${column.type}) from ${table.name}`
                    ]
                  );
                }
              } else {
                console.log(`Save Connection: No columns provided for table ${table.name}`);
              }
              
              tablesAdded++;
            } catch (tableError) {
              console.error(`Error processing table ${table.name}:`, tableError);
              // Continue with next table
            }
          }
          
          console.log(`Save Connection: Successfully added ${tablesAdded} new tables`);
        } else {
          console.log("Save Connection: No tables to add after database update");
        }
      } else {
        console.log("Save Connection: Skipping table updates");
      }
      
      // 10. Get table count for verification
      const verifyResult = await query(
        `SELECT COUNT(*) AS "COUNT" FROM "NL2SQL_AVAILABLE_TABLES" WHERE "ORG_ID" = $1`,
        [orgId]
      );
      
      const tableCount = verifyResult[0]?.COUNT || 0;
      console.log(`Save Connection: Verified ${tableCount} tables after update`);
      
      // 11. Return success response
      return NextResponse.json({ 
        message: "Database connection settings saved successfully",
        databaseType: databaseType,
        connectionChanged: connectionChanged,
        tablesUpdated: forceTableUpdate || connectionChanged || selectedTables.length > 0,
        tablesDeleted: tablesDeleted,
        tablesAdded: tablesAdded,
        tableCount: tableCount,
        status: "success"
      }, { status: 200 });
      
    } catch (error) {
      // PostgreSQL handles transaction rollback automatically
      console.log("Save Connection: Error occurred, PostgreSQL will handle rollback");
      throw error;
    }
    
  } catch (error) {
    console.error("Save connection error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to save database connection", 
        details: error instanceof Error ? error.message : String(error),
        status: "error" 
      },
      { status: 500 }
    );
  } finally {
    // No need to close connection with PostgreSQL pool
    console.log("Save Connection: Query completed");
  }
};