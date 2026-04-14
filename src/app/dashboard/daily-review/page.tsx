'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Users,
  Package,
  DollarSign,
  Search,
  CheckCircle,
  XCircle,
  Phone,
  RefreshCw,
  Loader2,
  User,
  TrendingUp,
  Clock,
  Send,
  ArrowLeft,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface User {
  id: string;
  username: string;
  role: string;
}

interface FarmerReview {
  id: string;
  name: string;
  phone: string | null;
  sentToday: boolean;
  shipmentsCount: number;
  totalPieces: number;
  totalFee: number;
  agents: { id: string; name: string }[];
  users: { id: string; username: string }[];
  khatTypes: { name: string; pieces: number }[];
  lastSentDate: string | null;
}

interface DailyStats {
  totalFarmers: number;
  sentTodayCount: number;
  notSentTodayCount: number;
  sentPercentage: number;
  totalPieces: number;
  totalFee: number;
}

export default function DailyReviewPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // البيانات
  const [farmers, setFarmers] = useState<FarmerReview[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<FarmerReview[]>([]);
  const [stats, setStats] = useState<DailyStats>({
    totalFarmers: 0,
    sentTodayCount: 0,
    notSentTodayCount: 0,
    sentPercentage: 0,
    totalPieces: 0,
    totalFee: 0,
  });

  // الفلاتر
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // التحقق من المستخدم
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');

    if (userData && token) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/';
    }
  }, []);

  // تحميل البيانات
  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/daily-review?date=${selectedDate}`);
      const data = await res.json();

      setFarmers(data.farmers || []);
      setStats(data.stats || {
        totalFarmers: 0,
        sentTodayCount: 0,
        notSentTodayCount: 0,
        sentPercentage: 0,
        totalPieces: 0,
        totalFee: 0,
      });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // تطبيق الفلاتر
  useEffect(() => {
    let filtered = [...farmers];

    // البحث
    if (searchQuery) {
      filtered = filtered.filter(
        (f) =>
          f.name.includes(searchQuery) ||
          f.phone?.includes(searchQuery)
      );
    }

    // فلترة الحالة
    if (statusFilter === 'sent') {
      filtered = filtered.filter((f) => f.sentToday);
    } else if (statusFilter === 'not-sent') {
      filtered = filtered.filter((f) => !f.sentToday);
    }

    // ترتيب: الذين أرسلوا أولاً ثم الذين لم يرسلوا
    filtered.sort((a, b) => {
      if (a.sentToday && !b.sentToday) return -1;
      if (!a.sentToday && b.sentToday) return 1;
      return a.name.localeCompare(b.name, 'ar');
    });

    setFilteredFarmers(filtered);
  }, [farmers, searchQuery, statusFilter]);

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-YE').format(amount) + ' ريال';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'لم يرسل من قبل';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleCall = (phone: string | null) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  // مكون بطاقة المزارع
  const FarmerCard = ({ farmer }: { farmer: FarmerReview }) => {
    if (farmer.sentToday) {
      // بطاقة المزارع الذي أرسل اليوم
      return (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950 dark:to-background hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-full">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-700 dark:text-emerald-300">{farmer.name}</h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">أرسل اليوم ✅</p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                {farmer.shipmentsCount} شحنة
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white dark:bg-background rounded-lg p-2 border">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Package className="h-3 w-3" />
                  <span className="text-xs">الحبات</span>
                </div>
                <p className="font-bold text-blue-600">{farmer.totalPieces.toLocaleString('ar-YE')}</p>
              </div>
              <div className="bg-white dark:bg-background rounded-lg p-2 border">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <DollarSign className="h-3 w-3" />
                  <span className="text-xs">الأجرة</span>
                </div>
                <p className="font-bold text-emerald-600 text-sm">{formatCurrency(farmer.totalFee)}</p>
              </div>
            </div>

            {/* أنواع القات */}
            {farmer.khatTypes.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">أنواع القات:</p>
                <div className="flex flex-wrap gap-1">
                  {farmer.khatTypes.map((kt, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {kt.name} ({kt.pieces})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* الوكلاء */}
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1">الوكلاء المستلمون:</p>
              <div className="flex flex-wrap gap-1">
                {farmer.agents.map((agent) => (
                  <Badge key={agent.id} variant="outline" className="text-xs">
                    {agent.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* المستخدم */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <User className="h-3 w-3" />
              <span>أدخل البيانات: {farmer.users.map(u => u.username).join('، ')}</span>
            </div>
          </CardContent>
        </Card>
      );
    } else {
      // بطاقة المزارع الذي لم يرسل اليوم
      return (
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white dark:from-red-950 dark:to-background hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-red-700 dark:text-red-300">{farmer.name}</h3>
                  <p className="text-xs text-red-600 dark:text-red-400">لم يرسل اليوم ❌</p>
                </div>
              </div>
              {farmer.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => handleCall(farmer.phone)}
                >
                  <Phone className="h-3 w-3" />
                  اتصال
                </Button>
              )}
            </div>

            {/* آخر تاريخ إرسال */}
            <div className="bg-white dark:bg-background rounded-lg p-3 border mb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">آخر إرسال:</span>
              </div>
              <p className={`font-medium mt-1 ${farmer.lastSentDate ? 'text-amber-600' : 'text-gray-400'}`}>
                {formatDate(farmer.lastSentDate)}
              </p>
            </div>

            {/* رقم الهاتف */}
            {farmer.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span dir="ltr">{farmer.phone}</span>
              </div>
            )}

            {!farmer.phone && (
              <p className="text-xs text-muted-foreground italic">لا يوجد رقم هاتف مسجل</p>
            )}
          </CardContent>
        </Card>
      );
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
    <DashboardLayout
      userRole={user.role as 'ADMIN' | 'WORKER'}
      username={user.username}
      onLogout={handleLogout}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* العنوان */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">المراجعة اليومية للمزارعين</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                تتبع من أرسل ومن لم يرسل القات اليوم
              </p>
            </div>
          </div>
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
        </div>

        {/* اختيار التاريخ */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">اختر التاريخ:</span>
              </div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-48"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedDate === new Date().toISOString().split('T')[0] ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className={selectedDate === new Date().toISOString().split('T')[0] ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  اليوم
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setSelectedDate(yesterday.toISOString().split('T')[0]);
                  }}
                >
                  أمس
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* الإحصائيات الرئيسية */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* إجمالي المزارعين */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-full">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">إجمالي المزارعين</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-700">{stats.totalFarmers}</p>
            </CardContent>
          </Card>

          {/* أرسلوا اليوم */}
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-emerald-200 dark:bg-emerald-800 rounded-full">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">أرسلوا اليوم</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-700">{stats.sentTodayCount}</p>
            </CardContent>
          </Card>

          {/* لم يرسلوا */}
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-red-200 dark:bg-red-800 rounded-full">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <span className="text-xs sm:text-sm text-red-700 dark:text-red-300">لم يرسلوا</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-red-700">{stats.notSentTodayCount}</p>
            </CardContent>
          </Card>

          {/* نسبة الإرسال */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-purple-200 dark:bg-purple-800 rounded-full">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">نسبة الإرسال</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-purple-700">{stats.sentPercentage}%</p>
              <Progress value={stats.sentPercentage} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* إحصائيات إضافية */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-amber-600" />
                <span className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">إجمالي الحبات</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-amber-700">
                {stats.totalPieces.toLocaleString('ar-YE')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-teal-600" />
                <span className="text-xs sm:text-sm text-teal-700 dark:text-teal-300">إجمالي الأجور</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-teal-700">
                {formatCurrency(stats.totalFee)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* الفلاتر */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث بالمزارع أو رقم الهاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل ({farmers.length})</SelectItem>
                  <SelectItem value="sent">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                      أرسلوا ({stats.sentTodayCount})
                    </div>
                  </SelectItem>
                  <SelectItem value="not-sent">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-red-500" />
                      لم يرسلوا ({stats.notSentTodayCount})
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* قائمة المزارعين */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredFarmers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>لا يوجد مزارعين مسجلين</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFarmers.map((farmer) => (
              <FarmerCard key={farmer.id} farmer={farmer} />
            ))}
          </div>
        )}

        {/* ملخص */}
        {filteredFarmers.length > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span>
                    عرض <strong>{filteredFarmers.length}</strong> من <strong>{stats.totalFarmers}</strong> مزارع
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle className="h-4 w-4" />
                    {filteredFarmers.filter(f => f.sentToday).length} أرسلوا
                  </span>
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="h-4 w-4" />
                    {filteredFarmers.filter(f => !f.sentToday).length} لم يرسلوا
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* تنبيه للمزارعين الذين لم يرسلوا */}
        {stats.notSentTodayCount > 0 && stats.sentPercentage < 50 && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-700">تنبيه: نسبة إرسال منخفضة</p>
                  <p className="text-sm text-red-600">
                    {stats.notSentTodayCount} مزارع لم يرسلوا اليوم ({100 - stats.sentPercentage}% من الإجمالي)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
