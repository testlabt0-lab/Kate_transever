'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Pencil,
  Trash2,
  Receipt,
  Loader2,
  Search,
  DollarSign,
  Calendar,
  Filter,
  TrendingUp,
  Package,
  User,
  MoreHorizontal,
  ArrowUpRight,
} from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'SUPPLIES' | 'SALARY' | 'OTHER';
  date: string;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  role: string;
}

interface Stats {
  totalAmount: number;
  todayAmount: number;
  monthAmount: number;
  maxExpense: Expense | null;
  byCategory: { SUPPLIES: number; SALARY: number; OTHER: number };
}

const categoryLabels: Record<string, string> = {
  SUPPLIES: 'مستلزمات',
  SALARY: 'رواتب',
  OTHER: 'أخرى',
};

const categoryColors: Record<string, string> = {
  SUPPLIES: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  SALARY: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
};

const categoryIcons: Record<string, React.ReactNode> = {
  SUPPLIES: <Package className="h-4 w-4" />,
  SALARY: <User className="h-4 w-4" />,
  OTHER: <MoreHorizontal className="h-4 w-4" />,
};

export default function ExpensesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [stats, setStats] = useState<Stats>({
    totalAmount: 0,
    todayAmount: 0,
    monthAmount: 0,
    maxExpense: null,
    byCategory: { SUPPLIES: 0, SALARY: 0, OTHER: 0 },
  });

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'OTHER' as 'SUPPLIES' | 'SALARY' | 'OTHER',
    date: new Date().toISOString().split('T')[0],
  });

  // التحقق من المستخدم باستخدام نظام المصادقة الجديد
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');

    if (userData && token) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/login.html';
    }
  }, []);

  // تحميل المصاريف
  const loadExpenses = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterDateFrom) params.append('from', filterDateFrom);
      if (filterDateTo) params.append('to', filterDateTo);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      const data = await res.json();
      setExpenses(data.expenses || []);

      // حساب الإحصائيات
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const allExpenses = data.expenses || [];

      // إجمالي المصاريف
      const totalAmount = allExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);

      // مصاريف اليوم
      const todayAmount = allExpenses
        .filter((e: Expense) => new Date(e.date) >= today)
        .reduce((sum: number, e: Expense) => sum + e.amount, 0);

      // مصاريف الشهر
      const monthAmount = allExpenses
        .filter((e: Expense) => new Date(e.date) >= monthStart)
        .reduce((sum: number, e: Expense) => sum + e.amount, 0);

      // أعلى مصروف
      const maxExpense = allExpenses.length > 0
        ? allExpenses.reduce((max: Expense, e: Expense) => e.amount > max.amount ? e : max, allExpenses[0])
        : null;

      setStats({
        totalAmount,
        todayAmount,
        monthAmount,
        maxExpense,
        byCategory: data.byCategory || { SUPPLIES: 0, SALARY: 0, OTHER: 0 },
      });
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (user) {
      loadExpenses();
    }
  }, [user, loadExpenses]);

  // تسجيل الخروج
  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  };

  // تصفية المصاريف محلياً للبحث
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // فتح حوار الإضافة
  const openAddDialog = () => {
    setFormData({
      description: '',
      amount: '',
      category: 'OTHER',
      date: new Date().toISOString().split('T')[0],
    });
    setShowAddDialog(true);
  };

  // فتح حوار التعديل
  const openEditDialog = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: new Date(expense.date).toISOString().split('T')[0],
    });
    setShowEditDialog(true);
  };

  // فتح حوار الحذف
  const openDeleteDialog = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowDeleteDialog(true);
  };

  // إضافة مصروف
  const handleAdd = async () => {
    if (!formData.description.trim() || !formData.amount) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setExpenses([data.expense, ...expenses]);
        setShowAddDialog(false);
        setFormData({
          description: '',
          amount: '',
          category: 'OTHER',
          date: new Date().toISOString().split('T')[0],
        });
        loadExpenses(); // إعادة تحميل الإحصائيات
      } else {
        alert(data.error || 'فشل في إضافة المصروف');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  // تعديل مصروف
  const handleEdit = async () => {
    if (!selectedExpense || !formData.description.trim() || !formData.amount) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedExpense.id,
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setExpenses(expenses.map((e) =>
          e.id === selectedExpense.id ? data.expense : e
        ));
        setShowEditDialog(false);
        setSelectedExpense(null);
        loadExpenses(); // إعادة تحميل الإحصائيات
      } else {
        alert(data.error || 'فشل في تعديل المصروف');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  // حذف مصروف
  const handleDelete = async () => {
    if (!selectedExpense) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/expenses?id=${selectedExpense.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setExpenses(expenses.filter((e) => e.id !== selectedExpense.id));
        setShowDeleteDialog(false);
        setSelectedExpense(null);
        loadExpenses(); // إعادة تحميل الإحصائيات
      } else {
        alert(data.error || 'فشل في حذف المصروف');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
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

  // مسح الفلاتر
  const clearFilters = () => {
    setFilterCategory('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchQuery('');
  };

  const hasActiveFilters = filterCategory !== 'all' || filterDateFrom || filterDateTo || searchQuery;

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
              <Receipt className="h-6 w-6 text-emerald-600" />
              إدارة المصاريف
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              تسجيل ومتابعة مصاريف العمل
            </p>
          </div>
          <Button
            onClick={openAddDialog}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            إضافة مصروف
          </Button>
        </div>

        {/* إحصائيات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-muted-foreground">إجمالي المصاريف</span>
                  <p className="text-base sm:text-lg font-bold text-red-600">
                    {formatCurrency(stats.totalAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-muted-foreground">مصاريف اليوم</span>
                  <p className="text-base sm:text-lg font-bold text-amber-600">
                    {formatCurrency(stats.todayAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-muted-foreground">مصاريف الشهر</span>
                  <p className="text-base sm:text-lg font-bold text-orange-600">
                    {formatCurrency(stats.monthAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-muted-foreground">أعلى مصروف</span>
                  <p className="text-sm sm:text-base font-bold text-purple-600 truncate max-w-[120px] sm:max-w-none">
                    {stats.maxExpense ? stats.maxExpense.description : '-'}
                  </p>
                  {stats.maxExpense && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(stats.maxExpense.amount)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* مصاريف حسب التصنيف */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                <span className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">مستلزمات</span>
              </div>
              <p className="text-base sm:text-lg font-bold mt-1 text-blue-700 dark:text-blue-300">
                {formatCurrency(stats.byCategory.SUPPLIES)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                <span className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">رواتب</span>
              </div>
              <p className="text-base sm:text-lg font-bold mt-1 text-purple-700 dark:text-purple-300">
                {formatCurrency(stats.byCategory.SALARY)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">أخرى</span>
              </div>
              <p className="text-base sm:text-lg font-bold mt-1 text-gray-700 dark:text-gray-300">
                {formatCurrency(stats.byCategory.OTHER)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* البحث والفلترة */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن مصروف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 ml-2" />
                <SelectValue placeholder="جميع الأنواع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="SUPPLIES">مستلزمات</SelectItem>
                <SelectItem value="SALARY">رواتب</SelectItem>
                <SelectItem value="OTHER">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* فلتر التاريخ */}
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
                className="w-full sm:w-auto"
              >
                مسح الفلاتر
              </Button>
            )}
          </div>
        </div>

        {/* قائمة المصاريف */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{hasActiveFilters ? 'لا توجد نتائج مطابقة' : 'لا توجد مصاريف مسجلة'}</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  مسح الفلاتر
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pe-1">
            {filteredExpenses.map((expense) => (
              <Card key={expense.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          expense.category === 'SUPPLIES'
                            ? 'bg-blue-100 dark:bg-blue-900'
                            : expense.category === 'SALARY'
                            ? 'bg-purple-100 dark:bg-purple-900'
                            : 'bg-gray-100 dark:bg-gray-900'
                        }`}>
                          {categoryIcons[expense.category]}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm sm:text-base truncate">{expense.description}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[expense.category]}`}>
                              {categoryLabels[expense.category]}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(expense.date)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-left">
                        <span className="text-sm sm:text-base font-bold text-red-600">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(expense)}
                          className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(expense)}
                          className="h-8 w-8 sm:h-9 sm:w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ملخص */}
        {!loading && filteredExpenses.length > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">
                  عرض {filteredExpenses.length} من {expenses.length} مصروف
                </span>
                <span className="text-sm font-bold text-red-600">
                  الإجمالي: {formatCurrency(filteredExpenses.reduce((sum, e) => sum + e.amount, 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* حوار الإضافة */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                إضافة مصروف جديد
              </DialogTitle>
              <DialogDescription>أدخل بيانات المصروف</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-description">وصف المصروف *</Label>
                <Input
                  id="add-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="أدخل وصف المصروف"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-amount">المبلغ (ريال) *</Label>
                <Input
                  id="add-amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="text-left"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-category">التصنيف</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as typeof formData.category })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPPLIES">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span>مستلزمات</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="SALARY">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-purple-600" />
                        <span>رواتب</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="OTHER">
                      <div className="flex items-center gap-2">
                        <MoreHorizontal className="h-4 w-4 text-gray-600" />
                        <span>أخرى</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-date">التاريخ</Label>
                <Input
                  id="add-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!formData.description.trim() || !formData.amount || submitting}
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

        {/* حوار التعديل */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-blue-600" />
                تعديل المصروف
              </DialogTitle>
              <DialogDescription>تعديل بيانات المصروف</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-description">وصف المصروف *</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="أدخل وصف المصروف"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-amount">المبلغ (ريال) *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="text-left"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">التصنيف</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as typeof formData.category })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPPLIES">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span>مستلزمات</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="SALARY">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-purple-600" />
                        <span>رواتب</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="OTHER">
                      <div className="flex items-center gap-2">
                        <MoreHorizontal className="h-4 w-4 text-gray-600" />
                        <span>أخرى</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">التاريخ</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleEdit}
                disabled={!formData.description.trim() || !formData.amount || submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : null}
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* حوار تأكيد الحذف */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                تأكيد الحذف
              </AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف المصروف &quot;{selectedExpense?.description}&quot;؟
                <br />
                <span className="text-red-600 text-sm">لا يمكن التراجع عن هذا الإجراء.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Trash2 className="h-4 w-4 ml-2" />
                )}
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
