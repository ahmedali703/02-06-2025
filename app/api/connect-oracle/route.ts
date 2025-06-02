//app/api/connect-oracle/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const POST = async (req: NextRequest) => {
  try {
    // Parse Oracle connection details from request
    let { user, password, connectString } = await req.json();
    
    user = user.toUpperCase(); 

    // Dynamically import oracledb only when needed
    const oracledb = await import('oracledb');

    // Create connection to Oracle database
    const connection = await oracledb.default.getConnection({
      user,
      password,
      connectionString: connectString,
    });

    // Query to get table and column information from Oracle
    const result = await connection.execute(
      `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
       FROM ALL_TAB_COLUMNS
       WHERE OWNER = :owner
       ORDER BY TABLE_NAME, COLUMN_ID`,
      { owner: user } 
    );

    // Close the connection
    await connection.close();


    // Format the schema from Oracle results
    const formattedSchema = result.rows.reduce((acc: Record<string, string[]>, [table, column, type]: [string, string, string]) => {
      acc[table] = acc[table] || [];
      acc[table].push(`${column} ${type}`);
      return acc;
    }, {} as Record<string, string[]>);

    let schemaString = `export const ${user.toLowerCase()}Schema = \n\n`;
    for (const table in formattedSchema) {
      schemaString += `${table}(\n${formattedSchema[table].join(',\n')}\n);\n\n`;
    }
    schemaString += ';';

    return NextResponse.json({ schema: schemaString }, { status: 200 });
  } catch (error) {
    console.error('Oracle database connection failed:', error);
    return NextResponse.json({ 
      error: 'Oracle database connection failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
};