//lib/schema.ts
import { query, getOrgConnectionDetails, queryWithOrgConnection } from "./db";
import oracledb from 'oracledb';

/**
 * استرجاع مخطط قاعدة البيانات
 * يحصل على الجداول والأعمدة المتاحة للمؤسسة من قاعدة البيانات المركزية
 * ويحاول التحقق من وجود الجداول الفعلية في قاعدة بيانات المؤسسة
 */
export async function getDatabaseSchema(orgId?: number) {
  try {
    // دائماً استخدم الاتصال الافتراضي لجلب البيانات الوصفية للجداول والأعمدة
    console.log(`Using default connection to fetch metadata tables`);
    let tables: any[] = [];
    let columns: any[] = [];
    
    if (orgId) {
      try {
        // استرجاع الجداول المتاحة للمؤسسة المحددة من قاعدة البيانات المركزية
        console.log(`Fetching available tables for organization ${orgId}`);
        
        // أولاً، نتحقق من وجود أي جداول للمؤسسة بغض النظر عن حالة التنشيط
        const allTables = await query("SELECT * FROM \"NL2SQL_AVAILABLE_TABLES\" WHERE \"ORG_ID\" = $1", [orgId]);
        console.log(`Found ${allTables ? allTables.length : 0} total tables for organization ${orgId} (including inactive)`);
        
        // ثم نجلب الجداول النشطة فقط
        tables = await query("SELECT * FROM \"NL2SQL_AVAILABLE_TABLES\" WHERE \"ORG_ID\" = $1 AND \"IS_ACTIVE\" = 'Y'", [orgId]);
        console.log(`Found ${tables ? tables.length : 0} active tables for organization ${orgId}`);
        
        // طباعة تفاصيل الجداول للتشخيص
        if (tables && tables.length > 0) {
          console.log('Tables details:', JSON.stringify(tables, null, 2));
        } else if (allTables && allTables.length > 0) {
          console.log('All tables (including inactive):', JSON.stringify(allTables, null, 2));
          // إذا كانت هناك جداول غير نشطة، نستخدمها مؤقتًا للعرض
          tables = allTables;
          console.log('Using all tables including inactive for display');
        }
        
        if (tables && tables.length > 0) {
          // استخدام معاملات بدلاً من تضمين القيم مباشرة
          const tableIds = tables.map((table: any) => table.ID);
          console.log(`Fetching columns for tables with IDs: ${tableIds.join(', ')}`);
          
          if (tableIds.length > 0) {
            const placeholders = tableIds.map((_, idx) => `$${idx + 1}`).join(',');
            columns = await query(`SELECT * FROM \"NL2SQL_TABLE_COLUMNS\" WHERE \"TABLE_ID\" IN (${placeholders})`, tableIds);
            console.log(`Found ${columns ? columns.length : 0} columns for the tables`);
          }
        } else {
          console.log(`No available tables found for organization ${orgId}`);
          tables = [];
          columns = [];
        }
      } catch (error) {
        console.error(`Error fetching tables and columns for organization ${orgId}:`, error);
        tables = [];
        columns = [];
      }
      
      console.log(`Found ${tables.length} tables and ${columns ? columns.length : 0} columns in central database for organization ${orgId}`);
      
      // إذا وجدنا الجداول، نحاول التحقق من الجداول الفعلية في قاعدة بيانات المؤسسة
      if (tables.length > 0) {
        try {
          const orgDetails = await getOrgConnectionDetails(orgId);
          if (orgDetails) {
            console.log(`Validating actual database connection for organization ${orgId}`);
            
            // استعلام للتحقق من وجود الجداول المتوقعة في قاعدة بيانات المؤسسة
            // هذا الاستعلام يعمل مع Oracle وسيحتاج للتعديل للعمل مع أنواع أخرى من قواعد البيانات
            try {
              // تحديد نوع قاعدة البيانات
              let databaseType = 'postgres'; // افتراضي
              if (orgDetails.connectString) {
                databaseType = 'oracle';
              }
              
              let actualTablesQuery = '';
              let actualTables: any[] = [];
              
              if (databaseType === 'oracle') {
                try {
                  // نحاول استخدام استعلامات مختلفة للحصول على قائمة الجداول في Oracle
                  
                  // Intentar diferentes consultas para obtener tablas en Oracle
                  console.log(`Trying multiple approaches to query tables in Oracle`);
                  let result = [];
                  
                  // Crear conexión directa a Oracle sin usar adaptSqlForOracle
                  try {
                    const connection = await oracledb.getConnection({
                      user: orgDetails.user,
                      password: orgDetails.password,
                      connectString: orgDetails.connectString
                    });
                    
                    try {
                      // Intento 1: USER_TABLES (tablas propias del usuario)
                      try {
                        console.log(`Trying USER_TABLES`);
                        const userTablesQuery = `SELECT TABLE_NAME FROM USER_TABLES`;
                        const queryResult = await connection.execute(userTablesQuery, []);
                        result = queryResult.rows || [];
                        console.log(`Successfully queried USER_TABLES, found ${result.length} tables`);
                      } catch (userTablesErr) {
                        console.log(`USER_TABLES query failed, trying USER_OBJECTS`);
                        
                        // Intento 2: USER_OBJECTS (objetos del usuario de tipo TABLE)
                        try {
                          const userObjectsQuery = `SELECT OBJECT_NAME AS TABLE_NAME FROM USER_OBJECTS WHERE OBJECT_TYPE = 'TABLE'`;
                          const objectsResult = await connection.execute(userObjectsQuery, []);
                          result = objectsResult.rows || [];
                          console.log(`Successfully queried USER_OBJECTS, found ${result.length} tables`);
                        } catch (userObjectsErr) {
                          console.log(`USER_OBJECTS query failed, trying simple test query`);
                          
                          // Intento 3: Verificar si al menos podemos ejecutar una consulta simple
                          const testQuery = `SELECT 1 FROM DUAL`;
                          await connection.execute(testQuery, []);
                          console.log(`Connection to Oracle successful, but cannot access table information`);
                        }
                      }
                    } finally {
                      await connection.close();
                    }
                  } catch (err: any) {
                    console.log(`Failed to connect to Oracle: ${err.message}`);
                    
                    // Si todo falla, intentamos una conexión simple para verificar la conectividad
                    try {
                      console.log(`Trying basic connection test`);
                      const connection = await oracledb.getConnection({
                        user: orgDetails.user,
                        password: orgDetails.password,
                        connectString: orgDetails.connectString
                      });
                      
                      try {
                        await connection.ping();
                        console.log(`Basic Oracle connection test successful, but cannot query tables`);
                      } finally {
                        await connection.close();
                      }
                    } catch (connErr: any) {
                      console.log(`Basic Oracle connection test failed: ${connErr.message}`);
                    }
                  }
                  
                  // تحويل أسماء الجداول إلى أحرف صغيرة للمقارنة
                  actualTables = result.map((row: any) => ({
                    table_name: row.TABLE_NAME?.toLowerCase() || ''
                  }));
                } catch (error: any) {
                  console.error(`Error querying Oracle tables: ${error.message || 'Unknown error'}`);
                  // لا نفشل العملية بالكامل، بل نستمر مع قائمة فارغة
                  actualTables = [];
                }
              } else {
                // PostgreSQL يستخدم information_schema للاستعلام عن الجداول
                actualTablesQuery = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
                actualTables = await queryWithOrgConnection(orgId, orgDetails, actualTablesQuery, []);
              }
              
              if (actualTables && actualTables.length > 0) {
                // التحقق من وجود الجداول المتوقعة في قاعدة بيانات المؤسسة
                const actualTableNames = actualTables.map((t: any) => t.table_name.toLowerCase());
                // تحويل أسماء الجداول المتوقعة إلى أحرف صغيرة للمقارنة
                const expectedTableNames = tables.map((t: any) => t.TABLE_NAME.toLowerCase());
                
                // جداول متوقعة موجودة في قاعدة البيانات الفعلية
                const existingTables = expectedTableNames.filter((name: string) => actualTableNames.includes(name));
                
                console.log(`Validated actual database: Found ${actualTables.length} tables in total.`);
                console.log(`${existingTables.length} out of ${expectedTableNames.length} expected tables exist in the actual database.`);
              }
            } catch (schemaError: unknown) {
              // هذا ليس خطأ حرجاً، نحن فقط نتحقق من وجود الجداول
              const errorMessage = schemaError instanceof Error ? schemaError.message : String(schemaError);
              console.warn(`Could not validate tables in organization database: ${errorMessage}`);
            }
          }
        } catch (connError: unknown) {
          const errorMessage = connError instanceof Error ? connError.message : String(connError);
          console.warn(`Could not connect to organization database: ${errorMessage}`);
          // هذا التحذير فقط للمعلومات، نستمر في استخدام البيانات من قاعدة البيانات المركزية
        }
      }
    } else {
      // إذا لم يتم تحديد orgId، استرجع جميع الجداول والأعمدة
      tables = await query(`SELECT * FROM "NL2SQL_AVAILABLE_TABLES"`);
      columns = await query(`SELECT * FROM "NL2SQL_TABLE_COLUMNS"`);
      console.log("Default schema: Retrieved all tables and columns");
    }
    
    return { tables, columns };
  } catch (error) {
    console.error("Error fetching database schema:", error);
    return { tables: [], columns: [] };
  }
}

