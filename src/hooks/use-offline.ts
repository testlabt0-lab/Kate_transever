'use client';

import { useState, useEffect, useCallback } from 'react';

interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  lastOnline: Date | null;
}

interface PendingAction {
  id: string;
  type: 'shipment' | 'payment' | 'expense' | 'other';
  data: unknown;
  timestamp: Date;
}

// Hook للتحقق من حالة الاتصال
export function useOffline(): OfflineStatus & {
  saveForLater: (type: string, data: unknown) => Promise<string>;
  getPendingActions: () => Promise<PendingAction[]>;
  removePendingAction: (id: string) => Promise<void>;
  syncPendingActions: () => Promise<number>;
  clearAllPending: () => Promise<void>;
} {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: true,
    isOffline: false,
    lastOnline: null,
  });

  useEffect(() => {
    const updateStatus = () => {
      setStatus({
        isOnline: navigator.onLine,
        isOffline: !navigator.onLine,
        lastOnline: navigator.onLine ? new Date() : status.lastOnline,
      });
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, [status.lastOnline]);

  // حفظ إجراء لتنفيذه لاحقاً
  const saveForLater = useCallback(async (type: string, data: unknown): Promise<string> => {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const action: PendingAction = {
      id,
      type: type as PendingAction['type'],
      data,
      timestamp: new Date(),
    };

    // حفظ في localStorage
    const pending = JSON.parse(localStorage.getItem('pending_actions') || '[]');
    pending.push(action);
    localStorage.setItem('pending_actions', JSON.stringify(pending));

    return id;
  }, []);

  // الحصول على الإجراءات المعلقة
  const getPendingActions = useCallback(async (): Promise<PendingAction[]> => {
    return JSON.parse(localStorage.getItem('pending_actions') || '[]');
  }, []);

  // حذف إجراء معلق
  const removePendingAction = useCallback(async (id: string): Promise<void> => {
    const pending = JSON.parse(localStorage.getItem('pending_actions') || '[]');
    const filtered = pending.filter((action: PendingAction) => action.id !== id);
    localStorage.setItem('pending_actions', JSON.stringify(filtered));
  }, []);

  // مزامنة جميع الإجراءات المعلقة
  const syncPendingActions = useCallback(async (): Promise<number> => {
    const pending = JSON.parse(localStorage.getItem('pending_actions') || '[]');
    let synced = 0;

    for (const action of pending as PendingAction[]) {
      try {
        let endpoint = '';
        switch (action.type) {
          case 'shipment':
            endpoint = '/api/shipments';
            break;
          case 'payment':
            endpoint = '/api/payments';
            break;
          case 'expense':
            endpoint = '/api/expenses';
            break;
          default:
            continue;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data),
        });

        if (response.ok) {
          await removePendingAction(action.id);
          synced++;
        }
      } catch (error) {
        console.error('Failed to sync action:', action.id, error);
      }
    }

    return synced;
  }, [removePendingAction]);

  // حذف جميع الإجراءات المعلقة
  const clearAllPending = useCallback(async (): Promise<void> => {
    localStorage.removeItem('pending_actions');
  }, []);

  return {
    ...status,
    saveForLater,
    getPendingActions,
    removePendingAction,
    syncPendingActions,
    clearAllPending,
  };
}

// Hook للتخزين المؤقت
export function useCache() {
  // Use lazy initialization to avoid the setState in effect issue
  const [cacheStatus, setCacheStatus] = useState<{
    isSupported: boolean;
    size: number;
  }>(() => ({
    isSupported: typeof window !== 'undefined' ? 'caches' in window : false,
    size: 0,
  }));

  useEffect(() => {
    if ('caches' in window) {
      caches.keys().then((keys) => {
        setCacheStatus((prev) => ({ ...prev, size: keys.length }));
      });
    }
  }, []);

  const clearCache = useCallback(async () => {
    if (!('caches' in window)) return;

    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    setCacheStatus((prev) => ({ ...prev, size: 0 }));
  }, []);

  const preloadData = useCallback(async (routes: string[]) => {
    if (!('caches' in window)) return;

    const cache = await caches.open('khat-v1-api');
    await Promise.all(
      routes.map((route) =>
        fetch(route)
          .then((response) => {
            if (response.ok) {
              cache.put(route, response);
            }
          })
          .catch(() => {})
      )
    );
  }, []);

  return {
    ...cacheStatus,
    clearCache,
    preloadData,
  };
}

// Hook للتزامن في الخلفية
export function useBackgroundSync() {
  // Use lazy initialization to avoid setState in effect
  const [isRegistered, setIsRegistered] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'serviceWorker' in navigator && 'SyncManager' in window;
  });

  useEffect(() => {
    // No need to set state here since we initialized lazily
  }, []);

  const registerSync = useCallback(async (tag: string) => {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
      console.log('Background sync not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      return true;
    } catch (error) {
      console.error('Failed to register sync:', error);
      return false;
    }
  }, []);

  return {
    isRegistered,
    registerSync,
  };
}
