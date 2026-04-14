'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Wallet,
  Loader2,
  Search,
  DollarSign,
  Calendar,
  Filter,
  TrendingUp,
  Eye,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Users,
  XCircle,
  Percent,
  Printer,
  FileText,
  ArrowUpDown,
  RotateCcw,
  Trash2,
  Pencil,
} from 'lucide-react';

interface DebtPayment {
  id: string;
  amount: number;
  date: string;
  method: string | null;
  notes: string | null;
}

interface Debt {
  id: string;
  debtorType: string;
  debtorId: string;
  debtorName: string;
  amount: number;
  remainingAmount: number;
  dueDate: string | null;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  description: string | null;
  payments: DebtPayment[];
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  role: string;
}

interface Stats {
  totalDebts: number;
  totalAmount: number;
  totalRemaining: number;
  totalPaid: number;
  byStatus: {
    pending: number;
    partial: number;
    paid: number;
    overdue: number;
    cancelled: number;
  };
}

const statusLabels: Record<string, string> = {
  PENDING: 'معلقة',
  PARTIAL: 'مدفوعة جزئياً',
  PAID: 'مدفوعة',
  OVERDUE: 'متأخرة',
  CANCELLED: 'ملغاة',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  PARTIAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  PARTIAL: <Percent className="h-3.5 w-3.5" />,
  PAID: <CheckCircle className="h-3.5 w-3.5" />,
  OVERDUE: <AlertTriangle className="h-3.5 w-3.5" />,
  CANCELLED: <XCircle className="h-3.5 w-3.5" />,
};

const debtorTypeLabels: Record<string, string> = {
  AGENT: 'وكيل',
  FARMER: 'مزارع',
  TRANSPORTER: 'ناقل',
  CUSTOMER: 'عميل',
  OTHER: 'أخرى',
};

const paymentMethodLabels: Record<string, string> = {
  CASH: 'نقداً',
  BANK: 'تحويل بنكي',
  CHECK: 'شيك',
  OTHER: 'أخرى',
};

