//app/aiquery/actions.ts
'use server';

import type { AIModel, Result, Config } from '@/lib/types';
import { query, exec, execWithOrgConnection, getOrgConnectionDetails, queryWithOrgConnection } from '@/lib/db';
import { optimizeSQLQuery, evaluateSQLQuery } from '@/lib/optimizer';

// Importar módulos LLM
import * as openaiLLM from './openai';
import * as reasonerLLM from './reasoner';
export type { AIModel };

/**
 * Fetch table data for a specific table
 */
export async function fetchTableData(
  tableName: string,
  orgId?: number,
  userId?: number,
  limit: number = 100
): Promise<Result[]> {
  try {
    console.log(`Fetching data for table ${tableName} with orgId ${orgId}`);
    
    // If orgId is provided, use it directly
    let effectiveOrgId = orgId;
    
    // Otherwise, try to get it from userId
    if (!effectiveOrgId && userId) {
      effectiveOrgId = await getUserOrgId(userId);
    }
    
    // If we still don't have an orgId, we can't proceed
    if (!effectiveOrgId) {
      console.error('No organization ID available to fetch table data');
      return [];
    }
    
    // Construct a simple SELECT query for the table with limit (using PostgreSQL syntax)
    const sqlQuery = `SELECT * FROM ${tableName} LIMIT ${limit}`;
    
    // Get connection details for this organization
    const connDetails = await getOrgConnectionDetails(effectiveOrgId);
    if (!connDetails) {
      console.error(`No connection details found for org ${effectiveOrgId}`);
      return [];
    }
    
    console.log(`Executing query: ${sqlQuery}`);
    
    // Execute the query using the organization's connection
    const startTime = Date.now();
    // Use the type-safe query function for PostgreSQL
    const result = await queryWithOrgConnection(effectiveOrgId, connDetails, sqlQuery, []);
    const executionTime = Date.now() - startTime;
    
    // Log and update performance metrics
    // With our updated function signatures, result is guaranteed to be an array
    const rowCount = result.length;
    console.log(`Query executed in ${executionTime}ms, returned ${rowCount} rows`);
    await updateQueryPerformance(effectiveOrgId, true, executionTime);
    
    // Save this query in the history
    if (userId) {
      await saveQuery(
        effectiveOrgId,
        userId,
        `View data for ${tableName}`,
        sqlQuery,
        'SUCCESS',
        null,
        executionTime,
        rowCount // Use the safely calculated rowCount instead of result?.length
      );
    }
    
    return result || [];
  } catch (error) {
    console.error('Error fetching table data:', error);
    
    // Update performance metrics for failed query
    if (orgId) {
      await updateQueryPerformance(orgId, false, 0);
    }
    
    // Save the failed query if userId is provided
    if (userId && orgId) {
      await saveQuery(
        orgId,
        userId,
        `View data for ${tableName}`,
        `SELECT * FROM ${tableName} WHERE ROWNUM <= ${limit}`,
        'ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        0,
        0
      );
    }
    
    return [];
  }
}

/**
 * Recuperar el ID de organización del usuario
 */
