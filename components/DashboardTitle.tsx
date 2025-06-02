'use client';

import React from 'react';

interface DashboardTitleProps {
  title: string;
  description?: string;
}

const DashboardTitle: React.FC<DashboardTitleProps> = ({ title, description }) => {
  return (
    <div className="query-card p-6 text-center hero-gradient">
      <h1 className="text-2xl font-bold gradient-text">{title}</h1>
      {description && (
        <p className="mt-2 text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

export default DashboardTitle;
