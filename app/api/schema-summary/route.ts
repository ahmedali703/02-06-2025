//app/api/schema-summary/route.ts
import { NextResponse } from 'next/server';
import { getDatabaseSchema, formatSchemaForPrompt } from '@/lib/schema';

export const GET = async () => {
  try {
    const schemaData = await getDatabaseSchema();
    const schemaSummary = formatSchemaForPrompt(schemaData);
    return NextResponse.json({ schemaSummary }, { status: 200 });
  } catch (error) {
    console.error('Failed to get schema summary:', error);
    return NextResponse.json({ error: 'Failed to get schema summary' }, { status: 500 });
  }
};
