// lib/user-utils.ts
'use client';

import { cookies } from 'next/headers';

// Funciones del lado del cliente
export const getUserIdClient = (): number | null => {
  if (typeof window !== 'undefined') {
    const userId = localStorage.getItem('userId');
    return userId ? parseInt(userId, 10) : null;
  }
  return null;
};

export const setUserIdClient = (userId: number): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('userId', userId.toString());
  }
};

export const clearUserIdClient = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('userId');
  }
};

// Funciones del lado del servidor
export const getUserIdServer = async (): Promise<number | null> => {
  try {
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get('userId');
    return userIdCookie ? parseInt(userIdCookie.value, 10) : null;
  } catch (error) {
    console.error('Error getting userId from cookies:', error);
    return null;
  }
};