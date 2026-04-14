'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Clock,
  CalendarDays,
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  Download,
  Filter,
  RefreshCw,
  LogIn,
  LogOut,
  Loader2,
  CheckCircle2,
  XCircle,
  Timer,
  Plane,
  Half2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';

// أنواع البيانات
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HALF_DAY';

interface User {
  id: string;
  username: string;
  role: string;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  notes: string | null;
  checkInLocation: string | null;
  checkOutLocation: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

interface AttendanceStats {
  totalDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  halfDayCount: number;
  attendanceRate: number;
}

// ترجمة حالات الحضور
const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: 'حاضر',
  ABSENT: 'غائب',
  LATE: 'متأخر',
  LEAVE: 'إجازة',
  HALF_DAY: 'نصف يوم',
};

// ألوان الحالات
const statusColors: Record<AttendanceStatus, { bg: string; text: string; border: string }> = {
  PRESENT: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  ABSENT: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700' },
  LATE: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
  LEAVE: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  HALF_DAY: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
};

// أيقونات الحالات
const statusIcons: Record<AttendanceStatus, React.ReactNode> = {
  PRESENT: <CheckCircle2 className="h-4 w-4" />,
  ABSENT: <XCircle className="h-4 w-4" />,
  LATE: <Timer className="h-4 w-4" />,
  LEAVE: <Plane className="h-4 w-4" />,
  HALF_DAY: <Half2 className="h-4 w-4" />,
};

