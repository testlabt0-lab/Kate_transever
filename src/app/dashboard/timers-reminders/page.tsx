'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { NotificationSettings } from '@/components/notifications/notification-settings';
import {
  Clock,
  Bell,
  Plus,
  Trash2,
  Pause,
  Play,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Timer,
  ShoppingBag,
  DollarSign,
  Truck,
  Users,
  Phone,
  Wrench,
  Package,
  AlertCircle,
  RefreshCw,
  Loader2,
  Volume2,
  VolumeX,
  X,
  Edit,
  AlarmClock,
  Settings,
  Music,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { soundGenerator } from '@/lib/sounds';

// ==================== Types ====================

interface RemainingTime {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isUrgent: boolean;
}

interface DeliveryTimer {
  id: string;
  title: string;
  description: string | null;
  targetDateTime: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  notified: boolean;
  completedAt: string | null;
  createdAt: string;
  agent?: { id: string; name: string; phone: string | null } | null;
  shipment?: { id: string; date: string; status: string } | null;
  remaining: RemainingTime;
}

interface ReminderTimeStatus {
  isOverdue: boolean;
  isDueSoon: boolean;
  isToday: boolean;
  minutesUntil: number;
}

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  type: 'PURCHASE' | 'PAYMENT' | 'DELIVERY' | 'MEETING' | 'CALL' | 'GENERAL' | 'MAINTENANCE' | 'SUPPLIES';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  reminderDateTime: string;
  repeatType: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  repeatInterval: number | null;
  nextReminderAt: string | null;
  status: 'PENDING' | 'COMPLETED' | 'SNOOZED' | 'CANCELLED';
  notified: boolean;
  snoozedUntil: string | null;
  completedAt: string | null;
  createdAt: string;
  timeStatus: ReminderTimeStatus;
}

interface TimerStats {
  total: number;
  active: number;
  completed: number;
  expired: number;
  urgent: number;
}

interface ReminderStats {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
  today: number;
  dueSoon: number;
}

interface User {
  id: string;
  username: string;
  role: string;
}

interface SoundSettings {
  enabled: boolean;
  volume: number;
  timerSound: string;
  reminderSound: string;
  urgentSound: string;
}

// ==================== Main Component ====================

