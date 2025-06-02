//components/header.tsx
'use client';

import { useState, useEffect } from 'react';
import { Settings, MessageSquare, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Moon, Sun, Laptop } from 'lucide-react';
import { useTheme } from 'next-themes';
import QueryLogo from './QueryLogo'; // Importación correcta como default import

export const Header = () => {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      // استدعاء API لتسجيل الخروج
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // مسح أي عناصر localStorage متعلقة بالمصادقة
      localStorage.removeItem('userId');
      
      // مسح الكوكيز من جانب العميل
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // استخدام window.location.href بدلاً من router.push للقيام بإعادة تحميل كاملة للصفحة
      window.location.href = '/login';
    } catch (error) {
      console.error('فشل تسجيل الخروج:', error);
      
      // حتى في حالة الخطأ، مسح الكوكيز والذهاب إلى صفحة تسجيل الدخول
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      window.location.href = '/login';
    }
  };

  const handleClear = () => {
    router.push('/');
  };

  if (!mounted) {
    return (
      <header className="w-full py-4 px-6 border-b border-gray-100 bg-white dark:bg-gray-900 dark:border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Logo placeholder during loading */}
            <div className="h-12 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-6">
            {/* Placeholders for buttons */}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full py-4 px-6 border-b border-gray-100 bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div 
          className="flex items-center cursor-pointer"
          onClick={handleClear}
        >
          {/* استخدام مكون React للوجو */}
          <QueryLogo />
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push('/aiquery')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            title="Chat"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="hidden sm:inline text-sm">Chat</span>
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
            <span className="hidden sm:inline text-sm">Settings</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-gray-100 shadow-lg rounded-lg dark:bg-gray-800 dark:border-gray-700">
              <DropdownMenuItem 
                onClick={() => setTheme("light")}
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Sun className="mr-2 h-4 w-4" />
                <span>Light</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setTheme("dark")}
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setTheme("system")}
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Laptop className="mr-2 h-4 w-4" />
                <span>System</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline text-sm">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};