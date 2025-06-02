// app/providers.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';
import { UserProvider } from '@/context/UserContext';
import { ThemeReset } from '@/components/theme-reset';

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <UserProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        {...props}
      >
        <ThemeReset />
        {children}
      </NextThemesProvider>
    </UserProvider>
  );
}