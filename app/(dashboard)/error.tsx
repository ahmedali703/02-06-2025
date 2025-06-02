// app/dashboard/error.tsx
'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="w-full py-12 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md border border-red-100">
        <div className="flex flex-col items-center text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">حدث خطأ في لوحة التحكم</h3>
          <p className="text-sm text-gray-600 mb-6">
            {error.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              إعادة المحاولة
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              العودة للصفحة الرئيسية
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}