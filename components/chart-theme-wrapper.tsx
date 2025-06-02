'use client';

import { useEffect, useState } from 'react';

// This component wraps chart elements and provides theme detection
export function useChartTheme() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    // Check theme on mount
    checkTheme();

    // Set up observer to detect theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          checkTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Return theme-aware colors and styles
  return {
    isDarkMode,
    colors: {
      axis: isDarkMode ? '#fff' : '#666',
      grid: isDarkMode ? '#374151' : '#e0e0e0',
      text: isDarkMode ? '#fff' : '#333',
      background: isDarkMode ? '#1f2937' : '#fff',
      tooltip: {
        bg: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        text: isDarkMode ? '#e2e8f0' : '#333',
        border: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      }
    }
  };
}
