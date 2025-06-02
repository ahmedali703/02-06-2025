'use client';

import React from 'react';
import { Result } from '@/lib/types';

interface SingleValueIndicatorProps {
  result: Result;
}

/**
 * Component to display a single value indicator
 * Used when the query result is a single value (e.g., count, sum, average)
 */
export const SingleValueIndicator: React.FC<SingleValueIndicatorProps> = ({ result }) => {
  if (!result) {
    return null;
  }

  // Extract the value and label from the result
  const keys = Object.keys(result);
  const valueKey = keys[keys.length - 1]; // Usually the last column is the value
  const labelKey = keys[0]; // Usually the first column is the label
  
  const value = result[valueKey];
  const label = result[labelKey];
  
  // Format the value if it's a number
  const formattedValue = typeof value === 'number' 
    ? new Intl.NumberFormat().format(value)
    : value;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
        {formattedValue}
      </div>
      <div className="text-gray-500 dark:text-gray-400 text-center">
        {label}
      </div>
    </div>
  );
};
