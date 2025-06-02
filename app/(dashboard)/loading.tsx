// app/dashboard/loading.tsx
'use client';

import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="w-full h-[70vh] flex flex-col items-center justify-center">
      <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
      <h3 className="text-lg font-medium text-gray-600 mb-1"> Loading dashboard...</h3>
      <p className="text-sm text-gray-500"> Please wait...</p>
    </div>
  );
}