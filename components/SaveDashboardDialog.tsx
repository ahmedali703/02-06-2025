'use client';

import React, { useState } from 'react';
import { DashboardConfig } from '@/app/(dashboard)/dashboard-builder/schemas';
import { Save, X } from 'lucide-react';

interface SaveDashboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  isProcessing: boolean;
}

const SaveDashboardDialog: React.FC<SaveDashboardDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  isProcessing
}) => {
  const [dashboardName, setDashboardName] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="glass-card p-6 max-w-md w-full rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">حفظ لوحة المعلومات</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-secondary"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label htmlFor="dashboard-name" className="block text-sm font-medium text-muted-foreground mb-2">
            اسم لوحة المعلومات
          </label>
          <input
            id="dashboard-name"
            type="text"
            value={dashboardName}
            onChange={(e) => setDashboardName(e.target.value)}
            placeholder="أدخل اسماً وصفياً للوحة المعلومات"
            className="w-full p-2 rounded-md border border-input bg-transparent text-foreground"
            disabled={isProcessing}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
            disabled={isProcessing}
          >
            إلغاء
          </button>
          <button
            onClick={() => onSave(dashboardName)}
            disabled={!dashboardName.trim() || isProcessing}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center"
          >
            {isProcessing ? (
              <span className="animate-pulse">جارٍ الحفظ...</span>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                حفظ
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveDashboardDialog;
