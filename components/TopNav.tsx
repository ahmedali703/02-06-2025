'use client';

import React from 'react';
import { Menu, Import, Hash, Type, Grid3X3, Share, Search, Bell, Clock } from 'lucide-react';

type UserData = {
  name: string;
  email: string;
  role: string;
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
};

interface TopNavProps {
  userData: UserData;
}

const TopNav: React.FC<TopNavProps> = ({ userData }) => {
  return (
    <div className="bg-primary text-primary-foreground p-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button className="p-2 hover:bg-primary/80 rounded-md">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-medium">Menu</span>
        <button className="p-2 hover:bg-primary/80 rounded-md">
          <Import className="w-5 h-5" />
        </button>
        <span className="font-medium">Import</span>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="tab flex items-center">
          <Hash className="w-5 h-5 mr-1" />
          <span>Number</span>
        </button>
        
        <button className="tab flex items-center">
          <Type className="w-5 h-5 mr-1" />
          <span>Text</span>
        </button>
        
        <button className="tab flex items-center">
          <Grid3X3 className="w-5 h-5 mr-1" />
          <span>Bricks</span>
        </button>
        
        <button className="tab flex items-center">
          <Share className="w-5 h-5 mr-1" />
          <span>Share</span>
        </button>
        
        <div className="flex items-center bg-primary/80 rounded-md px-2 py-1">
          <Search className="w-4 h-4 mr-1" />
          <span>100%</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <button className="p-1 hover:bg-primary/80 rounded-full">
          <Bell className="w-5 h-5" />
        </button>
        <button className="p-1 hover:bg-primary/80 rounded-full">
          <Clock className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default TopNav;







