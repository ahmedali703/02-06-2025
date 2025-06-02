// app/api/generate-email-description/route.ts
import { NextResponse } from 'next/server';
import { generateEmailDescription } from '@/app/aiquery/actions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question, model } = body;
    
    if (!question) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Default email content for fallback
    const defaultEmail = `Dear Valued Customer,

Please find attached the detailed report ${model === 'table-view' ? 'containing data from the requested table' : 'for your query'}.

The attached report provides a comprehensive view of the requested data in a structured format for easy reference. If you require any modifications or have further questions, please do not hesitate to contact us.

Best regards,  
Your Company Support Team`;

    try {
      // Use the existing generateEmailDescription function for all cases
      // For table-view, we'll pass the question as is
      const emailDescription = await generateEmailDescription(question, model);
      return NextResponse.json({ emailDescription: emailDescription || defaultEmail });
    } catch (error) {
      console.error('Error generating email description:', error);
      return NextResponse.json({ emailDescription: defaultEmail });
    }
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
