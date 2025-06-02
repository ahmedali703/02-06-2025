'use client';

import React from 'react';
import { LucideIcon, Home, BarChart2, Grid, Layout, Database, Plus } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, onClick }) => {
  return (
    <div 
      className={`flex items-center p-2 rounded-lg cursor-pointer ${
        active 
          ? 'tab active' 
          : 'tab'
      }`}
      onClick={onClick}
    >
      <Icon className="w-5 h-5 mr-3" />
      <span>{label}</span>
      {active && <div className="w-1.5 h-1.5 ml-auto bg-primary rounded-full"></div>}
    </div>
  );
};

const Sidebar: React.FC = () => {
  return (
    <div className="w-64 border-r border-border bg-card flex flex-col">
      <div className="p-4">
        <h2 className="text-xl font-semibold text-card-foreground">Private 2</h2>
      </div>
      
      <div className="flex-1 px-3 py-2 space-y-1">
        <SidebarItem icon={Grid} label="Grid" />
        <SidebarItem icon={Layout} label="Board" />
        <SidebarItem icon={Database} label="Bricks data" />
        <SidebarItem icon={Grid} label="Grid 1" />
        <SidebarItem icon={BarChart2} label="Dashboard" active />
        <SidebarItem icon={Database} label="Dashboard Data" />
      </div>
      
      <div className="p-3 border-t border-border">
        <button className="btn-secondary w-full flex items-center justify-center">
          <Plus className="w-5 h-5 mr-3" />
          <span>Add new</span>
        </button>
      </div>
      
      <div className="p-3 border-t border-border">
        <div className="query-card p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium gradient-text">Upgrade to Premium</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: '50%' }}></div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">10 of 20 AI messages left</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
