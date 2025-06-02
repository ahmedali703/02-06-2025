// app/api/save-onboarding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';
import { query } from "@/lib/db";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-proj-1234567890",
});

// Interface for decoded JWT token
interface DecodedToken {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

// Interface for table data
interface TableColumn {
  name: string;
  type: string;
}

interface DbTable {
  name: string;
  columns: TableColumn[];
}

// Function to generate table description using gpt-4o-mini
async function generateTableDescription(tableName: string, columns: TableColumn[]): Promise<string> {
  try {
    const columnInfo = columns.map(col => `${col.name} (${col.type})`).join(', ');
    
    const prompt = `Generate a concise and accurate description for a database table named "${tableName}" with the following columns: ${columnInfo}. 
    Describe the likely purpose of this table and what data it might store based on its name and column structure. 
    Keep the description under 500 characters and focus on business purpose.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a database expert who provides concise, accurate descriptions of database tables." },
        { role: "user", content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    
    return response.choices[0].message.content?.trim() || `Table ${tableName} for storing records with columns: ${columnInfo}`;
  } catch (error) {
    console.error("Error generating table description:", error);
    return `Table ${tableName} with columns: ${columns.map(c => c.name).join(', ')}`;
  }
}

export const POST = async (req: NextRequest) => {
  try {
    const { orgName, databaseType, databaseInfo, databaseObjects } = await req.json();

    if (!orgName || !databaseType || !databaseInfo) {
      return NextResponse.json({ error: "All required fields must be provided" }, { status: 400 });
    }

    // Get the JWT token from cookies to identify the user
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Validate and decode the token
    let userId: number;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    try {
      // Parse the databaseObjects JSON string to get table data
      const parsedDatabaseObjects = JSON.parse(databaseObjects);
      const tables: DbTable[] = parsedDatabaseObjects.tables || [];
      
      // Insert organization data with creation date using PostgreSQL
      const result = await query(
        `INSERT INTO "NL2SQL_ORG" (
          "ORG_NAME", 
          "ORG_STATUS", 
          "DATABASE_TYPE", 
          "DATABASE_INFO", 
          "DATABASE_OBJECTS",
          "CREATED_AT",
          "UPDATED_AT"
        ) VALUES (
          $1, 
          $2, 
          $3, 
          $4, 
          $5,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        ) RETURNING "ORG_ID"`,
        [
          orgName,
          'Y', // 'Y' for Active (Yes)
          databaseType,
          databaseInfo,
          databaseObjects
        ]
      );

      // Get the created organization ID
      const orgId = result[0].ORG_ID;
      
      // Generate table descriptions using gpt-4o-mini
      const tablesWithDescriptions = await Promise.all(tables.map(async (table) => {
        const description = await generateTableDescription(table.name, table.columns);
        return {
          ...table,
          description
        };
      }));

      // Insert tables into NL2SQL_AVAILABLE_TABLES
      for (const table of tablesWithDescriptions) {
        const tableResult = await query(
          `INSERT INTO "NL2SQL_AVAILABLE_TABLES" (
            "ORG_ID",
            "TABLE_NAME",
            "TABLE_DESCRIPTION",
            "IS_ACTIVE",
            "CREATED_AT",
            "UPDATED_AT"
          ) VALUES (
            $1,
            $2,
            $3,
            'Y',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          ) RETURNING "ID"`,
          [
            orgId,
            table.name,
            table.description
          ]
        );

        const tableId = tableResult[0].ID;

        // Insert columns for this table into NL2SQL_TABLE_COLUMNS
        for (const column of table.columns) {
          await query(
            `INSERT INTO "NL2SQL_TABLE_COLUMNS" (
              "TABLE_ID",
              "COLUMN_NAME",
              "COLUMN_TYPE",
              "COLUMN_DESCRIPTION",
              "IS_SEARCHABLE",
              "CREATED_AT"
            ) VALUES (
              $1,
              $2,
              $3,
              $4,
              'Y',
              CURRENT_TIMESTAMP
            )`,
            [
              tableId,
              column.name,
              column.type,
              `${column.name} (${column.type}) from ${table.name}`
            ]
          );
        }
      }

      // Update user's organization ID and mark onboarding as completed
      await query(
        `UPDATE "NL2SQL_USERS" 
         SET "ORG_ID" = $1, "UPDATED_AT" = CURRENT_TIMESTAMP, "HAS_COMPLETED_ONBOARDING" = 'Y'
         WHERE "ID" = $2`,
        [orgId, userId]
      );

      return NextResponse.json(
        { 
          message: "Organization setup completed successfully", 
          orgId,
          tablesCount: tables.length
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Database operation failed during onboarding:", error);
      throw error;
    }
  } catch (error) {
    console.error("Onboarding save error:", error);
    return NextResponse.json(
      { error: "Failed to save organization data" },
      { status: 500 }
    );
  }
};