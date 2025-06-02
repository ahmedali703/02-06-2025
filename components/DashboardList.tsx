'use client';

import React from 'react';
import { Edit, Trash2, ExternalLink } from 'lucide-react';

interface DashboardListProps {
  dashboards: any[];
  onEdit: (dashboard: any) => void;
  onDelete: (dashboardId: number) => void;
  onSelect: (dashboard: any) => void;
  isProcessing: boolean;
}

const DashboardList: React.FC<DashboardListProps> = ({
  dashboards,
  onEdit,
  onDelete,
  onSelect,
  isProcessing
}) => {
  if (!dashboards || dashboards.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-muted-foreground">لا توجد لوحات معلومات محفوظة</p>
      </div>
    );
  }

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {dashboards.map((dashboard) => (
        <div key={dashboard.ID} className="glass-card p-4 hover-glow">
          <div className="flex justify-between">
            <h3 
              className="text-lg font-medium text-card-foreground cursor-pointer hover:text-primary"
              onClick={() => onSelect(dashboard)}
            >
              {dashboard.DASHBOARD_NAME}
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(dashboard)}
                disabled={isProcessing}
                className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-card-foreground"
                title="تعديل"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(dashboard.ID)}
                disabled={isProcessing}
                className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            تم التحديث: {formatDate(dashboard.UPDATED_AT)}
          </p>
          <button
            onClick={() => onSelect(dashboard)}
            className="mt-2 text-xs flex items-center text-primary hover:underline"
          >
            عرض <ExternalLink className="w-3 h-3 mr-1" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default DashboardList;
