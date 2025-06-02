//app/api/dashboard-builder/get/[uuid]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { deleteDashboard } from '@/app/(dashboard)/dashboard-builder/actions';

interface RouteParams {
  params: Promise<{ uuid: string }>;
}

export async function DELETE(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { uuid } = await context.params;
    
    if (!uuid) {
      return NextResponse.json(
        { success: false, message: 'Dashboard UUID is required' },
        { status: 400 }
      );
    }
    
    const result = await deleteDashboard(uuid);
    
    return NextResponse.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('Dashboard delete API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to delete dashboard' 
      },
      { status: 500 }
    );
  }
}