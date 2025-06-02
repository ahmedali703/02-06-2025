// /app/api/dashboard/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '../../../../lib/auth';
import { generateDashboardWithOpenAI } from '../../../(dashboard)/dashboard-builder/openai-generator';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required. Please login.' },
        { status: 401 }
      );
    }

    // Verify token
    const verifiedToken = verifyJWT(token);
    if (!verifiedToken) {
      return NextResponse.json(
        { error: 'Invalid authentication token.' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { prompt } = body;
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder();
          
          // Stream dashboard generation using OpenAI
          for await (const chunk of generateDashboardWithOpenAI(prompt)) {
            // Add a newline to separate JSON chunks
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
          }
          
          controller.close();
        } catch (error: any) {
          console.error('Error in stream:', error);
          
          // Send error response in the stream
          const errorResponse = {
            type: 'error',
            data: {
              error: error.message || 'An unexpected error occurred',
              success: false
            }
          };
          
          controller.enqueue(new TextEncoder().encode(JSON.stringify(errorResponse) + '\n'));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
      
  } catch (error: any) {
    console.error('Error in dashboard generate API:', error);
    return NextResponse.json(
      { 
        error: error.message || 'An unexpected error occurred',
        success: false
      },
      { status: 500 }
    );
  }
}