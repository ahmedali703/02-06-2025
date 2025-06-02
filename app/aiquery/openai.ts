//app/aiquery/openai.ts
'use server';

import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { Config, configSchema, Result } from '@/lib/types';
// تم تعديل الاستيراد هنا لإحضار المخطط الديناميكي
import { getDatabaseSchema, formatSchemaForPrompt } from '@/lib/schema';

/**
 * توليد استعلام SQL (SELECT) باستخدام OpenAI
 */
export const generateQuery = async (input: string, orgId?: number): Promise<string> => {
  'use server';
  try {
    // جلب مخطط قاعدة البيانات ديناميكيًا مع تمرير معرف المؤسسة
    const dbSchema = await getDatabaseSchema(orgId);
    const dynamicSchema = formatSchemaForPrompt(dbSchema);
    
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      system: `
You are a highly experienced Oracle Database SQL expert with advanced knowledge.
Generate the most optimized Oracle SQL query for the following question:
**User Question:** ${input}
**Database Schema:** 
${dynamicSchema}
**Instructions:**
1. Return only the SQL query.
2. Ensure the query is compatible with Oracle SQL.
3. Always check table and column names from the above database schema before generating a query.
4. Ensure that every query can be executed in Oracle **without errors**.
5. If a column or table does not exist, try a **similar alternative**.
6. Optimize the query for performance.
7. Do not include any explanations or additional text.
      `,
      prompt: `Generate the SQL query to retrieve the data for: ${input}`,
      schema: z.object({
        query: z.string(),
      }),
    });
    return result.object.query;
  } catch (e) {
    console.error(e);
    throw new Error('Failed to generate query (OpenAI)');
  }
};

/**
 * شرح الاستعلام المُولد باستخدام OpenAI
 */
export const explainQuery = async (
  input: string,
  sqlQuery: string,
  orgId?: number
): Promise<string> => {
  'use server';
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        explanations: z.array(
          z.object({
            section: z.string(),
            explanation: z.string(),
          })
        ),
      }),
      system: `
You are a professional Oracle SQL expert, skilled in analyzing and explaining SQL queries.
Your task is to **break down and explain** the provided SQL query in a structured manner:
- Clearly explain **each clause** (SELECT, FROM, JOIN, WHERE, GROUP BY, ORDER BY, etc.).
- Highlight **the purpose of each part of the query** in simple terms.
- If the query is complex, explain any **window functions, CTEs, or hierarchical queries**.
- Identify **potential performance optimizations** if applicable.
- **Avoid unnecessary details**—keep the explanation clear and focused.

🔹 **User Question:**  
"${input}"

🔹 **SQL Query to Explain:**  
\`\`\`sql
${sqlQuery}
\`\`\`
      `,
      prompt: `Break down and explain the SQL query step by step: ${sqlQuery}`,
    });

    const explanations = result.object.explanations;
    if (Array.isArray(explanations)) {
      return explanations
        .map((item: any) => `🔹 **${item.section}**: ${item.explanation}`)
        .join('\n\n');
    }
    return explanations;
  } catch (e) {
    console.error(e);
    throw new Error('Failed to generate explanation (OpenAI)');
  }
};

/**
 * توليد إعدادات المخطط البياني باستخدام OpenAI
 */
export const generateChartConfig = async (
  results: Result[],
  userQuery: string,
  orgId?: number
): Promise<{ config: Config }> => {
  'use server';
  try {
    const { object: config } = await generateObject({
      model: openai('gpt-4o-mini'),
      system: `You are a data visualization expert.`,
      prompt: `Given the following data from a SQL query result, generate the chart config that best visualizes the data and answers the user's query.
For multiple groups use multi-lines.

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
${JSON.stringify(results, null, 2)}`,
      schema: configSchema,
    });
    const colors: Record<string, string> = {};
    config.yKeys.forEach((key, index) => {
      colors[key] = `hsl(var(--chart-${index + 1}))`;
    });
    const updatedConfig: Config = { ...config, colors };
    return { config: updatedConfig };
  } catch (e: any) {
    console.error(e.message);
    throw new Error('Failed to generate chart suggestion (OpenAI)');
  }
};

/**
 * توليد وصف البريد الإلكتروني باستخدام OpenAI
 */
