'use client';

import { useEffect, useState } from 'react';
import { useOffline } from '@/hooks/use-offline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Wifi,
  WifiOff,
  CloudOff,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, isOffline, getPendingActions, syncPendingActions } = useOffline();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  useEffect(() => {
    const loadPending = async () => {
      const pending = await getPendingActions();
      setPendingCount(pending.length);
    };
    loadPending();

    // تحديث دوري
    const interval = setInterval(loadPending, 30000);
    return () => clearInterval(interval);
  }, [getPendingActions]);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      // مزامنة تلقائية عند استعادة الاتصال
      handleSync();
    }
  }, [isOnline, pendingCount]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const synced = await syncPendingActions();
      if (synced > 0) {
        setPendingCount((prev) => prev - synced);
        setShowSyncSuccess(true);
        setTimeout(() => setShowSyncSuccess(false), 3000);
      }
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50">
      <Card className={`border-2 ${isOffline ? 'border-red-500 bg-red-50' : 'border-amber-500 bg-amber-50'}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isOffline ? (
                <>
                  <WifiOff className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-700">غير متصل</p>
                    <p className="text-xs text-red-600">البيانات محفوظة محلياً</p>
                  </div>
                </>
              ) : showSyncSuccess ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-green-700">تمت المزامنة!</p>
                </>
              ) : (
                <>
                  <CloudOff className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-700">
                      {pendingCount} إجراء معلق
                    </p>
                    <p className="text-xs text-amber-600">في انتظار المزامنة</p>
                  </div>
                </>
              )}
            </div>

            {isOnline && pendingCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={syncing}
                className="h-8"
              >
                <RefreshCw className={`h-4 w-4 me-1 ${syncing ? 'animate-spin' : ''}`} />
                مزامنة
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// شريط الحالة العلوي
export function ConnectionStatusBar() {
  const { isOnline, isOffline } = useOffline();
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (isOnline) {
      const wasOffline = sessionStorage.getItem('was_offline');
      if (wasOffline === 'true') {
        // Use requestAnimationFrame to avoid the setState in effect warning
        const timer = setTimeout(() => {
          setShowRestored(true);
          setTimeout(() => {
            setShowRestored(false);
            sessionStorage.removeItem('was_offline');
          }, 3000);
        }, 0);
        return () => clearTimeout(timer);
      }
    } else {
      sessionStorage.setItem('was_offline', 'true');
    }
  }, [isOnline]);

  if (isOffline) {
    return (
      <div className="bg-red-600 text-white py-2 px-4 text-center text-sm font-medium animate-pulse">
        <WifiOff className="h-4 w-4 inline me-2" />
        غير متصل بالإنترنت - سيتم حفظ البيانات محلياً
      </div>
    );
  }

  if (showRestored) {
    return (
      <div className="bg-green-600 text-white py-2 px-4 text-center text-sm font-medium">
        <CheckCircle className="h-4 w-4 inline me-2" />
        تم استعادة الاتصال!
      </div>
    );
  }

  return null;
}

// مؤشر صغير للحالة
export function ConnectionBadge() {
  const { isOnline, isOffline } = useOffline();

  return (
    <Badge
      variant="outline"
      className={`gap-1 ${
        isOnline
          ? 'bg-green-50 text-green-700 border-green-300'
          : 'bg-red-50 text-red-700 border-red-300'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3" />
          متصل
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          غير متصل
        </>
      )}
    </Badge>
  );
}

export default OfflineIndicator;
