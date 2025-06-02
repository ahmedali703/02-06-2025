import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Get all active tables
    const tables = await query(
      'SELECT "ID", "TABLE_NAME" FROM "NL2SQL_AVAILABLE_TABLES" WHERE "IS_ACTIVE" = \'Y\' ORDER BY "TABLE_NAME"',
      []
    );
    
    if (!tables || tables.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No tables found' 
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      tables 
    });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch tables' 
    }, { status: 500 });
  }
}
