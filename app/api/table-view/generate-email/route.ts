// app/api/table-view/generate-email/route.ts
import { NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const { tableName } = await request.json();
    if (!tableName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Default email in case of error
    const defaultEmail = `Dear Valued Customer,

Please find attached the detailed report containing data from the "${tableName}" table.

The attached report provides a comprehensive view of the requested data in a structured format for easy reference. If you require any modifications or have further questions, please do not hesitate to contact us.

Best regards,  
Your Company Support Team`;

    try {
      const result = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
          emailDescription: z.string(),
        }),
        system: `
You are a professional business email assistant. Your task is to craft a **polished and well-structured email** summarizing the attached report results.

🔹 **Guidelines for the email:**
- Start with a **formal greeting** (e.g., "Dear Customer," or "Dear [Recipient's Name],").
- Clearly **explain the purpose** of the email.
- Explain that the email contains data from the "${tableName}" table.
- Maintain a **polite and professional tone**.
- End with a **call to action** (e.g., "Please let us know if you have any questions.").
  
Ensure clarity and conciseness in the email.
        `,
        prompt: `Write a professional and well-structured email explaining that you're sharing data from the "${tableName}" table.
Ensure the email is clear, formal, and informative.`,
      });

      const content = result.object.emailDescription.trim();
      return NextResponse.json({ emailDescription: content || defaultEmail });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ emailDescription: defaultEmail });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