export default function AttendancePage() {
  // الحالة
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // الفلاتر
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [viewMode, setViewMode] = useState<'day' | 'range'>('day');

  // الإحصائيات
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    leaveCount: 0,
    halfDayCount: 0,
    attendanceRate: 0,
  });

  // النوافذ المنبثقة
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // التحقق من الجلسة
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('session_token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
          window.location.href = '/';
          return;
        }

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setLoading(false);
      } catch {
        window.location.href = '/';
      }
    };

    checkAuth();
  }, []);

  // تحميل المستخدمين
  const loadUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, []);

  // تحميل سجلات الحضور
  const loadAttendance = useCallback(async () => {
    try {
      const token = localStorage.getItem('session_token');
      let url = '/api/attendance?';

      if (viewMode === 'day') {
        url += `date=${selectedDate.toISOString()}`;
      } else {
        url += `startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`;
      }

      if (selectedUserId !== 'all') {
        url += `&userId=${selectedUserId}`;
      }

      if (selectedStatus !== 'all') {
        url += `&status=${selectedStatus}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data.data || []);
        calculateStats(data.data || []);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    }
  }, [selectedDate, selectedUserId, selectedStatus, dateRange, viewMode]);

  // حساب الإحصائيات
  const calculateStats = (records: AttendanceRecord[]) => {
    const stats: AttendanceStats = {
      totalDays: records.length,
      presentCount: records.filter(r => r.status === 'PRESENT').length,
      absentCount: records.filter(r => r.status === 'ABSENT').length,
      lateCount: records.filter(r => r.status === 'LATE').length,
      leaveCount: records.filter(r => r.status === 'LEAVE').length,
      halfDayCount: records.filter(r => r.status === 'HALF_DAY').length,
      attendanceRate: 0,
    };

    const workingDays = stats.totalDays - stats.leaveCount;
    if (workingDays > 0) {
      const presentDays = stats.presentCount + stats.lateCount + stats.halfDayCount;
      stats.attendanceRate = Math.round((presentDays / workingDays) * 100);
    }

    setStats(stats);
  };

  // تحميل البيانات عند تغيير المستخدم
  useEffect(() => {
    if (user) {
      loadUsers();
      loadAttendance();
    }
  }, [user, loadUsers, loadAttendance]);

  // إعادة تحميل البيانات
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAttendance();
    setRefreshing(false);
    toast.success('تم تحديث البيانات');
  };

  // تسجيل الحضور
  const handleCheckIn = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('session_token');
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('تم تسجيل الحضور بنجاح');
        setCheckInDialogOpen(false);
        setNotes('');
        loadAttendance();
      } else {
        toast.error(data.error || 'حدث خطأ أثناء تسجيل الحضور');
      }
    } catch (error) {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  // تسجيل الانصراف
  const handleCheckOut = async () => {
    if (!selectedRecord) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('session_token');
      const response = await fetch('/api/attendance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: selectedRecord.id,
          checkOut: new Date(),
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('تم تسجيل الانصراف بنجاح');
        setCheckOutDialogOpen(false);
        setNotes('');
        setSelectedRecord(null);
        loadAttendance();
      } else {
        toast.error(data.error || 'حدث خطأ أثناء تسجيل الانصراف');
      }
    } catch (error) {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  // تحديث حالة الحضور
  const handleUpdateStatus = async (status: AttendanceStatus) => {
    if (!selectedRecord) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('session_token');
      const response = await fetch('/api/attendance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: selectedRecord.id,
          status,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('تم تحديث الحالة بنجاح');
        setEditDialogOpen(false);
        setNotes('');
        setSelectedRecord(null);
        loadAttendance();
      } else {
        toast.error(data.error || 'حدث خطأ أثناء تحديث الحالة');
      }
    } catch (error) {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  // تصدير البيانات
  const handleExport = () => {
    const headers = ['المستخدم', 'التاريخ', 'الحالة', 'وقت الحضور', 'وقت الانصراف', 'ملاحظات'];
    const rows = attendanceRecords.map(record => [
      record.user.username,
      format(new Date(record.date), 'yyyy-MM-dd', { locale: ar }),
      statusLabels[record.status],
      record.checkIn ? format(new Date(record.checkIn), 'HH:mm', { locale: ar }) : '-',
      record.checkOut ? format(new Date(record.checkOut), 'HH:mm', { locale: ar }) : '-',
      record.notes || '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('تم تصدير البيانات بنجاح');
  };

  // تنسيق الوقت
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'HH:mm', { locale: ar });
  };

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE d MMMM yyyy', { locale: ar });
  };

  // التحقق مما إذا كان المستخدم سجل حضوره اليوم
  const todayRecord = attendanceRecords.find(r =>
    r.userId === user?.id &&
    format(new Date(r.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
          <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      userRole={user.role as 'ADMIN' | 'WORKER'}
      username={user.username}
      onLogout={handleLogout}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* العنوان والإجراءات */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">إدارة الحضور</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {format(new Date(), 'EEEE d MMMM yyyy', { locale: ar })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!todayRecord && (
              <Button
                onClick={() => setCheckInDialogOpen(true)}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <LogIn className="h-4 w-4" />
                تسجيل الحضور
              </Button>
            )}
            {todayRecord && !todayRecord.checkOut && (
              <Button
                onClick={() => {
                  setSelectedRecord(todayRecord);
                  setCheckOutDialogOpen(true);
                }}
                variant="destructive"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الانصراف
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              تصدير
            </Button>
          </div>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* إجمالي الأيام */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي السجلات</p>
                  <p className="text-2xl font-bold">{stats.totalDays}</p>
                </div>
                <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                  <CalendarDays className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الحاضرون */}
          <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 dark:text-green-300">حاضر</p>
                  <p className="text-2xl font-bold text-green-600">{stats.presentCount}</p>
                </div>
                <div className="p-2 rounded-full bg-green-200 dark:bg-green-800">
                  <UserCheck className="h-5 w-5 text-green-600 dark:text-green-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الغائبون */}
          <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 dark:text-red-300">غائب</p>
                  <p className="text-2xl font-bold text-red-600">{stats.absentCount}</p>
                </div>
                <div className="p-2 rounded-full bg-red-200 dark:bg-red-800">
                  <UserX className="h-5 w-5 text-red-600 dark:text-red-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* المتأخرون */}
          <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-300">متأخر</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.lateCount}</p>
                </div>
                <div className="p-2 rounded-full bg-amber-200 dark:bg-amber-800">
                  <Timer className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الإجازات */}
          <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">إجازة</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.leaveCount}</p>
                </div>
                <div className="p-2 rounded-full bg-blue-200 dark:bg-blue-800">
                  <Plane className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* نسبة الحضور */}
          <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">نسبة الحضور</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.attendanceRate}%</p>
                </div>
                <div className="p-2 rounded-full bg-emerald-200 dark:bg-emerald-800">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* الفلاتر */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">الفلاتر</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* وضع العرض */}
              <div className="space-y-2">
                <Label>طريقة العرض</Label>
                <Select
                  value={viewMode}
                  onValueChange={(value: 'day' | 'range') => setViewMode(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">يوم محدد</SelectItem>
                    <SelectItem value="range">نطاق زمني</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* التاريخ - وضع اليوم */}
              {viewMode === 'day' && (
                <div className="space-y-2">
                  <Label>التاريخ</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {format(selectedDate, 'd MMMM yyyy', { locale: ar })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* نطاق التاريخ */}
              {viewMode === 'range' && (
                <>
                  <div className="space-y-2">
                    <Label>من</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start gap-2">
                          <CalendarDays className="h-4 w-4" />
                          {format(dateRange.from, 'd MMM', { locale: ar })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>إلى</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start gap-2">
                          <CalendarDays className="h-4 w-4" />
                          {format(dateRange.to, 'd MMM', { locale: ar })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {/* المستخدم */}
              <div className="space-y-2">
                <Label>المستخدم</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="جميع المستخدمين" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المستخدمين</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* الحالة */}
              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* جدول الحضور */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">سجلات الحضور</CardTitle>
                  <CardDescription>
                    {viewMode === 'day'
                      ? formatDate(selectedDate.toISOString())
                      : `${format(dateRange.from, 'd MMM', { locale: ar })} - ${format(dateRange.to, 'd MMM', { locale: ar })}`
                    }
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary">
                {attendanceRecords.length} سجل
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {attendanceRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد سجلات حضور</p>
                <p className="text-sm mt-1">قم بتسجيل حضورك للبدء</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المستخدم</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">وقت الحضور</TableHead>
                      <TableHead className="text-right">وقت الانصراف</TableHead>
                      <TableHead className="text-right">ساعات العمل</TableHead>
                      <TableHead className="text-right">ملاحظات</TableHead>
                      {user.role === 'ADMIN' && (
                        <TableHead className="text-right">إجراءات</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => {
                      const colors = statusColors[record.status];
                      const workHours = record.checkIn && record.checkOut
                        ? ((new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()) / (1000 * 60 * 60)).toFixed(1)
                        : null;

                      return (
                        <TableRow key={record.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-full bg-muted">
                                <Users className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{record.user.username}</p>
                                <p className="text-xs text-muted-foreground">{record.user.role === 'ADMIN' ? 'مدير' : 'عامل'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(record.date), 'd MMM yyyy', { locale: ar })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${colors.bg} ${colors.text} ${colors.border} gap-1`}
                            >
                              {statusIcons[record.status]}
                              {statusLabels[record.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <LogIn className="h-3 w-3 text-green-600" />
                              {formatTime(record.checkIn)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <LogOut className="h-3 w-3 text-red-600" />
                              {formatTime(record.checkOut)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {workHours ? (
                              <Badge variant="secondary">
                                {workHours} ساعة
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {record.notes || '-'}
                            </span>
                          </TableCell>
                          {user.role === 'ADMIN' && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setNotes(record.notes || '');
                                  setEditDialogOpen(true);
                                }}
                              >
                                تعديل
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* نافذة تسجيل الحضور */}
      <Dialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-green-600" />
              تسجيل الحضور
            </DialogTitle>
            <DialogDescription>
              سيتم تسجيل حضورك الآن
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">الوقت الحالي</p>
              <p className="text-2xl font-bold">{format(new Date(), 'HH:mm:ss')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(), 'EEEE d MMMM yyyy', { locale: ar })}
              </p>
            </div>
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                placeholder="أضف ملاحظات..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckInDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleCheckIn}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              تأكيد الحضور
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تسجيل الانصراف */}
      <Dialog open={checkOutDialogOpen} onOpenChange={setCheckOutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-600" />
              تسجيل الانصراف
            </DialogTitle>
            <DialogDescription>
              سيتم تسجيل وقت انصرافك
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">الوقت الحالي</p>
              <p className="text-2xl font-bold">{format(new Date(), 'HH:mm:ss')}</p>
              {selectedRecord?.checkIn && (
                <p className="text-sm text-green-600 mt-1">
                  بدء العمل: {formatTime(selectedRecord.checkIn)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                placeholder="أضف ملاحظات..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckOutDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleCheckOut}
              disabled={submitting}
              variant="destructive"
              className="gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              تأكيد الانصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل الحالة */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              تعديل حالة الحضور
            </DialogTitle>
            <DialogDescription>
              المستخدم: {selectedRecord?.user.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>تغيير الحالة</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(statusLabels).map(([key, label]) => {
                  const statusKey = key as AttendanceStatus;
                  const colors = statusColors[statusKey];
                  const isSelected = selectedRecord?.status === statusKey;

                  return (
                    <Button
                      key={key}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`justify-start gap-2 ${isSelected ? colors.bg + ' ' + colors.text : ''}`}
                      onClick={() => handleUpdateStatus(statusKey)}
                      disabled={submitting}
                    >
                      {statusIcons[statusKey]}
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                placeholder="أضف ملاحظات..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