async function getUserOrgId(userId: number): Promise<number | undefined> {
  try {
    if (!userId) {
      console.log("No userId provided, cannot get orgId");
      return undefined;
    }
    
    console.log(`Getting organization ID for user ${userId}`);
    const result = await query(
      `SELECT "ORG_ID" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
      [userId]
    );
    
    if (result && result.length > 0 && result[0].ORG_ID) {
      console.log(`Found orgId: ${result[0].ORG_ID} for user ${userId}`);
      return result[0].ORG_ID;
    }
    
    console.log(`No organization found for user ${userId}`);
    return undefined;
  } catch (error) {
    console.error("Error getting user organization:", error);
    return undefined;
  }
}

/**
 * Guardar consulta en la tabla NL2SQL_QUERIES
 */
async function saveQuery(
  orgId: number,
  userId: number,
  queryText: string,
  sqlGenerated: string,
  executionStatus: string,
  errorMessage: string | null,
  executionTime: number,
  rowsReturned: number
): Promise<void> {
  try {
    console.log(`Saving query for user ${userId}, org ${orgId}`);
    
    await query(
      `INSERT INTO "NL2SQL_QUERIES" (
        "ORG_ID", "USER_ID", "QUERY_TEXT", "SQL_GENERATED", 
        "EXECUTION_STATUS", "ERROR_MESSAGE", "EXECUTION_TIME", 
        "ROWS_RETURNED", "EXECUTION_DATE", "CREATED_AT"
      ) VALUES (
        $1, $2, $3, $4, 
        $5, $6, $7, 
        $8, CURRENT_TIMESTAMP, CURRENT_DATE
      )`,
      [
        orgId, 
        userId, 
        queryText, 
        sqlGenerated, 
        executionStatus, 
        errorMessage, 
        executionTime, 
        rowsReturned
      ]
    );
    
    console.log('Query saved successfully');
  } catch (error) {
    console.error('Error saving query:', error);
  }
}

/**
 * Actualizar estadísticas de rendimiento de consultas en NL2SQL_QUERY_PERFORMANCE
 */
async function updateQueryPerformance(
  orgId: number,
  isSuccessful: boolean,
  executionTime: number
): Promise<void> {
  try {
    // Obtener fecha actual en formato YYYY-MM-DD
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    console.log(`Updating query performance for org ${orgId}, date ${currentDate.toISOString()}`);
    
    // Verificar si existe un registro para hoy
    const existingRecord = await query(
      `SELECT "ID" FROM "NL2SQL_QUERY_PERFORMANCE" 
       WHERE "ORG_ID" = $1 
       AND DATE_TRUNC('day', "DATE_PERIOD"::timestamp) = DATE_TRUNC('day', $2::timestamp) 
       AND "PERIOD_TYPE" = 'daily'`,
      [orgId, currentDate]
    );
    
    if (existingRecord && existingRecord.length > 0) {
      // Actualizar registro existente
      await query(
        `UPDATE "NL2SQL_QUERY_PERFORMANCE" SET 
         "TOTAL_QUERIES" = "TOTAL_QUERIES" + 1, 
         "SUCCESSFUL_QUERIES" = "SUCCESSFUL_QUERIES" + $1, 
         "FAILED_QUERIES" = "FAILED_QUERIES" + $2, 
         "AVG_EXECUTION_TIME" = ("AVG_EXECUTION_TIME" * "TOTAL_QUERIES" + $3) / ("TOTAL_QUERIES" + 1), 
         "UPDATED_AT" = CURRENT_TIMESTAMP 
         WHERE "ID" = $4`,
        [
          isSuccessful ? 1 : 0, 
          isSuccessful ? 0 : 1, 
          executionTime, 
          existingRecord[0].ID
        ]
      );
    } else {
      // Crear nuevo registro
      await query(
        `INSERT INTO "NL2SQL_QUERY_PERFORMANCE" (
          "ORG_ID", "DATE_PERIOD", "PERIOD_TYPE", 
          "TOTAL_QUERIES", "SUCCESSFUL_QUERIES", "FAILED_QUERIES", 
          "AVG_EXECUTION_TIME", "CREATED_AT", "UPDATED_AT"
        ) VALUES (
          $1, $2, 'daily', 
          1, $3, $4, 
          $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )`,
        [
          orgId, 
          currentDate, 
          isSuccessful ? 1 : 0, 
          isSuccessful ? 0 : 1, 
          executionTime
        ]
      );
    }
    
    console.log('Query performance updated successfully');
  } catch (error) {
    console.error('Error updating query performance:', error);
  }
}

/**
 * Función auxiliar para devolver el módulo LLM adecuado
 */
function getLLM(model: AIModel) {
  switch (model) {
    case 'openai':
      return openaiLLM;
    case 'reasoner':
      return reasonerLLM;
    default:
      throw new Error('Unknown AI model');
  }
}

function stripLeadingComments(query: string): string {
  const lines = query.split('\n').map((line) => line.trim());
  const nonCommentLines = lines.filter(
    (line) => line && !line.startsWith('--')
  );
  return nonCommentLines.join(' ').trim();
}

/**
 * Generar consulta SQL (SELECT) basada en entradas de usuario y modelo especificado
 */
export const generateQuery = async (
  input: string,
  model: AIModel,
  userId?: number
): Promise<string> => {
  'use server';
  console.log(`generateQuery called with userId: ${userId}`);
  
  // Obtener ID de organización del usuario si está disponible
  const orgId = userId ? await getUserOrgId(userId) : undefined;
  console.log(`Resolved orgId: ${orgId} for query generation`);
  
  const llm = getLLM(model);
  return await llm.generateQuery(input, orgId);
};

/**
 * Explicar la consulta generada basada en entradas de usuario y modelo especificado
 */
export const explainQuery = async (
  input: string,
  sqlQuery: string,
  model: AIModel,
  userId?: number
): Promise<string> => {
  'use server';
  // Obtener ID de organización del usuario si está disponible
  const orgId = userId ? await getUserOrgId(userId) : undefined;
  
  const llm = getLLM(model);
  return await llm.explainQuery(input, sqlQuery, orgId);
};

/**
 * Generar configuración de gráfico basada en resultados de consulta y modelo especificado
 */
export const generateChartConfig = async (
  results: Result[],
  userQuery: string,
  model: AIModel,
  userId?: number
): Promise<{ config: Config }> => {
  'use server';
  // Obtener ID de organización del usuario si está disponible
  const orgId = userId ? await getUserOrgId(userId) : undefined;
  
  const llm = getLLM(model);
  return await llm.generateChartConfig(results, userQuery, orgId);
};

/**
 * Generar descripción de correo electrónico basada en pregunta y modelo especificado
 */
export const generateEmailDescription = async (
  question: string,
  model: AIModel,
  userId?: number
): Promise<string> => {
  'use server';
  // Obtener ID de organización del usuario si está disponible
  const orgId = userId ? await getUserOrgId(userId) : undefined;
  
  const llm = getLLM(model);
  return await llm.generateEmailDescription(question, orgId);
};

/**
 * Generar consulta DML (INSERT/UPDATE/DELETE) basada en entradas de usuario y modelo especificado
 */
export const generateDMLQuery = async (
  input: string,
  model: AIModel,
  userId?: number
): Promise<string> => {
  'use server';
  // Obtener ID de organización del usuario si está disponible
  const orgId = userId ? await getUserOrgId(userId) : undefined;
  
  const llm = getLLM(model);
  return await llm.generateDMLQuery(input, orgId);
};

/**
 * Generar informe de acciones DML basado en entradas de usuario y datos proporcionados
 */
export const generateDatabaseActionReport = async (
  question: string,
  statementsCount: number,
  rowsAffected: number,
  executionMessage: string,
  model: AIModel,
  userId?: number
): Promise<string> => {
  'use server';
  // Obtener ID de organización del usuario si está disponible
  const orgId = userId ? await getUserOrgId(userId) : undefined;
  
  const llm = getLLM(model);
  return await llm.generateDatabaseActionReport(
    question,
    statementsCount,
    rowsAffected,
    executionMessage,
    orgId
  );
};

/**
 * Ejecutar consulta SQL (SELECT) en la base de datos (PostgreSQL o Oracle)
 */
export const runGenerateSQLQuery = async (
  sqlQueryString: string,
  userQuestion: string,
  userId?: number
): Promise<Result[]> => {
  'use server';
  console.log(`runGenerateSQLQuery called with userId: ${userId}`);
  
  // Obtener ID de organización si se proporciona un ID de usuario
  const orgId = userId ? await getUserOrgId(userId) : undefined;
  console.log(`Resolved orgId: ${orgId} for query execution`);
  
  // Eliminar punto y coma final y espacios en blanco
  const cleaned = sqlQueryString.trim().replace(/;$/, '');

  // Limpiar consulta para validación
  const cleanedForValidation = stripLeadingComments(cleaned);
  const lower = cleanedForValidation.toLowerCase();

  // Validar: permitir solo consultas que comiencen con SELECT o WITH (CTE)
  if (
    !(lower.startsWith('select') || lower.startsWith('with')) ||
    /(\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\balter\b|\btruncate\b|\bcreate\b|\bgrant\b|\brevoke\b)/.test(
      lower
    )
  ) {
    throw new Error('Only safe, read-only queries are allowed');
  }

  // Determinar el tipo de base de datos antes de optimizar
  let databaseType = 'postgres'; // Valor predeterminado
  let schemaOwner = '';
  
  if (orgId) {
    const orgDetails = await getOrgConnectionDetails(orgId);
    if (orgDetails) {
      // Determinar el tipo de base de datos basado en la información de conexión
      if (orgDetails.connectString) {
        databaseType = 'oracle';
        schemaOwner = orgDetails.user?.toUpperCase() || '';
        console.log(`Detected Oracle database for org ${orgId}, schema owner: ${schemaOwner}`);
      } else if (orgDetails.host && orgDetails.port === '5432') {
        databaseType = 'postgres';
      }
    }
  }

  // Optimizar consulta según el tipo de base de datos
  let optimizedQuery = await optimizeSQLQuery(cleaned);
  console.log(`Original Optimized Query: ${optimizedQuery}`);
  
  // Validar sintaxis de la consulta con la base de datos real
  console.log(`Using organization ${orgId} connection for syntax check`);
  
  // Evaluar consulta optimizada
  const evaluation = await evaluateSQLQuery(optimizedQuery, userQuestion, orgId);
  console.log(
    'Query Evaluation:',
    evaluation.explanation,
    'Score:',
    evaluation.score
  );

  // Log the evaluation score and explanation
  console.log(`Query evaluation score: ${evaluation.score}`);
  
  // Proceed with query execution even if score is lower than ideal
  // This allows queries to run even when database connection issues prevent full validation
  if (evaluation.score < 3) {
    throw new Error(
      'The generated query has significant issues. Please refine your request.'
    );
  }

  // Ejecutar consulta optimizada con conexión adecuada basada en orgId
  try {
    const startTime = Date.now();
    let data: Result[] = [];
    
    // Si tenemos un ID de organización, intentamos usar la conexión específica
    if (orgId) {
      const orgDetails = await getOrgConnectionDetails(orgId);
      
      if (orgDetails) {
        console.log(`Using org ${orgId} connection for query execution`);
        // Execute query with organization-specific connection
        data = await queryWithOrgConnection(orgId, orgDetails, optimizedQuery, []);
      } else {
        console.log('No org details found, falling back to default connection');
        // Fall back to default connection
        data = await query(optimizedQuery, []);
      }
    } else {
      // Sin orgId, usar conexión predeterminada
      console.log('No orgId provided, using default connection');
      // Use default connection
      data = await query(optimizedQuery, []);
    }
    
    // Ensure data is an array
    if (!Array.isArray(data)) {
      console.warn('Query result is not an array, converting to empty array');
      data = [];
    }

    const executionTime = (Date.now() - startTime) / 1000; // Convertir a segundos

    // Formatear filas de resultados (fechas, números, etc.)
    const formattedData = data.map((row: any) => {
      const formattedRow = { ...row };
      Object.keys(formattedRow).forEach((key) => {
        if (formattedRow[key] instanceof Date) {
          formattedRow[key] = formattedRow[key].toLocaleDateString();
        }
        if (
          typeof formattedRow[key] === 'number' &&
          formattedRow[key] >= 1000 &&
          formattedRow[key] <= 9999
        ) {
          formattedRow[key] = formattedRow[key].toString();
        }
        if (
          typeof formattedRow[key] === 'number' &&
          !Number.isInteger(formattedRow[key])
        ) {
          formattedRow[key] = Number(formattedRow[key].toFixed(2));
        }
      });
      return formattedRow;
    });

    // Guardar información de consulta si se proporcionan userId y orgId
    if (userId && orgId) {
      await saveQuery(
        orgId,
        userId,
        userQuestion,
        optimizedQuery,
        'SUCCESS',
        null,
        executionTime,
        formattedData.length
      );
      
      // Actualizar métricas de rendimiento de consultas
      await updateQueryPerformance(orgId, true, executionTime);
    }

    return formattedData as Result[];
  } catch (err: any) {
    // Guardar consulta fallida si se proporcionan userId y orgId
    if (userId && orgId) {
      const errorMessage = err.message || 'Unknown error';
      await saveQuery(
        orgId,
        userId,
        userQuestion,
        sqlQueryString,
        'FAILED',
        errorMessage,
        0,
        0
      );
      
      // Actualizar métricas de rendimiento para consulta fallida
      await updateQueryPerformance(orgId, false, 0);
    }
    
    // Mejorar los mensajes de error para facilitar la depuración
    if (err.message) {
      if (err.message.includes('relation') || err.message.includes('does not exist') || err.message.includes('ORA-00942')) {
        console.log('Table or view does not exist or is not accessible.');
        throw new Error('Table or view does not exist or is not accessible in the database');
      } else if (err.message.includes('ORA-00905')) {
        console.log('SQL syntax error: missing keyword');
        throw new Error('The query contains syntax errors and does not adhere to SQL standards');
      }
    }
    throw err;
  }
};

/**
 * Ejecutar consulta DML (INSERT/UPDATE/DELETE) en la base de datos PostgreSQL
 */
export const runDMLQuery = async (
  sqlQueryString: string,
  userId?: number
): Promise<{
  statementsCount: number;
  rowsAffected: number;
  message: string;
}> => {
  'use server';
  // Obtener ID de organización si se proporciona un ID de usuario
  const orgId = userId ? await getUserOrgId(userId) : undefined;
  
  const cleanQuery = sqlQueryString.replace(/;+\s*$/, '');
  
  try {
    const startTime = Date.now();
    let result: {rowCount: number};
    
    // Si tenemos un ID de organización, intentamos usar la conexión específica
    if (orgId) {
      const orgDetails = await getOrgConnectionDetails(orgId);
      
      if (orgDetails) {
        console.log(`Using org connection for DML execution, orgId: ${orgId}`);
        // Use the DML-specific function for organization connections
        result = await execWithOrgConnection(orgId, orgDetails, cleanQuery, []);
      } else {
        console.log('No org details found, falling back to default connection');
        // Use the DML-specific function for the default connection
        result = await exec(cleanQuery, []);
      }
    } else {
      // Sin orgId, usar conexión predeterminada
      console.log('No orgId provided, using default connection');
      // Use the DML-specific function for the default connection
      result = await exec(cleanQuery, []);
    }
    
    const executionTime = (Date.now() - startTime) / 1000; // Convertir a segundos
    // PostgreSQL devuelve rowCount en lugar de rowsAffected
    const rowsAffected = result.rowCount;
    
    // Guardar información de consulta DML si se proporcionan userId y orgId
    if (userId && orgId) {
      await saveQuery(
        orgId,
        userId,
        'DML Operation', // No hay pregunta para operaciones DML en la interfaz actual
        cleanQuery,
        'SUCCESS',
        null,
        executionTime,
        rowsAffected
      );
      
      // Actualizar métricas de rendimiento de consultas
      await updateQueryPerformance(orgId, true, executionTime);
    }
    
    return {
      statementsCount: 1,
      rowsAffected: rowsAffected,
      message: 'DML operation executed successfully.',
    };
  } catch (err: any) {
    console.error(err);
    
    // Guardar consulta DML fallida si se proporcionan userId y orgId
    if (userId && orgId) {
      const errorMessage = err.message || 'Unknown error';
      await saveQuery(
        orgId,
        userId,
        'DML Operation', // No hay pregunta para operaciones DML en la interfaz actual
        cleanQuery,
        'FAILED',
        errorMessage,
        0,
        0
      );
      
      // Actualizar métricas de rendimiento para consulta fallida
      await updateQueryPerformance(orgId, false, 0);
    }
    
    throw new Error(err.message || 'Failed to execute DML query');
  }
};