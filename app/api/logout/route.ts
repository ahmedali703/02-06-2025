//app/api/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // حذف التوكن من cookies
    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.set('token', '', { expires: new Date(0), path: '/' });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to log out' },
      { status: 500 }
    );
  }
}