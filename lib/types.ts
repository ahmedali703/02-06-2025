//lib/types.ts
import { z } from 'zod';

// Basic result type for query results
export type Result = Record<string, string | number>;

// Message type for chat functionality
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  audio?: {
    id?: string;
    data?: string;
    transcript?: string;
  };
}

// Audio configuration type
export interface AudioConfig {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  format: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav';
}

// Query explanation types
export const explanationSchema = z.object({
  section: z.string(),
  explanation: z.string(),
});
export const explanationsSchema = z.array(explanationSchema);
export type QueryExplanation = z.infer<typeof explanationSchema>;

// Chart configuration schema and type
export const configSchema = z.object({
  description: z.string().describe('Describe the chart...'),
  takeaway: z.string().describe('Main takeaway'),
  type: z.enum(['bar', 'line', 'area', 'pie']).describe('Type of chart'),
  title: z.string(),
  xKey: z.string().describe('Key for x-axis'),
  yKeys: z.array(z.string()).describe('Key(s) for y-axis'),
  multipleLines: z.boolean().describe('...').optional(),
  measurementColumn: z.string().describe('...').optional(),
  lineCategories: z.array(z.string()).describe('...').optional(),
  colors: z
    .record(z.string(), z.string())
    .describe('Mapping colors')
    .optional(),
  legend: z.boolean().describe('Whether to show legend'),
});

export type Config = z.infer<typeof configSchema>;

// AI model type
export type AIModel = 'openai' | 'llama' | 'reasoner';

// Theme types
export type ThemeColor =
  | 'green'
  | 'blue'
  | 'red'
  | 'orange'
  | 'purple'
  | 'yellow';

export interface ThemeColors {
  [key: string]: {
    name: string;
    primary: string;
    ring: string;
    border: string;
    muted: string;
    accent: string;
    background: string;
    card: string;
    popover: string;
    secondary: string;
  };
}

// Chat types
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: Date;
  audio?: {
    id?: string;
    data?: string;
    transcript?: string;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Database types
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface QueryResult {
  success: boolean;
  data?: Result[];
  error?: string;
  affectedRows?: number;
}

// Email types
export interface EmailConfig {
  to: string[];
  cc?: string[];
  subject: string;
  content: string;
  attachments?: {
    filename: string;
    content: string;
    contentType: string;
  }[];
}

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    fill?: boolean;
  }[];
}

// Export types
export type ExportFormat = 'csv' | 'pdf' | 'html' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeHeaders?: boolean;
  orientation?: 'portrait' | 'landscape';
}

// Filter types
export interface FilterCondition {
  column: string;
  operator:
    | 'equals'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'greaterThan'
    | 'lessThan';
  value: string | number;
}

export interface FilterGroup {
  conditions: FilterCondition[];
  operator: 'AND' | 'OR';
}