export const generateEmailDescription = async (
  question: string,
  orgId?: number
): Promise<string> => {
  'use server';

  // 📌 بريد افتراضي في حالة حدوث خطأ
  const defaultEmail = `Dear Valued Customer,

Please find attached the detailed report regarding your query: "${question}".

The attached report provides insights based on your request and presents the results in a structured format for easy reference. If you require any modifications or have further questions, please do not hesitate to contact us.

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
- Summarize the **key insights** from the generated report.
- Maintain a **polite and professional tone**.
- End with a **call to action** (e.g., "Please let us know if you have any questions.").
  
Ensure clarity and conciseness in the email.

**User Query:** "${question}"
      `,
      prompt: `Write a professional and well-structured email explaining the results of the following query: "${question}".
Ensure the email is clear, formal, and informative.`,
    });

    const content = result.object.emailDescription.trim();
    return content || defaultEmail;
  } catch (e) {
    console.error(e);
    return defaultEmail; // إرجاع البريد الافتراضي في حالة الفشل
  }
};

/**
 * توليد استعلام DML باستخدام OpenAI
 */
export const generateDMLQuery = async (input: string, orgId?: number): Promise<string> => {
  'use server';
  try {
    // جلب مخطط قاعدة البيانات ديناميكيًا مع تمرير معرف المؤسسة
    const dbSchema = await getDatabaseSchema(orgId);
    const dynamicSchema = formatSchemaForPrompt(dbSchema);

    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      system: `
You are a highly skilled Oracle SQL expert specializing in **DML operations** (INSERT, UPDATE, DELETE).
Your role is to generate an **accurate, secure, and syntactically correct** DML SQL query based on the user's request.
🔹 **RULES & BEST PRACTICES**:
- **Ensure the generated SQL follows Oracle SQL syntax**.
- **Use correct column names** as per the schema provided below.
- **FOR INSERT**: Ensure that all required fields are included.
- **FOR UPDATE & DELETE**: Ensure that a \`WHERE\` clause is always present to prevent unintended updates/deletes.
- **DO NOT include a trailing semicolon** in the generated query.
The database schema (in the HR schema) is as follows:
${dynamicSchema}
Generate a **valid, secure DML SQL query** following the best practices above.
Note: Ensure the query is executable in Oracle and follows Oracle SQL syntax. Do not include a trailing semicolon.
      `,
      prompt: `Generate a secure, syntactically correct DML SQL query for the following request:
${input}
Ensure you use the correct column names as defined in the schema and do not include any trailing semicolon.`,
      schema: z.object({
        query: z.string(),
      }),
    });
    return result.object.query;
  } catch (e) {
    console.error(e);
    throw new Error('Failed to generate DML query (OpenAI)');
  }
};

/**
 * توليد تقرير عمليات DML باستخدام OpenAI
 */
export const generateDatabaseActionReport = async (
  question: string,
  statementsCount: number,
  rowsAffected: number,
  executionMessage: string,
  orgId?: number
): Promise<string> => {
  'use server';
  const prompt = `You are an Oracle Database expert assistant with extensive knowledge in Oracle SQL, PL/SQL, and database administration.

Please generate a **comprehensive report** in **Markdown format** with **professional HTML styling**. The report should cover the execution of the following **DML operations**:

- **Question:** ${question}
- **Number of Executed Statements:** ${statementsCount}
- **Total Rows Affected:** ${rowsAffected}
- **Execution Message:** ${executionMessage}

### 🔹 **Report Requirements:**
1. Provide a **clear and structured** explanation of the executed DML operations.
2. Explicitly **state the number of rows affected** and explain the significance of this result.
3. Analyze the **impact** of these operations on the underlying data.
4. Highlight any **warnings, errors, or anomalies** encountered during execution.
5. Summarize the **key data points** that were modified or impacted.

Your response must:
- Be written in **professional and concise** English.
- Return **only** the formatted report in **Markdown with HTML styling**.
- Use **headings (<h2>), paragraphs (<p>), bullet points (<ul>, <li>), and highlights (<strong> or <em>)** for clear readability.

`;
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini-mini'),
      schema: z.object({
        report: z.string(),
      }),
      system: `You are an Oracle Database expert assistant.`,
      prompt,
    });
    return result.object.report;
  } catch (e) {
    console.error(e);
    throw new Error('Failed to generate data action report (OpenAI)');
  }
};