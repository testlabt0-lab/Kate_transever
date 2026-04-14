'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Clock,
  AlertTriangle,
  Package,
  CheckCircle,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Reminder {
  id: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  reminderDateTime: string;
  status: string;
  repeatType: string;
}

interface IsolatedReminder {
  id: string;
  shipmentItemId: string;
  remindAt: string;
  intervalHours: number;
  isActive: boolean;
  reminderCount: number;
  shipmentItem: {
    id: string;
    totalPieces: number;
    totalFee: number;
    farmer: { name: string };
    agent: { name: string };
    shipment: {
      id: string;
      date: string;
      weekDay: string | null;
    };
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export function RemindersWidget() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isolatedReminders, setIsolatedReminders] = useState<IsolatedReminder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadData();
    // تحديث كل دقيقة
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [remindersRes, isolatedRes, notificationsRes] = await Promise.all([
        fetch('/api/reminders?status=PENDING'),
        fetch('/api/isolated-reminders?activeOnly=true'),
        fetch('/api/notifications?unreadOnly=true&limit=5'),
      ]);

      const remindersData = await remindersRes.json();
      const isolatedData = await isolatedRes.json();
      const notificationsData = await notificationsRes.json();

      setReminders(remindersData.reminders?.slice(0, 5) || []);
      setIsolatedReminders(isolatedData.reminders?.slice(0, 5) || []);
      setNotifications(notificationsData.notifications?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'dismiss' }),
      });
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const completeReminder = async (id: string) => {
    try {
      await fetch(`/api/reminders?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      setReminders(reminders.filter(r => r.id !== id));
      toast({ title: 'تم', description: 'تم إكمال التذكير' });
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DELIVERY': return <Truck className="h-4 w-4" />;
      case 'SHIPMENT': return <Package className="h-4 w-4" />;
      case 'ISOLATED_ITEM': return <AlertTriangle className="h-4 w-4" />;
      case 'TIMER': return <Clock className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'NORMAL': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'LOW': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'انتهى';
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `خلال ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `خلال ${Math.floor(diff / 3600000)} ساعة`;
    return date.toLocaleDateString('ar-SA');
  };

  const totalItems = reminders.length + isolatedReminders.length + notifications.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </CardContent>
      </Card>
    );
  }

  if (totalItems === 0) {
    return null;
  }

  return (
    <Card className={expanded ? '' : 'overflow-hidden'}>
      <CardHeader className="p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            التذكيرات والإشعارات
            {totalItems > 0 && (
              <Badge className="bg-red-500 text-white text-xs">{totalItems}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-3 pt-0 space-y-3 max-h-80 overflow-y-auto">
          {/* العناصر المحايدة */}
          {isolatedReminders.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                عناصر محايدة ({isolatedReminders.length})
              </p>
              {isolatedReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="p-2 bg-red-50 border border-red-200 rounded-lg text-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-red-800">
                        {reminder.shipmentItem.farmer.name} → {reminder.shipmentItem.agent.name}
                      </p>
                      <p className="text-xs text-red-600">
                        {reminder.shipmentItem.totalPieces} حبة • {reminder.shipmentItem.totalFee.toLocaleString()} ريال
                      </p>
                      <p className="text-xs text-red-500 mt-1">
                        {reminder.shipmentItem.shipment.weekDay || new Date(reminder.shipmentItem.shipment.date).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {reminder.reminderCount} تذكير
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* التذكيرات */}
          {reminders.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                تذكيرات ({reminders.length})
              </p>
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-amber-800">{reminder.title}</p>
                      {reminder.description && (
                        <p className="text-xs text-amber-600">{reminder.description}</p>
                      )}
                      <p className="text-xs text-amber-500 mt-1">
                        {formatTime(reminder.reminderDateTime)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-emerald-600"
                      onClick={() => completeReminder(reminder.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* الإشعارات */}
          {notifications.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-blue-600 flex items-center gap-1">
                <Bell className="h-3 w-3" />
                إشعارات ({notifications.length})
              </p>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-2 border rounded-lg text-sm ${getPriorityColor(notification.priority)}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-xs opacity-80">{notification.message}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => dismissNotification(notification.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Missing import fix
function Truck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}
