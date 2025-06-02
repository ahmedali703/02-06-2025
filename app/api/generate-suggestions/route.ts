// app/api/generate-suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getDatabaseSchema, formatSchemaForPrompt } from '@/lib/schema';
import { query as oracleQuery } from '@/lib/db';
import { cookies } from 'next/headers';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Función para obtener el orgId del usuario actual
async function getUserOrgIdFromCookie(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get('userId');
    
    if (!userIdCookie) {
      console.log('No userId cookie found');
      return null;
    }
    
    const userId = parseInt(userIdCookie.value, 10);
    console.log(`Got userId from cookie: ${userId}`);
    
    // Obtener orgId del usuario desde la base de datos
    const result = await oracleQuery(
      `SELECT "ORG_ID" FROM "NL2SQL_USERS" WHERE "ID" = $1`,
      [userId]
    );
    
    if (result && result.length > 0 && result[0].ORG_ID) {
      console.log(`Found orgId: ${result[0].ORG_ID} for user ${userId}`);
      return result[0].ORG_ID;
    }
    
    console.log(`No organization found for user ${userId}`);
    return null;
  } catch (error) {
    console.error("Error getting organization from cookie:", error);
    return null;
  }
}

export const POST = async (req: NextRequest) => {
  try {
    // Leer datos de la solicitud
    const { selectedAction } = await req.json();
    
    // Obtener orgId del usuario actual
    const orgId = await getUserOrgIdFromCookie();
    console.log(`Generate suggestions with orgId: ${orgId}`);
    
    let schemaSummary = '';

    // Obtener el esquema de base de datos dinámico para esta organización
    if (orgId) {
      const schemaData = await getDatabaseSchema(orgId);
      schemaSummary = formatSchemaForPrompt(schemaData);
      console.log('Generated schema summary from organization database');
    } else {
      // Usar esquema por defecto si no hay orgId
      const schemaData = await getDatabaseSchema();
      schemaSummary = formatSchemaForPrompt(schemaData);
      console.log('Generated schema summary from default database');
    }

    // Generar sugerencias basadas en el esquema
    const prompt = `Using ONLY the following database schema, generate exactly 4 suggested ${selectedAction === 'Data Action' ? 'data action' : 'query'} in natural language. 
The suggestions must be based solely on the provided schema and should not mention or invent any other tables or columns. 
Do not include any numbering or explanations. Just provide the concise query suggestion directly.

Database Schema:
${schemaSummary}`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o-mini',
    });

    const suggestions = completion.choices[0].message.content
      ?.split('\n')
      .filter((line) => line.trim())
      .slice(0, 4)
      .map((line) => ({
        desktop: line.trim(),
        mobile: line.trim().slice(0, 50) + '...',
        description: 'Generated suggestion based on schema.',
      }));

    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    console.error('Failed to generate suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
};