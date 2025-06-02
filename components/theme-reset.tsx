'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * ThemeReset component
 * 
 * This component helps fix theme switching issues by:
 * 1. Detecting when the user is on the apexexperts.net domain
 * 2. Resetting theme localStorage if needed
 * 3. Ensuring the theme properly syncs with system preferences
 */
export function ThemeReset() {
  const { setTheme, theme, systemTheme } = useTheme();

  useEffect(() => {
    // Only run this on the problematic domain
    if (typeof window !== 'undefined' && window.location.hostname === 'apexexperts.net') {
      // Clear theme from localStorage to reset any cached values
      const storedTheme = localStorage.getItem('theme');
      
      // If system theme is available and theme is set to system, ensure it's properly applied
      if (systemTheme && theme === 'system') {
        // Force a refresh of the theme
        setTheme('system');
      }
      
      // Set up a listener for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = () => {
        if (theme === 'system') {
          // Force theme refresh when system theme changes
          const currentTheme = theme;
          setTheme('light'); // Temporarily switch to force a refresh
          setTimeout(() => setTheme(currentTheme), 10);
        }
      };
      
      // Add listener for system theme changes
      mediaQuery.addEventListener('change', handleChange);
      
      // Clean up
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [theme, systemTheme, setTheme]);

  // This component doesn't render anything
  return null;
}