/**
 * تنسيق مخطط قاعدة البيانات للاستخدام في نموذج اللغة الكبير
 * يحول الجداول والأعمدة إلى نص وصفي يمكن استخدامه في الـ prompt
 */
export function formatSchemaForPrompt(schema: { tables: any[]; columns: any[] }): string {
  let prompt = "";

  if (!schema.tables || schema.tables.length === 0) {
    return "No tables available. Please check your database configuration.";
  }
  
  // تنسيق كل جدول وأعمدته
  schema.tables.forEach((table) => {
    // التحقق من وجود الحقول المطلوبة
    const tableName = table.TABLE_NAME || table.table_name || 'Unknown';
    const tableId = table.ID || table.id || 0;
    const tableDesc = table.TABLE_DESCRIPTION || table.table_description || 'N/A';
    
    prompt += `Table: ${tableName} (ID: ${tableId})\n`;
    prompt += `Description: ${tableDesc}\n`;
    prompt += `Columns:\n`;
    
    // استرجاع أعمدة هذا الجدول
    let tableColumns = [];
    if (schema.columns && Array.isArray(schema.columns)) {
      tableColumns = schema.columns.filter((col) => {
        const colTableId = col.TABLE_ID || col.table_id;
        return Number(colTableId) === Number(tableId);
      });
    }
    
    if (tableColumns && tableColumns.length > 0) {
      tableColumns.forEach((col) => {
        const colName = col.COLUMN_NAME || col.column_name || 'Unknown';
        const colType = col.COLUMN_TYPE || col.column_type || 'Unknown';
        const colDesc = col.COLUMN_DESCRIPTION || col.column_description || '';
        
        prompt += `  - ${colName} (${colType})`;
        if (colDesc) {
          prompt += `: ${colDesc}`;
        }
        prompt += `\n`;
      });
    } else {
      prompt += `  No columns found for this table.\n`;
    }
    prompt += `\n`;
  });

  // سجل معلومات عن عدد الجداول التي تم تنسيقها
  console.log(`Formatted schema with ${schema.tables.length} tables`);
  if (schema.tables.length > 0) {
    console.log(`Generated schema summary from organization database`);
  }
  
  return prompt;
}