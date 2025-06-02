import { NextRequest, NextResponse } from 'next/server';
import { saveDashboard } from '@/app/(dashboard)/dashboard-builder/actions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uuid, name, config } = body;

    if (!uuid || !name || !config) {
      return NextResponse.json(
        { error: 'UUID, name, and config are required' },
        { status: 400 }
      );
    }

    const result = await saveDashboard(uuid, name, config);
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      uuid: uuid // Return the uuid that was passed in
    });
  } catch (error: any) {
    console.error('Dashboard save API error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to save dashboard',
        success: false 
      },
      { status: 500 }
    );
  }
}