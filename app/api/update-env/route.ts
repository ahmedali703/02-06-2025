// app/api/update-env/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { saveOpenAIKey, saveOracleConfig } from '@/lib/env';

export const POST = async (req: NextRequest) => {
  try {
    const { openAiKey, user, password, connectString, libDir } = await req.json();

    if (openAiKey) {
      await saveOpenAIKey(openAiKey);
    }

    if (user && password && connectString && libDir) {
      await saveOracleConfig(user, password, connectString, libDir);
    }

    return NextResponse.json({ message: 'Environment variables updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to update .env:', error);
    return NextResponse.json({ error: 'Failed to update .env file' }, { status: 500 });
  }
};