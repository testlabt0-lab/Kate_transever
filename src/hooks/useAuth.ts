'use client';

import { useState, useCallback } from 'react';

export interface User {
  id: string;
  username: string;
  role: string;
}

// Hook مبسط للتحقق من المستخدم
export function useAuth(requireAdmin = false) {
  const [user] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;

    const loggedIn = localStorage.getItem('loggedIn');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    if (loggedIn === 'true' && username) {
      if (requireAdmin && role !== 'ADMIN') {
        // توجيه للداشبورد لو مش admin
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 0);
        return null;
      }
      return { id: '1', username, role: role || 'WORKER' };
    }

    // توجيه لصفحة الدخول
    setTimeout(() => {
      window.location.href = '/';
    }, 0);
    return null;
  });

  const logout = useCallback(() => {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    window.location.href = '/';
  }, []);

  return { user, loading: false, logout };
}
