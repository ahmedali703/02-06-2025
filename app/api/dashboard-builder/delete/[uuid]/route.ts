//app/api/dashboard-builder/delete/[uuid]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { query, exec } from '@/lib/db';

export async function DELETE(req: NextRequest) {
  try {
    // Get token from cookies
    const token = req.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'غير مصرح. يرجى تسجيل الدخول.' }, { status: 401 });
    }
    
    // Verify token
    const verifiedToken = verifyJWT(token);
    if (!verifiedToken || !verifiedToken.userId) {
      return NextResponse.json({ error: 'جلسة غير صالحة. يرجى إعادة تسجيل الدخول.' }, { status: 401 });
    }

    // Parse dashboard ID from URL
    const url = new URL(req.url);
    const dashboardId = url.searchParams.get('id');

    if (!dashboardId) {
      return NextResponse.json({ error: 'معرف لوحة المعلومات مطلوب.' }, { status: 400 });
    }

    // Verify dashboard belongs to the user
    const dashboard = await query(
      'SELECT "ID" FROM "NL2SQL_SAVED_DASHBOARDS" WHERE "ID" = $1 AND "USER_ID" = $2',
      [dashboardId, verifiedToken.userId]
    );

    if (!dashboard || dashboard.length === 0) {
      return NextResponse.json({ error: 'لا يمكن العثور على لوحة المعلومات أو ليس لديك صلاحية لحذفها.' }, { status: 404 });
    }

    // Delete the dashboard
    await exec(
      'DELETE FROM "NL2SQL_SAVED_DASHBOARDS" WHERE "ID" = $1',
      [dashboardId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف لوحة المعلومات.' }, { status: 500 });
  }
}
