'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@prisma/client';

interface User {
  username: string;
  role: Role;
}

interface UseAuthOptions {
  requireAdmin?: boolean;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { requireAdmin = false } = options;
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication on mount - reading from localStorage is a side effect
    let isMounted = true;

    const init = () => {
      const userStr = localStorage.getItem('user');

      if (!userStr) {
        if (isMounted) {
          router.push('/login');
          setIsLoading(false);
        }
        return;
      }

      try {
        const userData = JSON.parse(userStr) as User;

        if (requireAdmin && userData.role !== 'ADMIN') {
          if (isMounted) {
            router.push('/dashboard');
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setUser(userData);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          router.push('/login');
          setIsLoading(false);
        }
      }
    };

    // Use requestAnimationFrame to defer state updates
    requestAnimationFrame(() => {
      init();
    });

    return () => {
      isMounted = false;
    };
  }, [router, requireAdmin]);

  return { user, isLoading };
}
