'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { useUser } from '../context/UserContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasCompletedOnboarding } = useUser();

  // Define routes where sidebar should not be shown
  const noSidebarRoutes = [
    '/',                // Main website page
    '/login',           // Login page
    '/register',        // Register page
    '/onboarding',      // Onboarding page
    '/verify',          // Verification page
    '/verify-email',    // Email verification
    '/verify-account',  // Account verification
    '/verify-phone',    // Phone verification
    '/setup',           // Setup after verification
    '/welcome',         // Welcome page
    '/forgot-password', // Password recovery
    '/reset-password',  // Password reset
    '/setup-account',   // Account setup
    '/setup-profile',   // Profile setup
    '/setup-database',  // Database setup
    '/verification-sent', // Verification sent page
    '/set-password',    // Set password page
  ];

  // Check if current route should have sidebar
  const shouldShowSidebar = !noSidebarRoutes.some(route => 
    pathname === route || pathname?.startsWith(`${route}/`)
  ) && hasCompletedOnboarding;

  useEffect(() => {
    // Event listener for opening table tabs from the sidebar
    const handleOpenTableTab = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { tableId, tableName, columns } = customEvent.detail;
      
      // Store the table information in localStorage for the table-view component
      localStorage.setItem('selectedTableId', tableId.toString());
      localStorage.setItem('selectedTableName', tableName);
      localStorage.setItem('selectedTableColumns', JSON.stringify(columns));
      
      // Navigate to the table view page
      router.push('/dashboard/tables');
    };

    // Add event listener
    document.addEventListener('openTableTab', handleOpenTableTab as EventListener);

    // Clean up
    return () => {
      document.removeEventListener('openTableTab', handleOpenTableTab as EventListener);
    };
  }, [router]);

  // If no sidebar should be shown, render just the content
  if (!shouldShowSidebar) {
    return <div className="min-h-screen bg-white dark:bg-gray-900">{children}</div>;
  }

  // Otherwise render with sidebar
  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      {/* Global Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 ml-16 transition-all duration-300">
        {children}
      </div>
    </div>
  );
}
