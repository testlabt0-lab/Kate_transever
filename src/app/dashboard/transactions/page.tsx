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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  Wallet,
  TrendingUp,
  Loader2,
  Search,
  TrendingDown,
  Filter,
  Users,
} from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: 'DEBT' | 'PAYMENT';
  description: string | null;
  date: string;
  actorType: 'FARMER' | 'AGENT';
  actorId: string;
  farmer?: { name: string };
  agent?: { name: string };
}

interface User {
  id: string;
  username: string;
  role: string;
}

export default function TransactionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterActor, setFilterActor] = useState<string>('all');

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    actorType: 'AGENT' as 'FARMER' | 'AGENT',
    actorId: '',
    amount: '',
    type: 'PAYMENT' as 'DEBT' | 'PAYMENT',
    description: '',
  });

  // Actors for selection
  const [agents, setAgents] = useState<{ id: string; name: string; balance: number }[]>([]);
  const [farmers, setFarmers] = useState<{ id: string; name: string; balance: number }[]>([]);

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

  // تحميل البيانات
  const loadData = useCallback(async () => {
    try {
      const [transactionsRes, agentsRes, farmersRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/agents'),
        fetch('/api/farmers'),
      ]);

      const transactionsData = await transactionsRes.json();
      const agentsData = await agentsRes.json();
      const farmersData = await farmersRes.json();

      setTransactions(transactionsData.transactions || []);
      setAgents(agentsData.agents || []);
      setFarmers(farmersData.farmers || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // تسجيل الخروج
  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  };

  // تصفية المعاملات
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.farmer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.agent?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesActor = filterActor === 'all' || tx.actorType === filterActor;
    return matchesSearch && matchesType && matchesActor;
  });

  // حساب الإحصائيات
  const totalDebts = transactions
    .filter((tx) => tx.type === 'DEBT')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalPayments = transactions
    .filter((tx) => tx.type === 'PAYMENT')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // حساب الديون حسب النوع
  const farmerDebts = transactions
    .filter((tx) => tx.type === 'DEBT' && tx.actorType === 'FARMER')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const agentDebts = transactions
    .filter((tx) => tx.type === 'DEBT' && tx.actorType === 'AGENT')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // إضافة معاملة
  const handleAdd = async () => {
    if (!formData.actorId || !formData.amount) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTransactions([data.transaction, ...transactions]);
        setShowAddDialog(false);
        setFormData({
          actorType: 'AGENT',
          actorId: '',
          amount: '',
          type: 'PAYMENT',
          description: '',
        });
        loadData(); // إعادة تحميل البيانات
      } else {
        alert(data.error || 'فشل في إضافة المعاملة');
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
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

  // الحصول على اسم الممثل
  const getActorName = (tx: Transaction) => {
    return tx.farmer?.name || tx.agent?.name || 'غير معروف';
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const currentActors = formData.actorType === 'AGENT' ? agents : farmers;

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
            <h1 className="text-xl sm:text-2xl font-bold">الديون والمدفوعات</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              سجل جميع المعاملات المالية للمزارعين والوكلاء
            </p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2 w-full sm:w-auto"
          >
            <DollarSign className="h-4 w-4" />
            معاملة جديدة
          </Button>
        </div>

        {/* إحصائيات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-muted-foreground">إجمالي الديون</span>
                  <p className="text-base sm:text-lg font-bold text-red-600">
                    {formatCurrency(totalDebts)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-muted-foreground">إجمالي المدفوعات</span>
                  <p className="text-base sm:text-lg font-bold text-green-600">
                    {formatCurrency(totalPayments)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-muted-foreground">ديون الوكلاء</span>
                  <p className="text-base sm:text-lg font-bold text-purple-600">
                    {formatCurrency(agentDebts)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-muted-foreground">ديون المزارعين</span>
                  <p className="text-base sm:text-lg font-bold text-amber-600">
                    {formatCurrency(farmerDebts)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* البحث والفلترة */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث بالاسم أو الوصف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-36">
              <Filter className="h-4 w-4 ml-2" />
              <SelectValue placeholder="نوع المعاملة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المعاملات</SelectItem>
              <SelectItem value="DEBT">ديون</SelectItem>
              <SelectItem value="PAYMENT">مدفوعات</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterActor} onValueChange={setFilterActor}>
            <SelectTrigger className="w-full sm:w-36">
              <Users className="h-4 w-4 ml-2" />
              <SelectValue placeholder="نوع الجهة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="AGENT">وكلاء</SelectItem>
              <SelectItem value="FARMER">مزارعين</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* قائمة المعاملات */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>لا توجد معاملات</p>
              {searchQuery && <p className="text-sm mt-1">جرب تغيير البحث أو الفلتر</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pe-1">
            {filteredTransactions.map((tx) => (
              <Card key={tx.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        tx.type === 'PAYMENT'
                          ? 'bg-green-100 dark:bg-green-900'
                          : 'bg-red-100 dark:bg-red-900'
                      }`}>
                        {tx.type === 'PAYMENT' ? (
                          <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                        ) : (
                          <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-sm sm:text-base">
                            {getActorName(tx)}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            tx.actorType === 'AGENT'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                          }`}>
                            {tx.actorType === 'AGENT' ? 'وكيل' : 'مزارع'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                          {tx.description || (tx.type === 'PAYMENT' ? 'تسديد مبلغ' : 'إضافة دين')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className={`text-sm sm:text-base font-bold ${
                        tx.type === 'PAYMENT' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.type === 'PAYMENT' ? '-' : '+'}
                        {formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.type === 'PAYMENT' ? 'دفعة' : 'دين'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ملخص */}
        {!loading && filteredTransactions.length > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">
                  عرض {filteredTransactions.length} من {transactions.length} معاملة
                </span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-red-600">
                    ديون: {formatCurrency(filteredTransactions.filter(t => t.type === 'DEBT').reduce((s, t) => s + t.amount, 0))}
                  </span>
                  <span className="text-green-600">
                    مدفوعات: {formatCurrency(filteredTransactions.filter(t => t.type === 'PAYMENT').reduce((s, t) => s + t.amount, 0))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* حوار إضافة معاملة */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                إضافة معاملة جديدة
              </DialogTitle>
              <DialogDescription>تسجيل دين أو دفعة جديدة للمزارعين أو الوكلاء</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>نوع الجهة</Label>
                <Select
                  value={formData.actorType}
                  onValueChange={(v) => {
                    setFormData({ ...formData, actorType: v as 'FARMER' | 'AGENT', actorId: '' });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGENT">وكيل</SelectItem>
                    <SelectItem value="FARMER">مزارع</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>اختر {formData.actorType === 'AGENT' ? 'الوكيل' : 'المزارع'}</Label>
                <Select
                  value={formData.actorId}
                  onValueChange={(v) => setFormData({ ...formData, actorId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`اختر ${formData.actorType === 'AGENT' ? 'الوكيل' : 'المزارع'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {currentActors.length === 0 ? (
                      <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                        لا يوجد {formData.actorType === 'AGENT' ? 'وكلاء' : 'مزارعين'}
                      </div>
                    ) : (
                      currentActors.map((actor) => (
                        <SelectItem key={actor.id} value={actor.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{actor.name}</span>
                            {actor.balance !== 0 && (
                              <span className={`text-xs mr-2 ${actor.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                (رصيد: {formatCurrency(Math.abs(actor.balance))})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>نوع المعاملة</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as 'DEBT' | 'PAYMENT' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAYMENT">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-green-600" />
                        <span>دفعة (تسديد)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="DEBT">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-red-600" />
                        <span>دين (مستحق)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>المبلغ (ريال)</Label>
                <Input
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
                <Label>ملاحظة (اختياري)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف المعاملة..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!formData.actorId || !formData.amount || submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : null}
                تسجيل المعاملة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
