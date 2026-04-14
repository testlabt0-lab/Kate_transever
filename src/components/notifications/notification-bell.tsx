'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  Trash2,
  Package,
  Truck,
  Clock,
  DollarSign,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  createdAt: string;
  isRead: boolean;
  actionUrl?: string;
}

interface NotificationBellProps {
  userRole?: 'ADMIN' | 'WORKER';
}

export function NotificationBell({ userRole }: NotificationBellProps) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?unreadOnly=false&limit=20');
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.stats?.unread || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'ISOLATED_ITEM':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'SHIPMENT':
        return <Package className="h-4 w-4 text-emerald-600" />;
      case 'DELIVERY':
        return <Truck className="h-4 w-4 text-blue-600" />;
      case 'REMINDER':
        return <Clock className="h-4 w-4 text-amber-600" />;
      case 'PAYMENT':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'TIMER':
        return <Clock className="h-4 w-4 text-purple-600" />;
      case 'ALERT':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'SYSTEM':
        return <Settings className="h-4 w-4 text-gray-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getBgColor = (type: string, priority: string) => {
    if (priority === 'URGENT') return 'bg-red-50 dark:bg-red-950 border-r-2 border-r-red-500';
    if (priority === 'HIGH') return 'bg-orange-50 dark:bg-orange-950 border-r-2 border-r-orange-500';
    switch (type) {
      case 'ISOLATED_ITEM':
      case 'ALERT':
        return 'bg-red-50 dark:bg-red-950';
      case 'REMINDER':
      case 'TIMER':
        return 'bg-amber-50 dark:bg-amber-950';
      case 'PAYMENT':
        return 'bg-green-50 dark:bg-green-950';
      case 'SHIPMENT':
      case 'DELIVERY':
        return 'bg-blue-50 dark:bg-blue-950';
      default:
        return 'bg-muted/50';
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `قبل ${diffMins} دقيقة`;
    if (diffHours < 24) return `قبل ${diffHours} ساعة`;
    return `قبل ${diffDays} يوم`;
  };

  const dismissNotification = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'dismiss' }),
      });
      setNotifications(notifications.filter(n => n.id !== id));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const clearRead = async () => {
    try {
      await fetch('/api/notifications?action=clearRead', { method: 'DELETE' });
      setNotifications(notifications.filter(n => !n.isRead));
      toast({ title: 'تم', description: 'تم حذف الإشعارات المقروءة' });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-600 text-white"
            >
              {unreadCount > 9 ? '+9' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              الإشعارات
              {unreadCount > 0 && (
                <Badge className="bg-red-600">{unreadCount} جديد</Badge>
              )}
            </SheetTitle>
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearRead} className="text-xs">
                <Trash2 className="h-3 w-3 me-1" />
                حذف المقروءة
              </Button>
            )}
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mb-2 opacity-50" />
            <p>لا توجد إشعارات</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg ${getBgColor(notification.type, notification.priority)} ${!notification.isRead ? 'ring-1 ring-primary/20' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {notification.actionUrl && (
                          <Link
                            href={notification.actionUrl}
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                          >
                            عرض التفاصيل
                            <ChevronLeft className="h-3 w-3" />
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground"
                          onClick={() => dismissNotification(notification.id)}
                        >
                          إخفاء
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
