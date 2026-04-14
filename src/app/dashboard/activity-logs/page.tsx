'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  History,
  PlusCircle,
  Pencil,
  Trash2,
  CheckCircle,
  Loader2,
  Search,
  Filter,
  Calendar,
  User,
  Eye,
  ChevronRight,
  ChevronLeft,
  Activity,
  FileJson,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'CONFIRM';
  entityType: string;
  entityId: string;
  description: string;
  oldData: string | null;
  newData: string | null;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    role: string;
  } | null;
}

interface User {
  id: string;
  username: string;
  role: string;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'إنشاء',
  UPDATE: 'تعديل',
  DELETE: 'حذف',
  CONFIRM: 'تأكيد',
};

const ENTITY_LABELS: Record<string, string> = {
  farmer: 'مزارع',
  agent: 'وكيل',
  shipment: 'شحنة',
  transporter: 'ناقل',
  khat_type: 'نوع قات',
  user: 'مستخدم',
  expense: 'مصروف',
  payment: 'دفعة',
  transaction: 'معاملة',
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  UPDATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  CONFIRM: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CREATE: <PlusCircle className="h-4 w-4" />,
  UPDATE: <Pencil className="h-4 w-4" />,
  DELETE: <Trash2 className="h-4 w-4" />,
  CONFIRM: <CheckCircle className="h-4 w-4" />,
};

export default function ActivityLogsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // الفلاتر
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // حوار التفاصيل
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');
    if (userData && token) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/login.html';
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      if (actionFilter && actionFilter !== 'all') {
        params.append('action', actionFilter);
      }
      if (entityTypeFilter && entityTypeFilter !== 'all') {
        params.append('entityType', entityTypeFilter);
      }
      if (userFilter && userFilter !== 'all') {
        params.append('userId', userFilter);
      }
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        params.append('dateTo', dateTo);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const res = await fetch(`/api/activity-logs?${params.toString()}`);
      const data = await res.json();

      setLogs(data.logs || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      }));

      // استخراج المستخدمين الفريدين للفلترة
      const uniqueUsers = new Map<string, User>();
      (data.logs || []).forEach((log: ActivityLog) => {
        if (log.user) {
          uniqueUsers.set(log.user.id, log.user);
        }
      });
      setUsers(Array.from(uniqueUsers.values()));
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, actionFilter, entityTypeFilter, userFilter, dateFrom, dateTo, searchQuery]);

  useEffect(() => {
    if (user) loadLogs();
  }, [user, loadLogs]);

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActionFilter('all');
    setEntityTypeFilter('all');
    setUserFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const openDetailsDialog = (log: ActivityLog) => {
    setSelectedLog(log);
    setShowDetailsDialog(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatJsonData = (jsonStr: string | null) => {
    if (!jsonStr) return null;
    try {
      const parsed = JSON.parse(jsonStr);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonStr;
    }
  };

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
        {/* العنوان */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <History className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              سجل النشاطات
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              تتبع جميع العمليات في النظام
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3" />
              {pagination.total} نشاط
            </Badge>
          </div>
        </div>

        {/* الفلاتر */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              الفلاتر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* البحث */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>

              {/* فلتر النوع */}
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="نوع الإجراء" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الإجراءات</SelectItem>
                  <SelectItem value="CREATE">إنشاء</SelectItem>
                  <SelectItem value="UPDATE">تعديل</SelectItem>
                  <SelectItem value="DELETE">حذف</SelectItem>
                  <SelectItem value="CONFIRM">تأكيد</SelectItem>
                </SelectContent>
              </Select>

              {/* فلتر الكيان */}
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="نوع الكيان" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الكيانات</SelectItem>
                  <SelectItem value="farmer">مزارع</SelectItem>
                  <SelectItem value="agent">وكيل</SelectItem>
                  <SelectItem value="shipment">شحنة</SelectItem>
                  <SelectItem value="transporter">ناقل</SelectItem>
                  <SelectItem value="khat_type">نوع قات</SelectItem>
                  <SelectItem value="user">مستخدم</SelectItem>
                  <SelectItem value="expense">مصروف</SelectItem>
                </SelectContent>
              </Select>

              {/* فلتر المستخدم */}
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="المستخدم" />
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

            {/* فلتر التاريخ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">من تاريخ</Label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pr-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إلى تاريخ</Label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pr-9"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full gap-2">
                  مسح الفلاتر
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* قائمة النشاطات */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              لا توجد نشاطات مسجلة
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-450px)] min-h-[300px]">
                <div className="divide-y divide-border">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => openDetailsDialog(log)}
                    >
                      <div className="flex items-start gap-3">
                        {/* أيقونة الإجراء */}
                        <div
                          className={cn(
                            'h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0',
                            ACTION_COLORS[log.action]
                          )}
                        >
                          {ACTION_ICONS[log.action]}
                        </div>

                        {/* المحتوى */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={ACTION_COLORS[log.action]}>
                              {ACTION_LABELS[log.action]}
                            </Badge>
                            <Badge variant="secondary">
                              {ENTITY_LABELS[log.entityType] || log.entityType}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm line-clamp-2">{log.description}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.user?.username || 'مستخدم محذوف'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(log.createdAt)}
                            </div>
                          </div>
                        </div>

                        {/* زر التفاصيل */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailsDialog(log);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* التقسيم */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              صفحة {pagination.page} من {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                <ChevronRight className="h-4 w-4" />
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                التالي
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* حوار التفاصيل */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedLog && (
                  <>
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center',
                        ACTION_COLORS[selectedLog.action]
                      )}
                    >
                      {ACTION_ICONS[selectedLog.action]}
                    </div>
                    تفاصيل النشاط
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedLog && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={ACTION_COLORS[selectedLog.action]}>
                      {ACTION_LABELS[selectedLog.action]}
                    </Badge>
                    <Badge variant="secondary">
                      {ENTITY_LABELS[selectedLog.entityType] || selectedLog.entityType}
                    </Badge>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedLog && (
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {/* الوصف */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">الوصف</Label>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">
                      {selectedLog.description}
                    </p>
                  </div>

                  {/* معلومات إضافية */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">المستخدم</Label>
                      <p className="text-sm">{selectedLog.user?.username || 'مستخدم محذوف'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">التاريخ</Label>
                      <p className="text-sm">{formatDate(selectedLog.createdAt)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">معرف الكيان</Label>
                      <p className="text-sm font-mono text-xs bg-muted px-2 py-1 rounded">
                        {selectedLog.entityId}
                      </p>
                    </div>
                  </div>

                  {/* البيانات القديمة والجديدة */}
                  {(selectedLog.oldData || selectedLog.newData) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedLog.oldData && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileJson className="h-3 w-3" />
                            البيانات القديمة
                          </Label>
                          <pre className="text-xs bg-red-50 dark:bg-red-950 p-3 rounded-lg overflow-auto max-h-48 border border-red-200 dark:border-red-800">
                            {formatJsonData(selectedLog.oldData)}
                          </pre>
                        </div>
                      )}
                      {selectedLog.newData && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileJson className="h-3 w-3" />
                            البيانات الجديدة
                          </Label>
                          <pre className="text-xs bg-emerald-50 dark:bg-emerald-950 p-3 rounded-lg overflow-auto max-h-48 border border-emerald-200 dark:border-emerald-800">
                            {formatJsonData(selectedLog.newData)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
