//app/aiquery/reasoner.ts
'use server';

import { z } from 'zod';
import { Config, configSchema, explanationsSchema, Result } from '@/lib/types';
import { getDatabaseSchema, formatSchemaForPrompt } from '@/lib/schema';

// Global timeout configuration (2 minutes)
const REASONER_TIMEOUT = 120000;

/**
 * Unified fetch helper with timeout and error handling
 */
const fetchReasoner = async (prompt: string, maxTokens: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REASONER_TIMEOUT);

  try {
    const response = await fetch('http://localhost:4891/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'Reasoner v1',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Reasoner API error: ${response.status} - ${errorBody}`);
    }

    return await response.json();
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('Request timed out after 2 minutes');
    }
    throw new Error(
      `Fetch failed: ${e instanceof Error ? e.message : 'Unknown error'}`
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Generate SQL SELECT query using Reasoner
 */
export const generateQuery = async (input: string): Promise<string> => {
  'use server';
  try {
    const prompt = `
You are a highly skilled Oracle SQL expert with deep knowledge in query optimization, advanced joins, window functions, hierarchical queries (use CONNECT BY for recursion), and performance tuning with the following HR schema:
${getDatabaseSchema}
Constraints:
- When the user explicitly requires using **aggregate functions** (e.g., to calculate department averages), compute them in a CTE or subquery using GROUP BY, then join back to the main table. Example:
  WITH DeptAvg AS (SELECT department_id, AVG(salary) avg FROM employees GROUP BY department_id)
  SELECT e.*, (e.salary - d.avg)/d.avg*100 FROM employees e JOIN DeptAvg d ON e.department_id = d.department_id
- Use **Window Functions (LAG, LEAD, RANK, DENSE_RANK, ROW_NUMBER)** for calculations relative to other rows (e.g., ranking, differences) after aggregating data.
- Use Oracle's hierarchical query syntax (e.g., CONNECT BY) for complex hierarchical queries.
- Always optimize filtering and avoid unnecessary computations.
- Prefer **CTEs (WITH)** over subqueries for clarity and performance.
- Use best practices for NULL handling (e.g., \`NULLS LAST\`, \`COALESCE()\`).
- Ensure compatibility with Oracle SQL syntax. Do not use WITH RECURSIVE.
- Use LOWER(...) for text comparisons.
- Return only a valid Oracle SELECT statement.
- No code fences or extra explanations.
- Output must be strictly the query itself.
User wants:
${input}
Generate the SQL query now:
`;

    const data = await fetchReasoner(prompt, 4096);
    let rawText = data.choices?.[0]?.message?.content || '';

    // Enhanced cleaning and validation
    rawText = rawText
      .replace(/```[\s\S]*?\n/g, '') // Remove markdown code blocks
      .replace(/```/g, '')
      .replace(/^sql\n/gi, '')
      .trim();

    // Ensure the query starts with SELECT or WITH
    const queryMatch = rawText.match(/(with|select)\s+.+/i);
    if (!queryMatch) {
      throw new Error('Generated query does not start with SELECT or WITH');
    }

    let query = queryMatch[0]
      .replace(/;+$/, '') // Remove trailing semicolons
      .trim();

    // Validate query structure
    const dmlPattern = /\b(delete|insert|update|merge)\b/i;
    if (dmlPattern.test(query)) {
      throw new Error('Generated query contains restricted DML statements');
    }

    // Ensure the query is complete
    if (!query.endsWith(')')) {
      throw new Error('Generated query is incomplete');
    }

    return query;
  } catch (e: unknown) {
    console.error(
      `Query Generation Error: ${
        e instanceof Error ? e.message : 'Unknown error'
      }`
    );

    // Fallback to a default query
    const defaultQuery = `
      SELECT 
        department_id, 
        AVG(salary) AS avg_salary 
      FROM 
        employees 
      GROUP BY 
        department_id;
    `;
    console.warn('Using fallback query due to Reasoner failure');
    return defaultQuery.trim();
  }
};

/**
 * Explain the generated SQL query
 */
export const explainQuery = async (
  input: string,
  sqlQuery: string
): Promise<string> => {
  'use server';
  try {
    const explanationPrompt = `
You are a SQL (Oracle) expert.
Please explain the following SQL query concisely for a beginner, breaking it down into parts.

User Query:
${input}

SQL Query:
${sqlQuery}`;

    const data = await fetchReasoner(explanationPrompt, 4096);
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch (e: unknown) {
    console.error(
      `Explanation Error: ${e instanceof Error ? e.message : 'Unknown error'}`
    );
    throw new Error('Failed to generate explanation');
  }
};

/**
 * Generate chart configuration based on query results
 */
export const generateChartConfig = async (
  results: Result[],
  userQuery: string
): Promise<{ config: Config }> => {
  'use server';
  try {
    const chartPrompt = `
You are a data visualization expert.
Given the following data from a SQL query result, generate the chart config that best visualizes the data and answers the user's query.
Return only valid JSON for "config" with the following fields:
- type: string,
- xKey: string,
- yKeys: array of strings,
- colors: object mapping each yKey to a color (optional),
- legend: boolean (optional),
- title: string,
- description: string,
- takeaway: string.
Do not include any additional text, markdown code fences, or explanations.

Example:
{
  "type": "pie",
  "xKey": "month",
  "yKeys": ["sales", "profit", "expenses"],
  "colors": {
    "sales": "#4CAF50",
    "profit": "#2196F3",
    "expenses": "#F44336"
  },
  "legend": true,
  "title": "Monthly Sales Data",
  "description": "This chart shows the distribution of sales, profit, and expenses across different months.",
  "takeaway": "Sales dominate the overall performance."
}

User Query:
${userQuery}

Data:
${JSON.stringify(results, null, 2)}
`;

    const data = await fetchReasoner(chartPrompt, 4096);
    let content = data.choices?.[0]?.message?.content || '';
    content = content
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(content);
    const validatedConfig = configSchema.parse(parsed);

    // Color fallback system
    const colors = validatedConfig.colors || {};
    validatedConfig.yKeys.forEach((key, idx) => {
      colors[key] = colors[key] || `hsl(var(--chart-${idx + 1}))`;
    });

    return { config: { ...validatedConfig, colors } };
  } catch (e: unknown) {
    console.error(
      `Chart Config Error: ${e instanceof Error ? e.message : 'Unknown error'}`
    );
    throw new Error('Failed to generate chart config');
  }
};

/**
 * Generate email description for query results
 */
export const generateEmailDescription = async (
  question: string
): Promise<string> => {
  'use server';
  const defaultEmail = `Dear Valued Customer,

Please find attached the detailed report of your search results for your query: "${question}".
If you have any questions or need further assistance, please do not hesitate to contact us.

Best regards,
Your Company`;

  try {
    const prompt = `You are a professional email writer.
Please write a professional email addressed to the recipient that explains the attached report in detail. The email must include:
- A polite greeting (e.g., "Dear Valued Customer,").
- An introductory paragraph stating the purpose of the email.
- A detailed body that explains the search results for the following query: "${question}" and summarizes the attached HTML report.
- A concluding paragraph with a courteous closing (e.g., "Best regards," followed by your signature).

Return only the complete email text.`;

    const data = await fetchReasoner(prompt, 400);
    return data.choices?.[0]?.message?.content?.trim() || defaultEmail;
  } catch (e: unknown) {
    console.error(
      `Email Generation Error: ${
        e instanceof Error ? e.message : 'Unknown error'
      }`
    );
    throw new Error('Failed to generate email description');
  }
};

/**
 * Generate DML query (INSERT/UPDATE/DELETE)
 */
export const generateDMLQuery = async (input: string): Promise<string> => {
  'use server';
  try {
    const prompt = `
You are an Oracle Database expert.
The database schema is:
${getDatabaseSchema}
Generate a valid DML SQL statement (INSERT, UPDATE, or DELETE) for the following operation:
${input}
Ensure that the query is executable in Oracle SQL and does not include any trailing semicolon.
Return only the SQL statement without any additional text or formatting.
`;

    const data = await fetchReasoner(prompt, 500);
    let rawText = data.choices?.[0]?.message?.content || '';
    return rawText
      .replace(/```sql/gi, '')
      .replace(/```/g, '')
      .replace(/;+\s*$/, '')
      .trim();
  } catch (e: unknown) {
    console.error(
      `DML Generation Error: ${
        e instanceof Error ? e.message : 'Unknown error'
      }`
    );
    throw new Error('Failed to generate DML query');
  }
};

/**
 * Generate a report for DML operations
 */
export const generateDatabaseActionReport = async (
  question: string,
  statementsCount: number,
  rowsAffected: number,
  executionMessage: string
): Promise<string> => {
  'use server';
  try {
    const prompt = `You are an Oracle Database expert assistant with extensive knowledge in Oracle SQL, PL/SQL, and database administration.

Please generate a comprehensive report in **Markdown format** that includes beautiful HTML styling. Use HTML elements (such as <h1>, <p>, <ul>, <li>, etc.) and inline styles (including colors) to format the report professionally. The report should cover the execution of the following DML operations:

- **Question:** ${question}
- **Number of Executed Statements:** ${statementsCount}
- **Total Rows Affected:** ${rowsAffected}
- **Execution Message:** ${executionMessage}

Your report must:
1. Provide a clear and detailed explanation of the executed operations using professional, precise English.
2. Explicitly state the number of rows affected and explain the significance of this result.
3. Analyze the impact of these operations on the underlying data.
4. Highlight any important warnings, errors, or anomalies encountered during execution.
5. Summarize the key data points that were impacted in a well-organized manner.

Return only the complete report in Markdown format with HTML styling. Do not include any extra text.
`;

    const data = await fetchReasoner(prompt, 4096);
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch (e: unknown) {
    console.error(
      `Report Generation Error: ${
        e instanceof Error ? e.message : 'Unknown error'
      }`
    );
    throw new Error('Failed to generate database action report');
  }
};
