// components/context-menu.tsx
import React, { useState, useEffect, useRef } from 'react';

interface ContextMenuProps {
  children: React.ReactNode;
  items: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  }[];
  onClose?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ 
  children, 
  items,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Calculate position
    const x = e.clientX;
    const y = e.clientY;
    
    setPosition({ x, y });
    setIsOpen(true);
  };
  
  const handleItemClick = (callback: () => void) => {
    callback();
    setIsOpen(false);
    if (onClose) onClose();
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (onClose) onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  return (
    <div className="relative" onContextMenu={handleContextMenu}>
      {children}
      
      {isOpen && (
        <div 
          ref={menuRef}
          className="absolute z-50 min-w-[160px] bg-white rounded-md shadow-lg border border-gray-200 py-1 text-sm"
          style={{ 
            left: `${position.x}px`, 
            top: `${position.y}px`,
            transform: 'translate(-50%, 0)'
          }}
        >
          {items.map((item, index) => (
            <button
              key={index}
              className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
              onClick={() => handleItemClick(item.onClick)}
            >
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
