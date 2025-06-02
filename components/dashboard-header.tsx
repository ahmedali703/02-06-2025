// components/dashboard-header.tsx
'use client';

import React from 'react';
import { X } from 'lucide-react';
import QueryLogo from './QueryLogo';

interface DashboardHeaderProps {
  totalQueries?: number;
  successfulQueries?: number;
  failedQueries?: number;
  onClose?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  totalQueries = 32,
  successfulQueries = 31,
  failedQueries = 1,
  onClose
}) => {
  return (
    <div className="w-full flex items-center justify-between h-[46px] px-4">
      <div className="flex items-center">
        <QueryLogo size={24} />
        <span className="ml-2 font-bold text-gray-800">MYQUERY.AI</span>
      </div>
      
      <div className="flex items-center space-x-6">
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">Total Queries:</span>
          <span className="font-medium">{totalQueries}</span>
        </div>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">Successful:</span>
          <span className="font-medium text-green-600">{successfulQueries}</span>
        </div>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">Failed:</span>
          <span className="font-medium text-red-600">{failedQueries}</span>
        </div>
      </div>
      
      {onClose && (
        <button 
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      )}
    </div>
  );
};
