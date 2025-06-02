// lib/dashboard_types.ts

// Defines the structure for a data source that can be used for dashboards
export interface DashboardDataSource {
  id: string; // Unique identifier for the data source
  name: string; // User-friendly name, e.g., "Oracle HR Schema (Production)"
  type: "oracle" | "postgres" | "mysql" | "mssql"; // Type of the database
  // Connection details would be securely stored and retrieved on the backend
  // For frontend, we might only pass the id and name.
}

// Defines the structure of a column in a database table schema
export interface SchemaColumn {
  name: string;
  type: string; // e.g., VARCHAR2, NUMBER, DATE
  nullable?: boolean;
}

// Defines the structure of a database table schema
export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
  // Potentially add primary keys, foreign keys, indexes if needed for AI
}

// Defines the overall database schema for a data source
export interface DatabaseSchema {
  tables: SchemaTable[];
}

// Defines the layout properties for a widget on the dashboard grid
export interface WidgetLayout {
  i: string; // Widget ID, must match Widget.id
  x: number; // X position on the grid
  y: number; // Y position on the grid
  w: number; // Width in grid units
  h: number; // Height in grid units
  minW?: number; // Minimum width
  maxW?: number; // Maximum width
  minH?: number; // Minimum height
  maxH?: number; // Maximum height
  static?: boolean; // If true, widget is not resizable or draggable
  isDraggable?: boolean;
  isResizable?: boolean;
}

// Defines the structure for a single widget on the dashboard
export interface DashboardWidget {
  id: string; // Unique identifier for the widget (e.g., UUID)
  title: string; // Title of the widget displayed to the user
  type: "bar" | "line" | "pie" | "kpi" | "table" | "scatter"; // Type of visualization
  sqlQuery: string; // The SQL query that fetches data for this widget
  
  chartConfig?: {
    xKey?: string; 
    yKeys?: string[]; 
    colors?: { [key: string]: string }; 
    legend?: boolean; 
    tooltip?: boolean; 
    columns?: string[];
    valueKey?: string; 
    unit?: string; 
    trendKey?: string;
    // Added properties based on error report
    zKey?: string; // For scatter plots, data key for Z-axis (e.g., for grouping/coloring points)
    xAxisLabel?: string; // Label for X-axis
    yAxisLabel?: string; // Label for Y-axis
    xUnit?: string; // Unit for X-axis values (e.g., "USD", "ms")
    yUnit?: string; // Unit for Y-axis values
  };
  
  data?: any[]; 
  layout: WidgetLayout; 
  description?: string; 
  lastRefreshed?: string; 
  error?: string; 
}

// Defines the structure for a complete dashboard
export interface DashboardConfig {
  id: string; 
  name: string; 
  userId?: string; 
  dataSourceId: string; 
  widgets: DashboardWidget[]; 
  createdAt?: string; 
  updatedAt?: string; 
  gridConfig?: {
    breakpoints: { [key: string]: number }; 
    cols: { [key: string]: number }; 
    rowHeight: number;
  };
}

// Structure for the AI's suggestion for a widget
export interface AIWidgetSuggestion {
  title: string;
  type: "bar" | "line" | "pie" | "kpi" | "table" | "scatter";
  sqlQuery: string;
  xKey?: string;
  yKeys?: string[];
  description?: string;
  kpiValueKey?: string; 
  // AI might also suggest these for better chart rendering
  zKey?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xUnit?: string;
  yUnit?: string;
}

