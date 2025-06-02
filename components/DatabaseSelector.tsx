'use client';

import React, { useState, useEffect } from 'react';

type DatabaseTable = {
  ID: number;
  TABLE_NAME: string;
};

interface DatabaseSelectorProps {
  onSelect: (tableId: number) => void;
  selectedId?: number;
}

export default function DatabaseSelector({ onSelect, selectedId }: DatabaseSelectorProps) {
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/tables/list');
        
        if (!response.ok) {
          throw new Error('Failed to fetch tables');
        }
        
        const data = await response.json();
        
        if (data.success && data.tables) {
          setTables(data.tables);
          // Auto-select the first table if none is selected
          if (!selectedId && data.tables.length > 0) {
            onSelect(data.tables[0].ID);
          }
        } else {
          setError(data.error || 'No tables found');
        }
      } catch (err) {
        console.error('Error fetching tables:', err);
        setError('Failed to load tables. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, [onSelect, selectedId]);

  if (loading) {
    return (
      <div className="w-full p-4 bg-gray-50 rounded-md">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 bg-red-50 text-red-600 rounded-md">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-sm underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <label htmlFor="database-table" className="block text-sm font-medium text-gray-700 mb-1">
        Select Data Source
      </label>
      <select
        id="database-table"
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        value={selectedId || ''}
        onChange={(e) => onSelect(Number(e.target.value))}
      >
        {tables.length === 0 ? (
          <option value="" disabled>No tables available</option>
        ) : (
          <>
            <option value="" disabled>Select a table</option>
            {tables.map((table) => (
              <option key={table.ID} value={table.ID}>
                {table.TABLE_NAME}
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
}
