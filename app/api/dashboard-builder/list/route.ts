//app/api/dashboard-builder/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { listDashboards } from '@/app/(dashboard)/dashboard-builder/actions';

export async function GET(request: NextRequest) {
  try {
    const result = await listDashboards();
    
    return NextResponse.json({
      success: true,
      dashboards: result.dashboards
    });
  } catch (error: any) {
    console.error('Dashboard list API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to list dashboards' 
      },
      { status: 500 }
    );
  }
}