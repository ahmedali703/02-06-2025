//components/sidebar.tsx
'use client';

import '@/styles/sidebar.css';

import { useState, useEffect } from 'react';
import { Settings, MessageSquare, LogOut, Users, User, Database, ChevronDown, ChevronRight, BarChart3, Activity, FileText, Table, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import QueryLogo from './QueryLogo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const menuItems = [
  { icon: MessageSquare, label: 'Chat', href: '/aiquery' },
  { icon: LayoutDashboard, label: 'Dashboard Builder', href: '/dashboard-builder' },
  { icon: Table, label: 'Tables Browser', href: '/dashboard/tables' },
  { icon: Activity, label: 'Activity', href: '/dashboard/activity' },
  { icon: Database, label: 'Database', href: '/dashboard/database' },
  { icon: Users, label: 'Members', href: '/dashboard/members' },
  { icon: Settings, label: 'Settings', href: '/dashboard' }
];

interface DatabaseOption {
  ORG_ID: number;
  ORG_NAME: string;
  DATABASE_TYPE: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [databases, setDatabases] = useState<DatabaseOption[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseOption | null>(null);
  const [databaseDropdownOpen, setDatabaseDropdownOpen] = useState(false);

  // Fetch available databases
  useEffect(() => {
    const fetchDatabases = async () => {
      try {
        // Get user ID from localStorage or cookies
        const userId = localStorage.getItem('userId') || document.cookie
          .split('; ')
          .find(row => row.startsWith('userId='))
          ?.split('=')[1];
        
        console.log('Fetching databases for user:', userId);
        
        // Fetch databases with user context
        const response = await fetch(`/api/databases${userId ? `?userId=${userId}` : ''}`);
        if (!response.ok) {
          throw new Error('Failed to fetch databases');
        }
        
        const data = await response.json();
        console.log('Fetched databases:', data);
        setDatabases(data);
        
        // Set default database if available
        if (data.length > 0) {
          const storedOrgId = localStorage.getItem('selectedOrgId');
          if (storedOrgId) {
            const found = data.find((db: DatabaseOption) => db.ORG_ID === parseInt(storedOrgId));
            if (found) {
              setSelectedDatabase(found);
            } else {
              setSelectedDatabase(data[0]);
              localStorage.setItem('selectedOrgId', data[0].ORG_ID.toString());
            }
          } else {
            setSelectedDatabase(data[0]);
            localStorage.setItem('selectedOrgId', data[0].ORG_ID.toString());
          }
        }
      } catch (error) {
        console.error('Error fetching databases:', error);
      }
    };

    fetchDatabases();
    
    // Refresh database list when the component is mounted and when the window gets focus
    window.addEventListener('focus', fetchDatabases);
    
    return () => {
      window.removeEventListener('focus', fetchDatabases);
    };
  }, []);

  const handleDatabaseSelect = (db: DatabaseOption) => {
    setSelectedDatabase(db);
    localStorage.setItem('selectedOrgId', db.ORG_ID.toString());
    setDatabaseDropdownOpen(false);
  };

  const handleLogout = async () => {
    try {
      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Clear auth-related localStorage items
      localStorage.removeItem('userId');
      localStorage.removeItem('selectedOrgId');
      
      // Clear cookies
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Use window.location.href for a full page reload
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      
      // Even on error, clear cookies and go to login page
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      window.location.href = '/login';
    }
  };

  return (
    <TooltipProvider>
      <aside className="fixed left-0 top-0 bottom-0 w-16 bg-[#0F172A] flex flex-col items-center py-4 z-50 hover:w-64 group transition-all duration-300 overflow-hidden border-r border-gray-800">
        {/* Logo at the top */}
        <div className="mb-4 p-2 bg-[#1F2937] rounded-full flex items-center justify-center">
          <div className="w-8 h-8 flex items-center justify-center text-indigo-400">
            <QueryLogo size={20} />
          </div>
          <span className="ml-3 text-white font-semibold hidden group-hover:block whitespace-nowrap">AI Query</span>
        </div>
        
        {/* Database Selector */}
        <div className="w-full px-3 mb-4 hidden group-hover:block">
          <Popover open={databaseDropdownOpen} onOpenChange={setDatabaseDropdownOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between bg-[#1F2937] border-gray-700 text-gray-200 hover:bg-[#374151] hover:text-white"
              >
                <span className="truncate">
                  {selectedDatabase ? selectedDatabase.ORG_NAME : "Select Database"}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 bg-[#1F2937] border-gray-700 text-gray-200 p-0">
              <div className="max-h-[300px] overflow-y-auto">
                {databases.length > 0 ? (
                  // Show available databases
                  databases.map((db) => (
                    <button
                      key={db.ORG_ID}
                      className={cn(
                        "w-full text-left px-3 py-2 hover:bg-[#374151] transition-colors",
                        selectedDatabase?.ORG_ID === db.ORG_ID ? "bg-[#374151] text-white" : ""
                      )}
                      onClick={() => handleDatabaseSelect(db)}
                    >
                      <div className="flex items-center">
                        <Database className="h-4 w-4 mr-2 text-indigo-400" />
                        <span className="truncate">{db.ORG_NAME}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  // Show message when no databases are available
                  <div className="p-3 text-center">
                    <p className="text-sm text-gray-400 mb-2">No databases available</p>
                    <Link 
                      href="/dashboard/database/new" 
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center"
                    >
                      <span className="mr-1">+</span> Add Database Connection
                    </Link>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Navigation items */}
        <nav className="flex-1 w-full">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <li key={item.href} className="flex justify-center group-hover:justify-start px-3">
                  <Link
                    href={item.href}
                    className={`flex items-center p-2 rounded-md transition-all duration-200 w-full ${
                      isActive
                        ? 'bg-[#374151] text-[#6366F1]'
                        : 'text-gray-400 hover:bg-[#1F2937] hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="ml-3 hidden group-hover:block whitespace-nowrap">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Profile and Logout at the bottom */}
        <div className="mt-auto w-full space-y-2 px-3">
          <Link
            href="/dashboard/profile"
            className="flex items-center p-2 text-gray-400 hover:text-white hover:bg-[#1F2937] rounded-md transition-all duration-200 w-full"
          >
            <User className="h-5 w-5" />
            <span className="ml-3 hidden group-hover:block whitespace-nowrap">Profile</span>
          </Link>
          
          <button
            onClick={handleLogout}
            className="flex items-center p-2 text-gray-400 hover:text-white hover:bg-[#1F2937] rounded-md transition-all duration-200 w-full"
          >
            <LogOut className="h-5 w-5" />
            <span className="ml-3 hidden group-hover:block whitespace-nowrap">Logout</span>
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}