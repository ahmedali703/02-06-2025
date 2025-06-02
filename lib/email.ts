//lib/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: 'ai@apexexperts.net',
    pass: 'H~eW_PtjR8mL',
  },
  // Add timeout and connection settings
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// Verify connection configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log("SMTP Server is ready to take our messages");
  }
});

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${token}`;

  const mailOptions = {
    from: '"SIAA" <ai@apexexperts.net>',
    to: email,
    subject: 'Verify your email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(to right, #34D399, #059669); padding: 20px; text-align: center; color: white;">
          <h1 style="margin: 0;">Welcome to SIAA!</h1>
        </div>
        <div style="padding: 20px; background: white; border-radius: 0 0 4px 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #059669; margin-top: 0;">Verify your email address</h2>
          <p style="color: #4B5563; line-height: 1.6;">
            Thanks for signing up! Please verify your email address by clicking the button below.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p style="color: #6B7280; font-size: 14px;">
            If you didn't create an account, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
            This link will expire in 24 hours.
          </p>
        </div>
      </div>
    `,
    text: `Welcome to SIAA! Please verify your email by clicking this link: ${verificationUrl}`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email. Please try again later.');
  }
}

export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const mailOptions = {
    from: '"SIAA" <ai@apexexperts.net>',
    ...options,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email. Please try again later.');
  }
}