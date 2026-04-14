'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Timer,
  Bell,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface RemainingTime {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isUrgent: boolean;
}

interface TimerData {
  id: string;
  title: string;
  targetDateTime: string;
  status: string;
  remaining: RemainingTime;
  agent?: { name: string } | null;
}

interface ReminderData {
  id: string;
  title: string;
  reminderDateTime: string;
  type: string;
  priority: string;
  status: string;
  timeStatus: {
    isOverdue: boolean;
    isDueSoon: boolean;
    isToday: boolean;
    minutesUntil: number;
  };
}

interface TimersWidgetProps {
  compact?: boolean;
}

export function TimersWidget({ compact = false }: TimersWidgetProps) {
  const [timers, setTimers] = useState<TimerData[]>([]);
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [timersRes, remindersRes] = await Promise.all([
          fetch('/api/timers?active=true'),
          fetch('/api/reminders?status=PENDING')
        ]);

        const timersData = await timersRes.json();
        const remindersData = await remindersRes.json();

        setTimers(timersData.timers || []);
        setReminders(remindersData.reminders || []);
      } catch (error) {
        console.error('Error loading widget data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 60000); // تحديث كل دقيقة
    return () => clearInterval(interval);
  }, []);

  // Real-time countdown update
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => prev.map(timer => {
        const targetTime = new Date(timer.targetDateTime);
        const now = new Date();
        const diff = targetTime.getTime() - now.getTime();

        const remaining: RemainingTime = {
          total: diff,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: diff <= 0,
          isUrgent: diff > 0 && diff < 60 * 60 * 1000
        };

        if (diff > 0) {
          remaining.days = Math.floor(diff / (1000 * 60 * 60 * 24));
          remaining.hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          remaining.minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          remaining.seconds = Math.floor((diff % (1000 * 60)) / 1000);
        }

        return { ...timer, remaining };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatRemainingTime = (remaining: RemainingTime) => {
    if (remaining.isExpired) return 'انتهى!';

    if (remaining.days > 0) {
      return `${remaining.days}ي ${remaining.hours}س ${remaining.minutes}د`;
    }

    return `${remaining.hours.toString().padStart(2, '0')}:${remaining.minutes.toString().padStart(2, '0')}:${remaining.seconds.toString().padStart(2, '0')}`;
  };

  const getReminderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PURCHASE: 'شراء',
      PAYMENT: 'دفع',
      DELIVERY: 'تسليم',
      MEETING: 'موعد',
      CALL: 'اتصال',
      GENERAL: 'عام',
      MAINTENANCE: 'صيانة',
      SUPPLIES: 'مستلزمات'
    };
    return labels[type] || type;
  };

  const activeTimers = timers.filter(t => t.status === 'ACTIVE');
  const pendingReminders = reminders.filter(r => r.status === 'PENDING');
  const urgentItems = [
    ...activeTimers.filter(t => t.remaining.isExpired || t.remaining.isUrgent),
    ...pendingReminders.filter(r => r.timeStatus.isDueSoon || r.timeStatus.isOverdue)
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded-full"></div>
            <div className="h-4 w-24 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    // عرض مختصر للشريط الجانبي
    return (
      <Card className="overflow-hidden">
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-emerald-600" />
              المؤقتات
            </span>
            <Link href="/dashboard/timers-reminders">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          {activeTimers.length === 0 && pendingReminders.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              لا توجد مؤقتات نشطة
            </p>
          ) : (
            <div className="space-y-2">
              {activeTimers.slice(0, 2).map(timer => (
                <div key={timer.id} className={`p-2 rounded-lg ${
                  timer.remaining.isExpired ? 'bg-red-100 dark:bg-red-900/30' :
                  timer.remaining.isUrgent ? 'bg-orange-100 dark:bg-orange-900/30' :
                  'bg-muted'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{timer.title}</span>
                    <span className="text-xs font-mono font-bold">
                      {formatRemainingTime(timer.remaining)}
                    </span>
                  </div>
                </div>
              ))}
              {pendingReminders.filter(r => r.timeStatus.isToday).slice(0, 1).map(reminder => (
                <div key={reminder.id} className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{reminder.title}</span>
                    <Badge variant="outline" className="text-xs h-5">
                      {getReminderTypeLabel(reminder.type)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // عرض كامل
  return (
    <div className="space-y-4">
      {/* Urgent Alerts */}
      {urgentItems.length > 0 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950 animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-bold text-red-700">تنبيهات عاجلة!</span>
            </div>
            <div className="space-y-2">
              {urgentItems.slice(0, 3).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>{item.title}</span>
                  {item.remaining ? (
                    <span className="font-mono font-bold">
                      {item.remaining.isExpired ? 'منتهي!' : formatRemainingTime(item.remaining)}
                    </span>
                  ) : (
                    <Badge variant="destructive">
                      {item.timeStatus?.isOverdue ? 'متأخر' : 'قريب'}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Timers Carousel */}
      {activeTimers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-emerald-600" />
                مؤقتات التسليم
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1} / {activeTimers.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setCurrentIndex(prev => prev > 0 ? prev - 1 : activeTimers.length - 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setCurrentIndex(prev => prev < activeTimers.length - 1 ? prev + 1 : 0)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTimers[currentIndex] && (
              <div className={`p-4 rounded-lg text-center ${
                activeTimers[currentIndex].remaining.isExpired
                  ? 'bg-red-100 dark:bg-red-900/30'
                : activeTimers[currentIndex].remaining.isUrgent
                  ? 'bg-orange-100 dark:bg-orange-900/30'
                : 'bg-emerald-100 dark:bg-emerald-900/30'
              }`}>
                <h3 className="font-bold text-lg mb-1">{activeTimers[currentIndex].title}</h3>
                {activeTimers[currentIndex].agent && (
                  <p className="text-sm text-muted-foreground mb-2">
                    الوكيل: {activeTimers[currentIndex].agent.name}
                  </p>
                )}
                <div className="text-3xl sm:text-4xl font-bold font-mono">
                  {formatRemainingTime(activeTimers[currentIndex].remaining)}
                </div>
                {activeTimers[currentIndex].remaining.isExpired && (
                  <p className="text-red-600 font-medium mt-2">انتهى الوقت!</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Today's Reminders */}
      {pendingReminders.filter(r => r.timeStatus.isToday).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" />
              منبهات اليوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingReminders.filter(r => r.timeStatus.isToday).slice(0, 4).map(reminder => (
                <div
                  key={reminder.id}
                  className={`p-3 rounded-lg flex items-center justify-between ${
                    reminder.timeStatus.isOverdue
                      ? 'bg-red-100 dark:bg-red-900/30'
                    : reminder.timeStatus.isDueSoon
                      ? 'bg-orange-100 dark:bg-orange-900/30'
                    : 'bg-muted'
                  }`}
                >
                  <div>
                    <span className="font-medium">{reminder.title}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(reminder.reminderDateTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Badge variant="outline" className="text-xs h-5">
                        {getReminderTypeLabel(reminder.type)}
                      </Badge>
                    </div>
                  </div>
                  {reminder.timeStatus.isDueSoon && (
                    <Badge variant="destructive" className="animate-pulse">
                      قريب
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Link href="/dashboard/timers-reminders" className="flex-1">
          <Button variant="outline" className="w-full gap-2">
            <Timer className="h-4 w-4" />
            إدارة المؤقتات
          </Button>
        </Link>
        <Link href="/dashboard/timers-reminders" className="flex-1">
          <Button variant="outline" className="w-full gap-2">
            <Bell className="h-4 w-4" />
            إدارة المنبهات
          </Button>
        </Link>
      </div>

      {/* Empty State */}
      {activeTimers.length === 0 && pendingReminders.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Timer className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">لا توجد مؤقتات أو منبهات نشطة</p>
            <Link href="/dashboard/timers-reminders">
              <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 me-2" />
                إضافة مؤقت أو منبه
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
