// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // إنشاء استجابة لمسح جميع كوكيز المصادقة
    const response = NextResponse.json({ 
      success: true, 
      message: "Logout successful."
    }, { status: 200 });
    
    // مسح كوكيز المصادقة
    response.cookies.delete('token');
    response.cookies.delete('userId');
    
    // تعيين كوكيز منتهية الصلاحية للتأكد من حذفها
    response.cookies.set('token', '', { 
      expires: new Date(0),
      path: '/',
      sameSite: 'strict',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });
    
    response.cookies.set('userId', '', { 
      expires: new Date(0),
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });
    
    // إضافة رؤوس لمنع التخزين المؤقت
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error("An error occurred during logout:", error);

    
    // حتى لو كان هناك خطأ، حاول مسح الكوكيز على أي حال
    const response = NextResponse.json({ 
      success: false, 
      message: "An error occurred during logout."

    }, { status: 500 });
    
    response.cookies.delete('token');
    response.cookies.delete('userId');
    
    // تعيين كوكيز منتهية الصلاحية للتأكد من حذفها
    response.cookies.set('token', '', { 
      expires: new Date(0),
      path: '/',
      sameSite: 'strict',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });
    
    response.cookies.set('userId', '', { 
      expires: new Date(0),
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });
    
    // إضافة رؤوس لمنع التخزين المؤقت
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  }
}