//app/api/update-schema/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { saveOracleConfig } from '@/lib/env';

export const POST = async (req: NextRequest) => {
  try {
    const { schema, user, password, connectString, libDir } = await req.json();

    // Save schema to schema.ts
    const schemaPath = path.join(process.cwd(), 'lib', 'schema.ts');
    fs.writeFileSync(schemaPath, schema);

    // Save Oracle configurations to .env
    if (user && password && connectString && libDir) {
      await saveOracleConfig(user, password, connectString, libDir);
    }

    return NextResponse.json({ message: 'Schema and environment variables updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to update schema.ts or .env:', error);
    return NextResponse.json({ error: 'Failed to update schema.ts or .env' }, { status: 500 });
  }
};