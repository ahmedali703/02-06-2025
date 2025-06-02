import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { fetchTableData } from '@/app/aiquery/actions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tableId = searchParams.get('tableId');
  const orgId = searchParams.get('orgId');
  const userId = searchParams.get('userId');
  
  if (!tableId) {
    return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
  }
  
  try {
    // First, get the table name from the table ID
    const tableInfo = await query(
      `SELECT "TABLE_NAME" FROM "NL2SQL_TABLE_COLUMNS" WHERE "ID" = $1 GROUP BY "TABLE_NAME"`,
      [tableId]
    );
    
    if (!tableInfo || tableInfo.length === 0) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }
    
    const tableName = tableInfo[0].TABLE_NAME;
    
    // Use the new fetchTableData function to get data with proper organization context
    const data = await fetchTableData(
      tableName, 
      orgId ? parseInt(orgId) : undefined, 
      userId ? parseInt(userId) : undefined
    );
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching table data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table data' },
      { status: 500 }
    );
  }
}
