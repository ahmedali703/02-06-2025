import { NextResponse } from 'next/server';
import { getDatabaseSchema } from '@/lib/schema';

/**
 * API endpoint to fetch database schema for a specific organization
 */
export async function GET(request: Request) {
  try {
    // Get the orgId from the query parameters
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    
    // Fetch the database schema
    const schema = await getDatabaseSchema(Number(orgId));
    
    return NextResponse.json(schema);
  } catch (error) {
    console.error('Error fetching schema:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database schema' },
      { status: 500 }
    );
  }
}
