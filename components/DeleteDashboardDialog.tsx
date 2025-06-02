'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteDashboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dashboardName: string;
  isProcessing: boolean;
}

const DeleteDashboardDialog: React.FC<DeleteDashboardDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  dashboardName,
  isProcessing
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="glass-card p-6 max-w-md w-full rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-destructive flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            حذف لوحة المعلومات
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-secondary"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-muted-foreground">
            هل أنت متأكد من أنك تريد حذف لوحة المعلومات 
            <span className="font-semibold text-foreground mx-1">"{dashboardName}"</span>؟ 
            هذا الإجراء لا يمكن التراجع عنه.
          </p>
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
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isProcessing ? (
              <span className="animate-pulse">جارٍ الحذف...</span>
            ) : (
              'تأكيد الحذف'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteDashboardDialog;
