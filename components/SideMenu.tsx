//components/SideMenu.tsx
"use client";

import React, { FC, useState } from "react";
import { Menu as MenuIcon, X, List, Database } from "lucide-react";
import { Button } from "./ui/button";

export interface SideMenuProps {
  onSelect: (action: string) => void;
  selected: string;
}

const SideMenu: FC<SideMenuProps> = ({ onSelect, selected }) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      label: "Queries",
      icon: List,
      style: "text-primary bg-primary/10",
    },
    {
      label: "Data Action",
      icon: Database,
      style: "text-accent-foreground bg-accent/10",
    }
  ];

  const handleItemClick = (label: string) => {
    onSelect(label);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg hover:bg-muted/50 transition-colors duration-200"
      >
        {isOpen ? <X className="h-5 w-5 text-foreground" /> : <MenuIcon className="h-5 w-5 text-foreground" />}
      </Button>
      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 glass-card border border-border rounded-lg shadow-lg z-50">
          <div className="p-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.label}
                  variant={selected === item.label ? "secondary" : "ghost"}
                  className={`w-full justify-start transition-all duration-200 
                    ${selected === item.label 
                      ? 'bg-primary/10' 
                      : 'hover:bg-muted/50'
                    }
                    hover:translate-x-1
                    group
                  `}
                  onClick={() => handleItemClick(item.label)}
                >
                  <Icon className={`mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110 
                    ${selected === item.label ? item.style.split(' ')[0] : 'text-muted-foreground'}`} 
                  />
                  <span className={`transition-colors duration-200
                    ${selected === item.label ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SideMenu;