export default function DebtsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDebtorType, setFilterDebtorType] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'remaining'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [stats, setStats] = useState<Stats>({
    totalDebts: 0,
    totalAmount: 0,
    totalRemaining: 0,
    totalPaid: 0,
    byStatus: { pending: 0, partial: 0, paid: 0, overdue: 0, cancelled: 0 },
  });

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    debtorType: 'OTHER',
    debtorId: '',
    debtorName: '',
    amount: '',
    dueDate: '',
    description: '',
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'CASH',
    notes: '',
  });

  // التحقق من المستخدم
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');

    if (userData && token) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/login.html';
    }
  }, []);

  // تحميل الديون
  const loadDebts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterDebtorType !== 'all') params.append('debtorType', filterDebtorType);
      if (filterDateFrom) params.append('fromDate', filterDateFrom);
      if (filterDateTo) params.append('toDate', filterDateTo);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/debts?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        let sortedDebts = data.data || [];

        // ترتيب البيانات
        sortedDebts.sort((a: Debt, b: Debt) => {
          let comparison = 0;
          if (sortBy === 'date') {
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          } else if (sortBy === 'amount') {
            comparison = a.amount - b.amount;
          } else if (sortBy === 'remaining') {
            comparison = a.remainingAmount - b.remainingAmount;
          }
          return sortOrder === 'desc' ? -comparison : comparison;
        });

        setDebts(sortedDebts);
        setStats(data.stats || {
          totalDebts: 0,
          totalAmount: 0,
          totalRemaining: 0,
          totalPaid: 0,
          byStatus: { pending: 0, partial: 0, paid: 0, overdue: 0, cancelled: 0 },
        });
      }
    } catch (error) {
      console.error('Error loading debts:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterDebtorType, filterDateFrom, filterDateTo, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    if (user) {
      loadDebts();
    }
  }, [user, loadDebts]);

  // تسجيل الخروج
  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  };

  // تنسيق العملة
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-YE').format(amount) + ' ريال';
  };

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // تنسيق التاريخ والوقت
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // حساب النسبة المدفوعة
  const calculatePaidPercentage = (debt: Debt) => {
    if (debt.amount === 0) return 0;
    return Math.round(((debt.amount - debt.remainingAmount) / debt.amount) * 100);
  };

  // حساب الأيام المتأخرة
  const calculateOverdueDays = (dueDate: string | null) => {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // إضافة دين
  const handleAdd = async () => {
    if (!formData.debtorName.trim()) {
      alert('يرجى إدخال اسم المديون');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debtorType: formData.debtorType,
          debtorId: formData.debtorId || `DEBT-${Date.now()}`,
          debtorName: formData.debtorName,
          amount: parseFloat(formData.amount),
          dueDate: formData.dueDate || null,
          description: formData.description,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setDebts([data.data, ...debts]);
        setShowAddDialog(false);
        setFormData({
          debtorType: 'OTHER',
          debtorId: '',
          debtorName: '',
          amount: '',
          dueDate: '',
          description: '',
        });
        loadDebts();
      } else {
        alert(data.error || 'فشل في إضافة الدين');
      }
    } catch (error) {
      console.error('Error adding debt:', error);
      alert('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  // فتح حوار الدفع
  const openPaymentDialog = (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentData({
      amount: debt.remainingAmount.toString(),
      method: 'CASH',
      notes: '',
    });
    setShowPaymentDialog(true);
  };

  // إضافة دفعة
  const handleAddPayment = async () => {
    if (!selectedDebt) return;

    const amount = parseFloat(paymentData.amount);
    if (!amount || amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (amount > selectedDebt.remainingAmount) {
      alert(`المبلغ يتجاوز المتبقي (${formatCurrency(selectedDebt.remainingAmount)})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debtId: selectedDebt.id,
          payment: {
            amount,
            method: paymentData.method,
            notes: paymentData.notes,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        setDebts(debts.map(d => d.id === selectedDebt.id ? data.data : d));
        setShowPaymentDialog(false);
        setSelectedDebt(null);
        loadDebts();
      } else {
        alert(data.error || 'فشل في إضافة الدفعة');
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  // عرض تفاصيل الدين
  const openDetailsDialog = (debt: Debt) => {
    setSelectedDebt(debt);
    setShowDetailsDialog(true);
  };

  // طباعة سجل الدين
  const openPrintDialog = (debt: Debt) => {
    setSelectedDebt(debt);
    setShowPrintDialog(true);
  };

  // طباعة المحتوى
  const handlePrint = () => {
    window.print();
  };

  // مسح الفلاتر
  const clearFilters = () => {
    setFilterStatus('all');
    setFilterDebtorType('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchQuery('');
    setSortBy('date');
    setSortOrder('desc');
  };

  // تبديل الترتيب
  const toggleSort = (field: 'date' | 'amount' | 'remaining') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const hasActiveFilters = filterStatus !== 'all' || filterDebtorType !== 'all' || filterDateFrom || filterDateTo || searchQuery;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
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
        {/* العنوان */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6 text-red-600" />
              إدارة الديون
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              تتبع وإدارة ديون العملاء والموردين
            </p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            دين جديد
          </Button>
        </div>

        {/* إحصائيات رئيسية */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="overflow-hidden bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-red-600 dark:text-red-400">إجمالي الديون</span>
                  <p className="text-lg sm:text-2xl font-bold text-red-700 dark:text-red-300">
                    {stats.totalDebts}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-amber-600 dark:text-amber-400">إجمالي المبالغ</span>
                  <p className="text-sm sm:text-lg font-bold text-amber-700 dark:text-amber-300">
                    {formatCurrency(stats.totalAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-orange-600 dark:text-orange-400">المتبقي</span>
                  <p className="text-sm sm:text-lg font-bold text-orange-700 dark:text-orange-300">
                    {formatCurrency(stats.totalRemaining)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">المدفوع</span>
                  <p className="text-sm sm:text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(stats.totalPaid)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* إحصائيات حسب الحالة */}
        <div className="grid grid-cols-5 gap-2">
          <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFilterStatus(filterStatus === 'PENDING' ? 'all' : 'PENDING')}>
            <CardContent className="p-2 sm:p-3 text-center">
              <Clock className="h-4 w-4 mx-auto text-amber-600 mb-1" />
              <p className="text-xs text-amber-700 dark:text-amber-300">معلقة</p>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{stats.byStatus.pending}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFilterStatus(filterStatus === 'PARTIAL' ? 'all' : 'PARTIAL')}>
            <CardContent className="p-2 sm:p-3 text-center">
              <Percent className="h-4 w-4 mx-auto text-blue-600 mb-1" />
              <p className="text-xs text-blue-700 dark:text-blue-300">جزئية</p>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{stats.byStatus.partial}</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFilterStatus(filterStatus === 'PAID' ? 'all' : 'PAID')}>
            <CardContent className="p-2 sm:p-3 text-center">
              <CheckCircle className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300">مدفوعة</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{stats.byStatus.paid}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFilterStatus(filterStatus === 'OVERDUE' ? 'all' : 'OVERDUE')}>
            <CardContent className="p-2 sm:p-3 text-center">
              <AlertTriangle className="h-4 w-4 mx-auto text-red-600 mb-1" />
              <p className="text-xs text-red-700 dark:text-red-300">متأخرة</p>
              <p className="text-sm font-bold text-red-700 dark:text-red-300">{stats.byStatus.overdue}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFilterStatus(filterStatus === 'CANCELLED' ? 'all' : 'CANCELLED')}>
            <CardContent className="p-2 sm:p-3 text-center">
              <XCircle className="h-4 w-4 mx-auto text-gray-600 mb-1" />
              <p className="text-xs text-gray-700 dark:text-gray-300">ملغاة</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{stats.byStatus.cancelled}</p>
            </CardContent>
          </Card>
        </div>

        {/* البحث والفلترة */}
        <Card>
          <CardContent className="p-3 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث باسم المديون أو الوصف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-36">
                  <Filter className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="PENDING">معلقة</SelectItem>
                  <SelectItem value="PARTIAL">مدفوعة جزئياً</SelectItem>
                  <SelectItem value="PAID">مدفوعة</SelectItem>
                  <SelectItem value="OVERDUE">متأخرة</SelectItem>
                  <SelectItem value="CANCELLED">ملغاة</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDebtorType} onValueChange={setFilterDebtorType}>
                <SelectTrigger className="w-full sm:w-36">
                  <Users className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="AGENT">وكيل</SelectItem>
                  <SelectItem value="FARMER">مزارع</SelectItem>
                  <SelectItem value="TRANSPORTER">ناقل</SelectItem>
                  <SelectItem value="CUSTOMER">عميل</SelectItem>
                  <SelectItem value="OTHER">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">من تاريخ</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full sm:w-auto gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* جدول الديون */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : debts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{hasActiveFilters ? 'لا توجد نتائج مطابقة' : 'لا توجد ديون مسجلة'}</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  مسح الفلاتر
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المديون</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">النوع</TableHead>
                      <TableHead
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort('amount')}
                      >
                        <div className="flex items-center gap-1">
                          المبلغ
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort('remaining')}
                      >
                        <div className="flex items-center gap-1">
                          المتبقي
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right hidden lg:table-cell">تاريخ الاستحقاق</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debts.map((debt) => (
                      <TableRow key={debt.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                              <User className="h-4 w-4 text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium">{debt.debtorName}</p>
                              <p className="text-xs text-muted-foreground sm:hidden">
                                {debtorTypeLabels[debt.debtorType] || debt.debtorType}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">
                            {debtorTypeLabels[debt.debtorType] || debt.debtorType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(debt.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className={debt.remainingAmount > 0 ? 'text-red-600 font-bold' : 'text-emerald-600'}>
                              {formatCurrency(debt.remainingAmount)}
                            </span>
                            {debt.remainingAmount < debt.amount && debt.amount > 0 && (
                              <Progress
                                value={calculatePaidPercentage(debt)}
                                className="h-1.5 w-20"
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {debt.dueDate ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className={debt.status === 'OVERDUE' ? 'text-red-600 font-bold' : ''}>
                                {formatDate(debt.dueDate)}
                              </span>
                              {debt.status === 'OVERDUE' && (
                                <Badge variant="destructive" className="text-xs ml-1">
                                  {calculateOverdueDays(debt.dueDate)} يوم
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1 ${statusColors[debt.status]}`}>
                            {statusIcons[debt.status]}
                            {statusLabels[debt.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDetailsDialog(debt)}
                              className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                              title="عرض التفاصيل"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openPrintDialog(debt)}
                              className="h-8 w-8 hover:bg-sky-50 hover:text-sky-600"
                              title="طباعة"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {(debt.status === 'PENDING' || debt.status === 'PARTIAL' || debt.status === 'OVERDUE') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openPaymentDialog(debt)}
                                className="h-8 w-8 hover:bg-emerald-50 hover:text-emerald-600"
                                title="تسجيل دفعة"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ملخص */}
        {!loading && debts.length > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">
                  عرض {debts.length} دين
                </span>
                <div className="flex gap-4 text-sm">
                  <span className="text-red-600 font-bold">
                    إجمالي المتبقي: {formatCurrency(stats.totalRemaining)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* حوار إضافة دين */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-red-600" />
                إضافة دين جديد
              </DialogTitle>
              <DialogDescription>أدخل بيانات الدين</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="debtorType">نوع المديون</Label>
                  <Select
                    value={formData.debtorType}
                    onValueChange={(v) => setFormData({ ...formData, debtorType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AGENT">وكيل</SelectItem>
                      <SelectItem value="FARMER">مزارع</SelectItem>
                      <SelectItem value="TRANSPORTER">ناقل</SelectItem>
                      <SelectItem value="CUSTOMER">عميل</SelectItem>
                      <SelectItem value="OTHER">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debtorId">معرف المديون (اختياري)</Label>
                  <Input
                    id="debtorId"
                    value={formData.debtorId}
                    onChange={(e) => setFormData({ ...formData, debtorId: e.target.value })}
                    placeholder="معرف تلقائي"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="debtorName">اسم المديون *</Label>
                <Input
                  id="debtorName"
                  value={formData.debtorName}
                  onChange={(e) => setFormData({ ...formData, debtorName: e.target.value })}
                  placeholder="أدخل اسم المديون"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ (ريال) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="text-left"
                  dir="ltr"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">تاريخ الاستحقاق (اختياري)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف الدين"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!formData.debtorName.trim() || !formData.amount || submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Plus className="h-4 w-4 ml-2" />
                )}
                إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* حوار إضافة دفعة */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                تسجيل دفعة
              </DialogTitle>
              <DialogDescription>
                {selectedDebt && (
                  <span>
                    المتبقي: <strong className="text-red-600">{formatCurrency(selectedDebt.remainingAmount)}</strong>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">مبلغ الدفعة (ريال) *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="0.00"
                  className="text-left"
                  dir="ltr"
                  min="0"
                  max={selectedDebt?.remainingAmount}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">طريقة الدفع</Label>
                <Select
                  value={paymentData.method}
                  onValueChange={(v) => setPaymentData({ ...paymentData, method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">نقداً</SelectItem>
                    <SelectItem value="BANK">تحويل بنكي</SelectItem>
                    <SelectItem value="CHECK">شيك</SelectItem>
                    <SelectItem value="OTHER">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentNotes">ملاحظات</Label>
                <Input
                  id="paymentNotes"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="ملاحظات إضافية"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleAddPayment}
                disabled={!paymentData.amount || submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 ml-2" />
                )}
                تسجيل الدفعة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* حوار تفاصيل الدين */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-red-600" />
                تفاصيل الدين
              </DialogTitle>
              <DialogDescription>
                {selectedDebt?.debtorName}
              </DialogDescription>
            </DialogHeader>
            {selectedDebt && (
              <div className="space-y-4">
                {/* معلومات الدين */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">المديون</Label>
                    <p className="font-medium">{selectedDebt.debtorName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">النوع</Label>
                    <p className="font-medium">{debtorTypeLabels[selectedDebt.debtorType] || selectedDebt.debtorType}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الحالة</Label>
                    <div className="mt-1">
                      <Badge className={`gap-1 ${statusColors[selectedDebt.status]}`}>
                        {statusIcons[selectedDebt.status]}
                        {statusLabels[selectedDebt.status]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">تاريخ الإنشاء</Label>
                    <p className="font-medium">{formatDate(selectedDebt.createdAt)}</p>
                  </div>
                  {selectedDebt.dueDate && (
                    <div>
                      <Label className="text-muted-foreground">تاريخ الاستحقاق</Label>
                      <p className={`font-medium ${selectedDebt.status === 'OVERDUE' ? 'text-red-600' : ''}`}>
                        {formatDate(selectedDebt.dueDate)}
                        {selectedDebt.status === 'OVERDUE' && (
                          <span className="text-xs mr-2">({calculateOverdueDays(selectedDebt.dueDate)} يوم متأخر)</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* الملخص المالي */}
                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المبلغ الأصلي</span>
                    <span className="font-bold">{formatCurrency(selectedDebt.amount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>المدفوع</span>
                    <span className="font-bold">{formatCurrency(selectedDebt.amount - selectedDebt.remainingAmount)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-bold border-t pt-2">
                    <span>المتبقي</span>
                    <span>{formatCurrency(selectedDebt.remainingAmount)}</span>
                  </div>
                  {selectedDebt.amount > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">نسبة السداد</span>
                        <span className="font-medium">{calculatePaidPercentage(selectedDebt)}%</span>
                      </div>
                      <Progress value={calculatePaidPercentage(selectedDebt)} className="h-2" />
                    </div>
                  )}
                </div>

                {/* سجل الدفعات */}
                {selectedDebt.payments && selectedDebt.payments.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      سجل الدفعات ({selectedDebt.payments.length} دفعة)
                    </Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedDebt.payments.map((payment, index) => (
                        <div key={payment.id || index} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                {formatCurrency(payment.amount)}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatDate(payment.date)}</span>
                                {payment.method && (
                                  <>
                                    <span>•</span>
                                    <span>{paymentMethodLabels[payment.method] || payment.method}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {payment.notes && (
                            <span className="text-xs text-muted-foreground max-w-32 truncate">{payment.notes}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDebt.description && (
                  <div>
                    <Label className="text-muted-foreground">الوصف</Label>
                    <p className="mt-1 p-2 bg-muted/30 rounded">{selectedDebt.description}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                إغلاق
              </Button>
              {selectedDebt && (selectedDebt.status === 'PENDING' || selectedDebt.status === 'PARTIAL' || selectedDebt.status === 'OVERDUE') && (
                <Button
                  onClick={() => {
                    setShowDetailsDialog(false);
                    openPaymentDialog(selectedDebt);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  تسجيل دفعة
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetailsDialog(false);
                  if (selectedDebt) openPrintDialog(selectedDebt);
                }}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* حوار طباعة الدين */}
        <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-sky-600" />
                معاينة الطباعة
              </DialogTitle>
            </DialogHeader>
            {selectedDebt && (
              <div id="print-content" className="space-y-4 p-4 bg-white border rounded-lg print:border-none print:p-0">
                {/* رأس التقرير */}
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold">سجل الدين</h2>
                  <p className="text-sm text-muted-foreground">تاريخ الطباعة: {formatDateTime(new Date().toISOString())}</p>
                </div>

                {/* معلومات المديون */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">المديون</Label>
                    <p className="font-bold text-lg">{selectedDebt.debtorName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">النوع</Label>
                    <p className="font-medium">{debtorTypeLabels[selectedDebt.debtorType] || selectedDebt.debtorType}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الحالة</Label>
                    <Badge className={`gap-1 ${statusColors[selectedDebt.status]}`}>
                      {statusIcons[selectedDebt.status]}
                      {statusLabels[selectedDebt.status]}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">تاريخ الإنشاء</Label>
                    <p className="font-medium">{formatDate(selectedDebt.createdAt)}</p>
                  </div>
                  {selectedDebt.dueDate && (
                    <div>
                      <Label className="text-muted-foreground">تاريخ الاستحقاق</Label>
                      <p className={`font-medium ${selectedDebt.status === 'OVERDUE' ? 'text-red-600' : ''}`}>
                        {formatDate(selectedDebt.dueDate)}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* الملخص المالي */}
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-lg">
                    <span>المبلغ الأصلي</span>
                    <span className="font-bold">{formatCurrency(selectedDebt.amount)}</span>
                  </div>
                  <div className="flex justify-between text-lg text-emerald-600">
                    <span>المدفوع</span>
                    <span className="font-bold">{formatCurrency(selectedDebt.amount - selectedDebt.remainingAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-xl text-red-600 font-bold">
                    <span>المتبقي</span>
                    <span>{formatCurrency(selectedDebt.remainingAmount)}</span>
                  </div>
                </div>

                {/* سجل الدفعات */}
                {selectedDebt.payments && selectedDebt.payments.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      سجل الدفعات
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">#</TableHead>
                          <TableHead className="text-right">التاريخ</TableHead>
                          <TableHead className="text-right">المبلغ</TableHead>
                          <TableHead className="text-right">الطريقة</TableHead>
                          <TableHead className="text-right">ملاحظات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDebt.payments.map((payment, index) => (
                          <TableRow key={payment.id || index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{formatDate(payment.date)}</TableCell>
                            <TableCell className="font-bold text-emerald-600">{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>{paymentMethodLabels[payment.method || ''] || '-'}</TableCell>
                            <TableCell>{payment.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {selectedDebt.description && (
                  <div>
                    <Label className="text-muted-foreground">الوصف</Label>
                    <p className="mt-1 p-2 bg-gray-50 rounded">{selectedDebt.description}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* أنماط الطباعة */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-content, #print-content * {
            visibility: visible;
          }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
