// context/UserContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserContextType {
  userId: number | null;
  setUserId: (id: number | null) => void;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (status: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const initializeUser = () => {
      // Check for token first
      const hasToken = document.cookie.includes('token=');
      if (!hasToken) {
        setUserId(null);
        localStorage.removeItem('userId');
        return;
      }

      // If token exists, try to get userId from localStorage
      const storedUserId = localStorage.getItem('userId');
      if (storedUserId) {
        setUserId(parseInt(storedUserId, 10));
      }
      
      // Get onboarding status from localStorage
      const onboardingStatus = localStorage.getItem('hasCompletedOnboarding');
      if (onboardingStatus === 'true') {
        setHasCompletedOnboarding(true);
      }
    };

    initializeUser();
    setIsLoading(false);

    // Add event listener for storage changes
    window.addEventListener('storage', initializeUser);
    return () => window.removeEventListener('storage', initializeUser);
  }, []);

  // Update localStorage and cookie when userId changes
  useEffect(() => {
    if (userId) {
      localStorage.setItem('userId', userId.toString());
      // Set userId cookie with same expiration as token (30 days)
      document.cookie = `userId=${userId}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    } else {
      localStorage.removeItem('userId');
      document.cookie = `userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
    }
  }, [userId]);
  
  // Update localStorage when onboarding status changes
  useEffect(() => {
    localStorage.setItem('hasCompletedOnboarding', hasCompletedOnboarding.toString());
  }, [hasCompletedOnboarding]);

  return (
    <UserContext.Provider value={{ 
      userId, 
      setUserId, 
      isLoading, 
      hasCompletedOnboarding, 
      setHasCompletedOnboarding 
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}