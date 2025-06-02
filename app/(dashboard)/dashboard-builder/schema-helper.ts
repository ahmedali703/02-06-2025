//app/dashboard-builder/schema-helper.ts
import { query, getOrgConnectionDetails, queryWithOrgConnection } from "@/lib/db";

/**
 * استرجاع مخطط قاعدة البيانات الفعلي للداشبورد
 * يستخدم نفس منطق aiquery للحصول على schema بدون الحاجة لجدول NL2SQL_DATA_SOURCES
 */
export async function getActualDatabaseSchema(dataSourceId: number) {
  try {
    console.log(`Getting database schema for data source ${dataSourceId}`);
    
    // استخدام dataSourceId كـ orgId مباشرة
    const orgId = dataSourceId;
    console.log(`Using organization ${orgId} for data source ${dataSourceId}`);
    
    // استخدام نفس منطق aiquery للحصول على الجداول والأعمدة
    let tables: any[] = [];
    let columns: any[] = [];
    
    try {
      // استرجاع الجداول المتاحة للمؤسسة من قاعدة البيانات المركزية
      console.log(`Fetching available tables for organization ${orgId}`);
      
      // أولاً، نتحقق من وجود أي جداول للمؤسسة بغض النظر عن حالة التنشيط
      const allTables = await query(
        "SELECT * FROM \"NL2SQL_AVAILABLE_TABLES\" WHERE \"ORG_ID\" = $1", 
        [orgId]
      );
      console.log(`Found ${allTables ? allTables.length : 0} total tables for organization ${orgId}`);
      
      // ثم نجلب الجداول النشطة فقط
      tables = await query(
        "SELECT * FROM \"NL2SQL_AVAILABLE_TABLES\" WHERE \"ORG_ID\" = $1 AND \"IS_ACTIVE\" = 'Y'", 
        [orgId]
      );
      console.log(`Found ${tables ? tables.length : 0} active tables for organization ${orgId}`);
      
      // إذا لم نجد جداول نشطة، استخدم جميع الجداول مؤقتاً
      if ((!tables || tables.length === 0) && allTables && allTables.length > 0) {
        console.log('Using all tables including inactive for display');
        tables = allTables;
      }
      
      if (tables && tables.length > 0) {
        // استرجاع الأعمدة للجداول
        const tableIds = tables.map((table: any) => table.ID);
        console.log(`Fetching columns for tables with IDs: ${tableIds.join(', ')}`);
        
        if (tableIds.length > 0) {
          const placeholders = tableIds.map((_, idx) => `${idx + 1}`).join(',');
          columns = await query(
            `SELECT * FROM "NL2SQL_TABLE_COLUMNS" WHERE "TABLE_ID" IN (${placeholders})`, 
            tableIds
          );
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
    
    console.log(`Retrieved ${tables.length} tables and ${columns ? columns.length : 0} columns`);
    
    return { 
      success: true, 
      tables, 
      columns,
      orgId 
    };
  } catch (error) {
    console.error("Error fetching database schema for dashboard:", error);
    return { 
      success: false, 
      tables: [], 
      columns: [] 
    };
  }
}

/**
 * تنسيق مخطط قاعدة البيانات للاستخدام في نموذج اللغة الكبير
 * يحول الجداول والأعمدة إلى نص وصفي يمكن استخدامه في الـ prompt
 */
export async function formatActualSchemaForPrompt(schema: { 
  success: boolean; 
  tables: any[]; 
  columns: any[];
  orgId?: number;
}): Promise<string> {
  if (!schema.success || !schema.tables || schema.tables.length === 0) {
    return "No tables available. Please check your database configuration.";
  }
  
  let prompt = "";
  
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

  console.log(`Formatted schema with ${schema.tables.length} tables for dashboard generation`);
  
  return prompt;
}

/**
 * التحقق من صحة اتصال قاعدة البيانات للمؤسسة
 */
export async function validateDatabaseConnection(orgId: number): Promise<boolean> {
  try {
    const orgDetails = await getOrgConnectionDetails(orgId);
    
    if (!orgDetails) {
      console.log(`No connection details found for organization ${orgId}`);
      return false;
    }
    
    // محاولة تنفيذ استعلام بسيط للتحقق من الاتصال
    const testQuery = orgDetails.connectString ? 
      'SELECT 1 FROM DUAL' :  // Oracle
      'SELECT 1';             // PostgreSQL
    
    await queryWithOrgConnection(orgId, orgDetails, testQuery, []);
    console.log(`Database connection validated for organization ${orgId}`);
    return true;
  } catch (error) {
    console.error(`Database connection validation failed for organization ${orgId}:`, error);
    return false;
  }
}