//lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Helper function to sanitize circular references in objects for JSON serialization
 * Safely handles Oracle DB objects and other special objects with circular references
 */
export function sanitizeForJSON(obj: any): any {
  // For null, undefined, or primitive types, return as is
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle circular references by creating a new object with only serializable properties
  const seen = new WeakSet();
  
  function sanitize(data: any): any {
    // Short-circuit for null or primitives
    if (data === null || data === undefined || typeof data !== 'object') {
      return data;
    }
    
    // Detect circular references
    if (seen.has(data)) {
      return "[Circular Reference]";
    }
    
    // Add this object to our seen set
    seen.add(data);
    
    // Handle Date objects - convert to ISO string
    if (data instanceof Date) {
      return data.toISOString();
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => sanitize(item));
    }
    
    // Skip special Oracle DB objects or objects with special constructors
    const constructor = data.constructor?.name;
    if (constructor && constructor !== 'Object' && constructor !== 'Array') {
      if (constructor === 'NVPair' || constructor.startsWith('Oracle')) {
        return "[Oracle Object]";
      }
    }
    
    // Process normal objects
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Skip functions, symbols, and other non-serializable types
        if (typeof data[key] !== 'function' && typeof data[key] !== 'symbol') {
          try {
            result[key] = sanitize(data[key]);
          } catch (err) {
            // If any error occurs, replace with placeholder
            result[key] = "[Non-serializable data]";
          }
        }
      }
    }
    
    return result;
  }
  
  return sanitize(obj);
}

/**
 * Function to safely convert Oracle DB result rows to plain objects
 * Handles LOB and other special Oracle data types
 */
export function safelyConvertRowsToObjects(rows: any[]): any[] {
  if (!rows || !Array.isArray(rows)) return [];
  
  return rows.map(row => {
    const plainObj: Record<string, any> = {};
    
    // Extract only the keys that are present in the original object
    Object.keys(row).forEach(key => {
      let value = row[key];
      
      // Convert special Oracle types like CLOB, BLOB to strings or appropriate formats
      if (value && typeof value === 'object' && value.constructor && value.constructor.name !== 'Object') {
        if (typeof value.toString === 'function') {
          plainObj[key] = value.toString();
        } else {
          plainObj[key] = null;
        }
      } else {
        plainObj[key] = value;
      }
    });
    
    return plainObj;
  });
}

/**
 * Format a file size in bytes to a human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Convert camelCase to Title Case
 */
export function camelToTitleCase(text: string): string {
  const result = text.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Format a date string to a localized format
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('default', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
    return dateString;
  }
}

/**
 * Truncate text with ellipsis at a certain length
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
}


// Helper function to create default position for a chart
export function createDefaultPosition(index: number, columns: number = 12) {
  const chartsPerRow = Math.floor(columns / 4);
  const row = Math.floor(index / chartsPerRow);
  const col = index % chartsPerRow;
  
  return {
    x: col * 4,
    y: row * 2,
    w: 4,
    h: 2
  };
}