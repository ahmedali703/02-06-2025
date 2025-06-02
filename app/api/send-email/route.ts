// app/api/send-email/route.ts
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { to, cc, subject, body, htmlAttachment } = await request.json();
    if (!to || !subject || !body || !htmlAttachment) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // إعدادات SMTP الخاصة بك
    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 587,
      secure: false, // المنفذ 465 يستخدم SSL/TLS
      auth: {
        user: 'ai@apexexperts.net',
        pass: 'H~eW_PtjR8mL',
      },
      logger: true,
      debug: true,
    });

    // دمج نص البريد (الوصف الاحترافي) مع التقرير المرفق
    const combinedHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="padding: 10px; border-bottom: 1px solid #ccc;">
          ${body.replace(/\n/g, '<br/>')}
        </div>
        <div style="margin-top: 20px;">
          ${htmlAttachment}
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: '"AI Service" <ai@apexexperts.net>',
      to: Array.isArray(to) ? to.join(', ') : to,
      cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
      subject,
      text: body, // النص العادي
      html: combinedHtml, // النص المدمج مع التقرير
    });

    console.log('Message sent: %s', info.messageId);
    return NextResponse.json({
      message: 'Email sent successfully',
      previewUrl: nodemailer.getTestMessageUrl(info) || null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
