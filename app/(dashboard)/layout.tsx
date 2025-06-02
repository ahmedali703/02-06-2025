'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Users,
  CreditCard,
  Settings,
  ChevronDown,
  Menu,
  X,
  Home,
  Cpu,
  BarChart3,
  MessageCircle,
  Moon,
  LogOut,
  Database,
  Brain,
  User,
  Building2,
  SparklesIcon,
} from 'lucide-react';

interface SidebarLink {
  title: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  submenu?: {
    title: string;
    href: string;
    adminOnly?: boolean;
    managerOnly?: boolean;
  }[];
}

// Define sidebar links with role-based permissions
const sidebarLinks: SidebarLink[] = [
  {
    title: 'Home',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Members',
    href: '/dashboard/members',
    icon: Users,
    adminOnly: false, // Both admin and manager can access
    submenu: [
      { title: 'All Members', href: '/dashboard/members' },
      { title: 'Add Member', href: '/dashboard/members/add' },
    ],
  },
  {
    title: 'Plans',
    href: '/dashboard/plans',
    icon: BarChart3,
    adminOnly: true,
    submenu: [
      { title: 'Current Plan', href: '/dashboard/plans/current' },
      { title: 'Available Plans', href: '/dashboard/plans/available' },
      { title: 'Query Credits', href: '/dashboard/plans/credits' },
    ],
  },
  {
    title: 'Database',
    href: '/dashboard/database',
    icon: Database,
    adminOnly: true,
    submenu: [
      { title: 'Database Settings', href: '/dashboard/database' },
      { title: 'Tables Management', href: '/dashboard/database/tables' },
      { title: 'Add Table', href: '/dashboard/database/add' },
    ],
  },
  {
    title: 'AI Settings',
    href: '/dashboard/ai-settings',
    icon: Brain,
    adminOnly: true,
    submenu: [
      { title: 'Model & Settings', href: '/dashboard/ai-settings' },
      { title: 'Custom Instructions', href: '/dashboard/ai-settings/custom-instructions' },
    ],
  },
  {
    title: 'Billing',
    href: '/dashboard/billing',
    icon: CreditCard,
    adminOnly: true,
    submenu: [
      { title: 'Usage', href: '/dashboard/billing/usage' },
      { title: 'Billing Details', href: '/dashboard/billing/details' },
      { title: 'Payment Method', href: '/dashboard/billing/method' },
      { title: 'Billing History', href: '/dashboard/billing/history' },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [userData, setUserData] = useState({ 
    name: 'Loading...', 
    email: 'Please wait...',
    role: '',
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0 
  });
  const pathname = usePathname();

  useEffect(() => {
    // Function to fetch user data
    const fetchUserData = async () => {
      try {
        // Fetch user data
        const userResponse = await fetch('/api/user/me', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          
          // Fetch dashboard stats
          const statsResponse = await fetch('/api/dashboard/stats', {
            credentials: 'include',
            cache: 'no-store'
          });
          
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            
            setUserData({
              name: userData.NAME || userData.name || 'User',
              email: userData.EMAIL || userData.email || 'user@example.com',
              role: userData.ROLE || userData.role || 'USER',
              totalQueries: statsData.stats?.totalQueries || 0,
              successfulQueries: statsData.stats?.successfulQueries || 0,
              failedQueries: statsData.stats?.failedQueries || 0
            });
          } else {
            setUserData({
              name: userData.NAME || userData.name || 'User',
              email: userData.EMAIL || userData.email || 'user@example.com',
              role: userData.ROLE || userData.role || 'USER',
              totalQueries: 0,
              successfulQueries: 0,
              failedQueries: 0
            });
          }
        } else {
          throw new Error('Failed to fetch user data');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserData({ 
          name: 'Guest User', 
          email: 'Unable to load user data',
          role: 'USER',
          totalQueries: 0,
          successfulQueries: 0,
          failedQueries: 0
        });
      }
    };

    fetchUserData();
  }, []);

  const isAdmin = userData.role === 'ADMIN';
  const isManager = userData.role === 'MANAGER';

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  const toggleSubmenu = (title: string) => {
    setExpandedItem(expandedItem === title ? null : title);
  };
  
  const handleLogout = () => {
    // Clear cookies and localStorage
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.removeItem('userId');
    
    // Redirect to login page
    router.push('/login');
  };

  // Filter sidebar links based on user role
  const filteredSidebarLinks = sidebarLinks.filter(link => 
    !link.adminOnly || (link.adminOnly && isAdmin)
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - glass effect */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg px-6">
        <div className="flex items-center">
          <div className="ml-6 flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-gray-800 dark:text-gray-100">Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Quick Stats - Now dynamically populated */}
        <div className="hidden md:flex items-center space-x-8">
          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total Queries: </span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{userData.totalQueries.toLocaleString()}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">Successful: </span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{userData.successfulQueries.toLocaleString()}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">Failed: </span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{userData.failedQueries.toLocaleString()}</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-4">
          <Link href="/aiquery" className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200">
            <MessageCircle className="h-5 w-5" />
          </Link>
          <Link href="/dashboard/profile" className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200">
            <Settings className="h-5 w-5" />
          </Link>
          <button 
            onClick={handleLogout}
            className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Page Content */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}