export default function TimersRemindersPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Data
  const [timers, setTimers] = useState<DeliveryTimer[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [timerStats, setTimerStats] = useState<TimerStats>({ total: 0, active: 0, completed: 0, expired: 0, urgent: 0 });
  const [reminderStats, setReminderStats] = useState<ReminderStats>({ total: 0, pending: 0, completed: 0, overdue: 0, today: 0, dueSoon: 0 });
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);

  // View state
  const [activeTab, setActiveTab] = useState('timers');
  const [showSettings, setShowSettings] = useState(false);
  const [expandedTimer, setExpandedTimer] = useState<string | null>(null);
  const [expandedReminder, setExpandedReminder] = useState<string | null>(null);

  // Dialogs
  const [showAddTimer, setShowAddTimer] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [editingTimer, setEditingTimer] = useState<DeliveryTimer | null>(null);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [showAlarmClockDialog, setShowAlarmClockDialog] = useState(false);
  const [snoozeReminder, setAlarmClockReminder] = useState<Reminder | null>(null);
  const [snoozeMinutes, setAlarmClockMinutes] = useState(10);

  // Timer form
  const [timerTitle, setTimerTitle] = useState('');
  const [timerDescription, setTimerDescription] = useState('');
  const [timerDateTime, setTimerDateTime] = useState('');
  const [timerAgentId, setTimerAgentId] = useState('');

  // Reminder form
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDescription, setReminderDescription] = useState('');
  const [reminderType, setReminderType] = useState<string>('GENERAL');
  const [reminderPriority, setReminderPriority] = useState<string>('NORMAL');
  const [reminderDateTime, setReminderDateTime] = useState('');
  const [reminderRepeat, setReminderRepeat] = useState<string>('NONE');
  const [reminderRepeatInterval, setReminderRepeatInterval] = useState<number>(1);

  // Saving
  const [saving, setSaving] = useState(false);

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(80);

  // Track notified items
  const notifiedTimersRef = useRef<Set<string>>(new Set());
  const notifiedRemindersRef = useRef<Set<string>>(new Set());

  // Check user
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');

    if (userData && token) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/';
    }
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [timersRes, remindersRes, agentsRes] = await Promise.all([
        fetch('/api/timers'),
        fetch('/api/reminders'),
        fetch('/api/agents')
      ]);

      const timersData = await timersRes.json();
      const remindersData = await remindersRes.json();
      const agentsData = await agentsRes.json();

      setTimers(timersData.timers || []);
      setTimerStats(timersData.stats || { total: 0, active: 0, completed: 0, expired: 0, urgent: 0 });
      setReminders(remindersData.reminders || []);
      setReminderStats(remindersData.stats || { total: 0, pending: 0, completed: 0, overdue: 0, today: 0, dueSoon: 0 });
      setAgents(agentsData.agents || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // Real-time update for timers
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

  // Check for notifications and play sounds
  useEffect(() => {
    const checkNotifications = () => {
      // Check expired timers
      timers.forEach(timer => {
        if (timer.status === 'ACTIVE' && timer.remaining.isExpired && !notifiedTimersRef.current.has(timer.id)) {
          notifiedTimersRef.current.add(timer.id);

          // Play sound
          if (soundEnabled) {
            soundGenerator.play('timer');
          }

          showNotification('انتهى المؤقت!', timer.title, 'timer');
        }
      });

      // Check due reminders
      reminders.forEach(reminder => {
        if (reminder.status === 'PENDING' && reminder.timeStatus.isDueSoon && !notifiedRemindersRef.current.has(reminder.id)) {
          notifiedRemindersRef.current.add(reminder.id);

          // Play sound based on priority
          if (soundEnabled) {
            soundGenerator.play(reminder.priority === 'URGENT' ? 'urgent' : 'reminder');
          }

          showNotification('المنبه!', reminder.title, 'reminder');
        }
      });
    };

    const interval = setInterval(checkNotifications, 10000);
    return () => clearInterval(interval);
  }, [timers, reminders, soundEnabled]);

  // Update sound generator settings
  useEffect(() => {
    soundGenerator.setEnabled(soundEnabled);
    soundGenerator.setVolume(soundVolume / 100);
  }, [soundEnabled, soundVolume]);

  const showNotification = (title: string, body: string, type: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icons/icon-192x192.png' });
    }

    toast({
      title,
      description: body,
      variant: type === 'timer' ? 'destructive' : 'default'
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // ==================== Timer Handlers ====================

  const handleAddTimer = async () => {
    if (!timerTitle || !timerDateTime) {
      toast({ title: 'خطأ', description: 'العنوان وموعد التسليم مطلوبان', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/timers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: timerTitle,
          description: timerDescription || null,
          targetDateTime: timerDateTime,
          agentId: timerAgentId || null
        })
      });

      const data = await res.json();
      if (data.success) {
        // Play success sound
        if (soundEnabled) {
          soundGenerator.play('success');
        }

        toast({ title: 'تم', description: 'تم إنشاء المؤقت بنجاح' });
        resetTimerForm();
        setShowAddTimer(false);
        loadData();

        // Clear notification tracking
        notifiedTimersRef.current.clear();
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTimerStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/timers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم', description: 'تم تحديث حالة المؤقت' });
        loadData();

        // Clear notification tracking for this timer
        notifiedTimersRef.current.delete(id);
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    }
  };

  const handleDeleteTimer = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المؤقت؟')) return;

    try {
      const res = await fetch(`/api/timers?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم', description: 'تم حذف المؤقت' });
        loadData();
        notifiedTimersRef.current.delete(id);
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    }
  };

  const resetTimerForm = () => {
    setTimerTitle('');
    setTimerDescription('');
    setTimerDateTime('');
    setTimerAgentId('');
    setEditingTimer(null);
  };

  // ==================== Reminder Handlers ====================

  const handleAddReminder = async () => {
    if (!reminderTitle || !reminderDateTime || !reminderType) {
      toast({ title: 'خطأ', description: 'جميع الحقول المطلوبة يجب ملؤها', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reminderTitle,
          description: reminderDescription || null,
          type: reminderType,
          priority: reminderPriority,
          reminderDateTime: reminderDateTime,
          repeatType: reminderRepeat,
          repeatInterval: reminderRepeat === 'CUSTOM' ? reminderRepeatInterval : null
        })
      });

      const data = await res.json();
      if (data.success) {
        // Play success sound
        if (soundEnabled) {
          soundGenerator.play('success');
        }

        toast({ title: 'تم', description: 'تم إنشاء المنبه بنجاح' });
        resetReminderForm();
        setShowAddReminder(false);
        loadData();

        // Clear notification tracking
        notifiedRemindersRef.current.clear();
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateReminderStatus = async (id: string, status: string, snoozedUntil?: string) => {
    try {
      const body: any = { id, status };
      if (snoozedUntil) body.snoozedUntil = snoozedUntil;

      const res = await fetch('/api/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم', description: 'تم تحديث حالة المنبه' });
        loadData();
        notifiedRemindersRef.current.delete(id);
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنبه؟')) return;

    try {
      const res = await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'تم', description: 'تم حذف المنبه' });
        loadData();
        notifiedRemindersRef.current.delete(id);
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    }
  };

  const handleAlarmClock = () => {
    if (!snoozeReminder) return;

    const snoozeTime = new Date();
    snoozeTime.setMinutes(snoozeTime.getMinutes() + snoozeMinutes);

    handleUpdateReminderStatus(snoozeReminder.id, 'SNOOZED', snoozeTime.toISOString());
    setShowAlarmClockDialog(false);
    setAlarmClockReminder(null);
    setAlarmClockMinutes(10);
  };

  const resetReminderForm = () => {
    setReminderTitle('');
    setReminderDescription('');
    setReminderType('GENERAL');
    setReminderPriority('NORMAL');
    setReminderDateTime('');
    setReminderRepeat('NONE');
    setReminderRepeatInterval(1);
    setEditingReminder(null);
  };

  // ==================== Test Sound ====================

  const testSound = (type: 'timer' | 'reminder' | 'urgent' | 'success') => {
    soundGenerator.play(type);
    toast({ title: 'اختبار الصوت', description: `يتم تشغيل صوت ${type}` });
  };

  // ==================== Helper Functions ====================

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReminderTypeIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE': return <ShoppingBag className="h-4 w-4" />;
      case 'PAYMENT': return <DollarSign className="h-4 w-4" />;
      case 'DELIVERY': return <Truck className="h-4 w-4" />;
      case 'MEETING': return <Users className="h-4 w-4" />;
      case 'CALL': return <Phone className="h-4 w-4" />;
      case 'MAINTENANCE': return <Wrench className="h-4 w-4" />;
      case 'SUPPLIES': return <Package className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-700';
      case 'NORMAL': return 'bg-blue-100 text-blue-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'URGENT': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      LOW: 'منخفضة',
      NORMAL: 'عادية',
      HIGH: 'عالية',
      URGENT: 'عاجلة'
    };
    return labels[priority] || priority;
  };

  const getRepeatLabel = (repeat: string) => {
    const labels: Record<string, string> = {
      NONE: 'بدون تكرار',
      DAILY: 'يومي',
      WEEKLY: 'أسبوعي',
      MONTHLY: 'شهري',
      YEARLY: 'سنوي',
      CUSTOM: 'مخصص'
    };
    return labels[repeat] || repeat;
  };

  const formatRemainingTime = (remaining: RemainingTime) => {
    if (remaining.isExpired) return 'انتهى الوقت!';

    const parts = [];
    if (remaining.days > 0) parts.push(`${remaining.days} يوم`);
    if (remaining.hours > 0) parts.push(`${remaining.hours} ساعة`);
    if (remaining.minutes > 0) parts.push(`${remaining.minutes} دقيقة`);
    if (remaining.seconds > 0 && remaining.days === 0) parts.push(`${remaining.seconds} ثانية`);

    return parts.join(' و ');
  };

  // ==================== Render ====================

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <DashboardLayout userRole={user.role as 'ADMIN' | 'WORKER'} username={user.username} onLogout={handleLogout}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">المؤقتات والمنبهات</h1>
            <p className="text-sm text-muted-foreground">إدارة مواعيد التسليم والتذكيرات</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Sound Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1">
              {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4 text-gray-400" />}
              <Switch
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>

            {/* Sound Volume */}
            {soundEnabled && (
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1">
                <Music className="h-4 w-4 text-gray-600" />
                <Slider
                  value={[soundVolume]}
                  onValueChange={(v) => setSoundVolume(v[0])}
                  max={100}
                  step={10}
                  className="w-20"
                />
                <span className="text-xs text-gray-600 w-8">{soundVolume}%</span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => testSound('timer')}
            >
              <Music className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4">
              <NotificationSettings />
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-700 dark:text-blue-300">مؤقتات نشطة</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{timerStats.active}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-xs text-red-700 dark:text-red-300">عاجلة</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{timerStats.urgent + reminderStats.dueSoon}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-600" />
                <span className="text-xs text-amber-700 dark:text-amber-300">منبهات اليوم</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">{reminderStats.today}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-emerald-700 dark:text-emerald-300">مكتملة</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{timerStats.completed + reminderStats.completed}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timers" className="gap-2">
              <Timer className="h-4 w-4" />
              المؤقتات ({timerStats.active})
            </TabsTrigger>
            <TabsTrigger value="reminders" className="gap-2">
              <Bell className="h-4 w-4" />
              المنبهات ({reminderStats.pending})
            </TabsTrigger>
          </TabsList>

          {/* Timers Tab */}
          <TabsContent value="timers" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  resetTimerForm();
                  setShowAddTimer(true);
                }}
              >
                <Plus className="h-4 w-4 me-2" />
                إضافة مؤقت
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : timers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Timer className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد مؤقتات</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {timers.map((timer) => (
                  <Card
                    key={timer.id}
                    className={`transition-all ${
                      timer.remaining.isExpired && timer.status === 'ACTIVE'
                        ? 'border-red-500 bg-red-50 dark:bg-red-950 animate-pulse'
                        : timer.remaining.isUrgent && timer.status === 'ACTIVE'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                        : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div
                        className="flex items-start justify-between mb-3 cursor-pointer"
                        onClick={() => setExpandedTimer(expandedTimer === timer.id ? null : timer.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold">{timer.title}</h3>
                            {expandedTimer === timer.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                          {timer.description && (
                            <p className="text-sm text-muted-foreground">{timer.description}</p>
                          )}
                        </div>
                        <Badge
                          variant={timer.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className={
                            timer.status === 'ACTIVE'
                              ? timer.remaining.isExpired
                                ? 'bg-red-600'
                                : timer.remaining.isUrgent
                                ? 'bg-orange-600'
                                : 'bg-emerald-600'
                              : ''
                          }
                        >
                          {timer.status === 'ACTIVE' ? 'نشط' : timer.status === 'PAUSED' ? 'متوقف' : timer.status === 'COMPLETED' ? 'مكتمل' : 'ملغي'}
                        </Badge>
                      </div>

                      {/* Countdown Display */}
                      {timer.status === 'ACTIVE' && (
                        <div className={`text-center py-4 rounded-lg mb-3 ${
                          timer.remaining.isExpired
                            ? 'bg-red-100 dark:bg-red-900'
                            : timer.remaining.isUrgent
                            ? 'bg-orange-100 dark:bg-orange-900'
                            : 'bg-blue-100 dark:bg-blue-900'
                        }`}>
                          <div className="text-2xl sm:text-3xl font-bold font-mono">
                            {formatRemainingTime(timer.remaining)}
                          </div>
                          {timer.remaining.isExpired && (
                            <p className="text-red-600 font-medium mt-1">انتهى الوقت!</p>
                          )}
                        </div>
                      )}

                      {/* Details (expanded) */}
                      {expandedTimer === timer.id && (
                        <div className="space-y-2 mb-3 p-3 bg-gray-50 rounded-lg text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>الموعد: {formatDateTime(timer.targetDateTime)}</span>
                          </div>
                          {timer.agent && (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>الوكيل: {timer.agent.name}</span>
                              {timer.agent.phone && (
                                <span className="text-muted-foreground">({timer.agent.phone})</span>
                              )}
                            </div>
                          )}
                          {timer.shipment && (
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span>مرتبط بشحنة</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {timer.status === 'ACTIVE' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateTimerStatus(timer.id, 'PAUSED')}
                            >
                              <Pause className="h-4 w-4 me-1" />
                              إيقاف
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600"
                              onClick={() => handleUpdateTimerStatus(timer.id, 'COMPLETED')}
                            >
                              <CheckCircle className="h-4 w-4 me-1" />
                              إكمال
                            </Button>
                          </>
                        )}
                        {timer.status === 'PAUSED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateTimerStatus(timer.id, 'ACTIVE')}
                          >
                            <Play className="h-4 w-4 me-1" />
                            استئناف
                          </Button>
                        )}
                        {timer.remaining.isExpired && timer.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newTime = new Date();
                              newTime.setHours(newTime.getHours() + 1);
                              // إعادة ضبط المؤقت
                              fetch('/api/timers', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  id: timer.id,
                                  targetDateTime: newTime.toISOString(),
                                  status: 'ACTIVE',
                                  notified: false
                                })
                              }).then(() => loadData());
                            }}
                          >
                            <RefreshCw className="h-4 w-4 me-1" />
                            تمديد ساعة
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => handleDeleteTimer(timer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reminders Tab */}
          <TabsContent value="reminders" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  resetReminderForm();
                  setShowAddReminder(true);
                }}
              >
                <Plus className="h-4 w-4 me-2" />
                إضافة منبه
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : reminders.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد منبهات</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {reminders.map((reminder) => (
                  <Card
                    key={reminder.id}
                    className={`${
                      reminder.timeStatus.isOverdue && reminder.status === 'PENDING'
                        ? 'border-red-500 bg-red-50 dark:bg-red-950'
                        : reminder.timeStatus.isDueSoon && reminder.status === 'PENDING'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                        : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => setExpandedReminder(expandedReminder === reminder.id ? null : reminder.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${
                            reminder.priority === 'URGENT' ? 'bg-red-100' :
                            reminder.priority === 'HIGH' ? 'bg-orange-100' :
                            'bg-blue-100'
                          }`}>
                            {getReminderTypeIcon(reminder.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold">{reminder.title}</h3>
                              <Badge className={getPriorityColor(reminder.priority)}>
                                {getPriorityLabel(reminder.priority)}
                              </Badge>
                              {reminder.repeatType !== 'NONE' && (
                                <Badge variant="outline">
                                  {getRepeatLabel(reminder.repeatType)}
                                </Badge>
                              )}
                              {expandedReminder === reminder.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                            {reminder.description && (
                              <p className="text-sm text-muted-foreground mt-1">{reminder.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDateTime(reminder.reminderDateTime)}
                              </span>
                              <Badge variant="secondary">{getReminderTypeLabel(reminder.type)}</Badge>
                              {reminder.timeStatus.isToday && reminder.status === 'PENDING' && (
                                <span className="text-emerald-600 font-medium">اليوم</span>
                              )}
                              {reminder.timeStatus.isDueSoon && reminder.status === 'PENDING' && (
                                <span className="text-orange-600 font-medium">
                                  بعد {reminder.timeStatus.minutesUntil} دقيقة
                                </span>
                              )}
                              {reminder.timeStatus.isOverdue && reminder.status === 'PENDING' && (
                                <span className="text-red-600 font-medium flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  متأخر
                                </span>
                              )}
                            </div>

                            {/* Expanded Details */}
                            {expandedReminder === reminder.id && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm space-y-2">
                                <p><strong>النوع:</strong> {getReminderTypeLabel(reminder.type)}</p>
                                <p><strong>الأولوية:</strong> {getPriorityLabel(reminder.priority)}</p>
                                <p><strong>التكرار:</strong> {getRepeatLabel(reminder.repeatType)}</p>
                                {reminder.repeatType === 'CUSTOM' && reminder.repeatInterval && (
                                  <p><strong>فترة التكرار:</strong> كل {reminder.repeatInterval} يوم</p>
                                )}
                                {reminder.snoozedUntil && (
                                  <p><strong>مؤجل إلى:</strong> {formatDateTime(reminder.snoozedUntil)}</p>
                                )}
                                {reminder.completedAt && (
                                  <p><strong>تم الإكمال:</strong> {formatDateTime(reminder.completedAt)}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {reminder.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateReminderStatus(reminder.id, 'COMPLETED');
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAlarmClockReminder(reminder);
                                  setShowAlarmClockDialog(true);
                                }}
                              >
                                <AlarmClock className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReminder(reminder.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Timer Dialog */}
        <Dialog open={showAddTimer} onOpenChange={setShowAddTimer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة مؤقت جديد</DialogTitle>
              <DialogDescription>إنشاء مؤقت تنازلي لموعد تسليم القات</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>عنوان المؤقت *</Label>
                <Input
                  value={timerTitle}
                  onChange={(e) => setTimerTitle(e.target.value)}
                  placeholder="مثال: تسليم قات للوكيل أحمد"
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف (اختياري)</Label>
                <Textarea
                  value={timerDescription}
                  onChange={(e) => setTimerDescription(e.target.value)}
                  placeholder="وصف إضافي..."
                />
              </div>
              <div className="space-y-2">
                <Label>موعد التسليم *</Label>
                <Input
                  type="datetime-local"
                  value={timerDateTime}
                  onChange={(e) => setTimerDateTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>الوكيل (اختياري)</Label>
                <Select value={timerAgentId} onValueChange={setTimerAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الوكيل" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddTimer(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAddTimer} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إنشاء'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Reminder Dialog */}
        <Dialog open={showAddReminder} onOpenChange={setShowAddReminder}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة منبه جديد</DialogTitle>
              <DialogDescription>إنشاء تذكير أو منبه لموعد مهم</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>عنوان المنبه *</Label>
                <Input
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="مثال: شراء مستلزمات"
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف (اختياري)</Label>
                <Textarea
                  value={reminderDescription}
                  onChange={(e) => setReminderDescription(e.target.value)}
                  placeholder="تفاصيل إضافية..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>النوع *</Label>
                  <Select value={reminderType} onValueChange={setReminderType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PURCHASE">شراء</SelectItem>
                      <SelectItem value="PAYMENT">دفع</SelectItem>
                      <SelectItem value="DELIVERY">تسليم</SelectItem>
                      <SelectItem value="MEETING">موعد</SelectItem>
                      <SelectItem value="CALL">اتصال</SelectItem>
                      <SelectItem value="MAINTENANCE">صيانة</SelectItem>
                      <SelectItem value="SUPPLIES">مستلزمات</SelectItem>
                      <SelectItem value="GENERAL">عام</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الأولوية</Label>
                  <Select value={reminderPriority} onValueChange={setReminderPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">منخفضة</SelectItem>
                      <SelectItem value="NORMAL">عادية</SelectItem>
                      <SelectItem value="HIGH">عالية</SelectItem>
                      <SelectItem value="URGENT">عاجلة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>وقت المنبه *</Label>
                <Input
                  type="datetime-local"
                  value={reminderDateTime}
                  onChange={(e) => setReminderDateTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>التكرار</Label>
                <Select value={reminderRepeat} onValueChange={setReminderRepeat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">بدون تكرار</SelectItem>
                    <SelectItem value="DAILY">يومي</SelectItem>
                    <SelectItem value="WEEKLY">أسبوعي</SelectItem>
                    <SelectItem value="MONTHLY">شهري</SelectItem>
                    <SelectItem value="YEARLY">سنوي</SelectItem>
                    <SelectItem value="CUSTOM">مخصص</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {reminderRepeat === 'CUSTOM' && (
                <div className="space-y-2">
                  <Label>عدد الأيام بين التكرارات</Label>
                  <Input
                    type="number"
                    min={1}
                    value={reminderRepeatInterval}
                    onChange={(e) => setReminderRepeatInterval(parseInt(e.target.value) || 1)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddReminder(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAddReminder} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إنشاء'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AlarmClock Dialog */}
        <Dialog open={showAlarmClockDialog} onOpenChange={setShowAlarmClockDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأجيل المنبه</DialogTitle>
              <DialogDescription>اختر مدة التأجيل</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15, 30, 60, 120].map(minutes => (
                  <Button
                    key={minutes}
                    variant={snoozeMinutes === minutes ? 'default' : 'outline'}
                    onClick={() => setAlarmClockMinutes(minutes)}
                    className={snoozeMinutes === minutes ? 'bg-emerald-600' : ''}
                  >
                    {minutes < 60 ? `${minutes} دقيقة` : `${minutes / 60} ساعة`}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                <Label>أو أدخل دقائق مخصصة</Label>
                <Input
                  type="number"
                  min={1}
                  value={snoozeMinutes}
                  onChange={(e) => setAlarmClockMinutes(parseInt(e.target.value) || 10)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAlarmClockDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAlarmClock} className="bg-emerald-600 hover:bg-emerald-700">
                تأجيل
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
