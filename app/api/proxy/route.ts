///home/coder/aiquery/app/api/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stream = true, ...reqData } = body;  // جعل الـ stream افتراضيًا true

    if (stream) {
      // المتصفح يدعم ReadableStream
      const encoder = new TextEncoder();
      const responseStream = new ReadableStream({
        async start(controller) {
          try {
            // تأكد من تمرير مَعلمة stream كـ true
            const response = await fetch('http://127.0.0.1:8000/query/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({...reqData, stream: true})
            });

            if (!response.ok) {
              const errorText = await response.text();
              controller.enqueue(encoder.encode(JSON.stringify({ error: errorText }) + '\n'));
              controller.close();
              return;
            }

            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error("Response body is not readable");
            }

            console.log("Starting to read stream from backend");  // إضافة إلى سجل التصحيح

            // قراءة البيانات من المجرى وتمريرها للمستخدم
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                console.log("Stream reading complete");  // سجل التصحيح
                break;
              }
              
              const chunk = new TextDecoder().decode(value);
              console.log("Received chunk:", chunk);  // سجل التصحيح لرؤية البيانات الواردة
              
              controller.enqueue(value);
            }
          } catch (error) {
            console.error("Streaming error:", error);  // سجل الخطأ
            controller.enqueue(encoder.encode(JSON.stringify({ error: 'Stream Error' }) + '\n'));
          } finally {
            controller.close();
          }
        }
      });

      // إرجاع التدفق إلى المتصفح مع الرؤوس الصحيحة
      return new NextResponse(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } else {
      // استخدام الطريقة التقليدية إذا كان streaming معطلاً
      const res = await fetch('http://127.0.0.1:8000/query/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        throw new Error('Failed to fetch data from backend');
      }

      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}