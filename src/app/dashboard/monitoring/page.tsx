'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Eye,
  Package,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  Activity,
  RefreshCw,
  Calendar,
  User,
  DollarSign,
  Search,
  Loader2,
  Bell,
  Leaf,
} from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  username: string;
  role: string;
}

interface PendingShipment {
  id: string;
  date: string;
  farmerName: string;
  agentName: string;
  totalPieces: number;
  totalFee: number;
  hoursAgo: number;
}

interface TodayFarmer {
  id: string;
  name: string;
  totalPieces: number;
  totalFee: number;
  shipmentsCount: number;
  agents: string[];
  receivedBy: string;
}

interface Activity {
  id: string;
  type: 'SHIPMENT_CREATED' | 'SHIPMENT_DELIVERED' | 'PAYMENT' | 'EXPENSE';
  description: string;
  userName: string;
  date: string;
  details?: string;
}

export default function MonitoringPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [todayStats, setTodayStats] = useState({
    shipmentsCreated: 0,
    shipmentsDelivered: 0,
    totalPieces: 0,
    totalFee: 0,
    totalExpenses: 0,
  });

  const [pendingShipments, setPendingShipments] = useState<PendingShipment[]>([]);
  const [todayFarmers, setTodayFarmers] = useState<TodayFarmer[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [alerts, setAlerts] = useState<{ type: 'warning' | 'error' | 'info'; message: string; action?: string }[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');

    if (userData && token) {
      const parsed = JSON.parse(userData);
      if (parsed.role !== 'ADMIN') {
        window.location.href = '/dashboard';
        return;
      }
      setUser(parsed);
    } else {
      window.location.href = '/';
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [shipmentsRes, expensesRes, agentsRes] = await Promise.all([
        fetch('/api/shipments'),
        fetch('/api/expenses'),
        fetch('/api/agents'),
      ]);

      const shipmentsData = await shipmentsRes.json();
      const expensesData = await expensesRes.json();
      const agentsData = await agentsRes.json();

      const shipments = shipmentsData.shipments || [];
      const expenses = expensesData.expenses || [];
      const agents = agentsData.agents || [];

      const todayShipments = shipments.filter((s: { date: string }) =>
        new Date(s.date).toISOString().split('T')[0] === today
      );

      let totalPieces = 0;
      let totalFee = 0;

      todayShipments.forEach((s: { items: { totalPieces: number; totalFee: number }[] }) => {
        s.items?.forEach((item: { totalPieces: number; totalFee: number }) => {
          totalPieces += item.totalPieces || 0;
          totalFee += item.totalFee || 0;
        });
      });

      const todayExpenses = expenses.filter((e: { date: string }) =>
        new Date(e.date).toISOString().split('T')[0] === today
      );
      const totalExpenses = todayExpenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);

      setTodayStats({
        shipmentsCreated: todayShipments.length,
        shipmentsDelivered: todayShipments.filter((s: { status: string }) => s.status === 'DELIVERED').length,
        totalPieces,
        totalFee,
        totalExpenses,
      });

      // الشحنات المعلقة
      const pending = shipments
        .filter((s: { status: string }) => s.status === 'PENDING')
        .slice(0, 15)
        .map((s: { id: string; date: string; items: { farmer: { name: string }; agent: { name: string }; totalPieces: number; totalFee: number }[]; user: { username: string } }) => {
          const hoursAgo = Math.floor((Date.now() - new Date(s.date).getTime()) / (1000 * 60 * 60));
          const firstItem = s.items?.[0];
          return {
            id: s.id,
            date: s.date,
            farmerName: firstItem?.farmer?.name || 'غير معروف',
            agentName: firstItem?.agent?.name || 'غير معروف',
            totalPieces: s.items?.reduce((sum: number, i: { totalPieces: number }) => sum + (i.totalPieces || 0), 0) || 0,
            totalFee: s.items?.reduce((sum: number, i: { totalFee: number }) => sum + (i.totalFee || 0), 0) || 0,
            hoursAgo,
          };
        });
      setPendingShipments(pending);

      // المزارعين الذين أرسلوا اليوم
      const farmerMap = new Map<string, TodayFarmer>();
      todayShipments.forEach((s: { items: { farmer: { id: string; name: string }; agent: { name: string }; totalPieces: number; totalFee: number }[]; user: { username: string } }) => {
        s.items?.forEach((item: { farmer: { id: string; name: string }; agent: { name: string }; totalPieces: number; totalFee: number }) => {
          const farmerId = item.farmer?.id;
          if (!farmerMap.has(farmerId)) {
            farmerMap.set(farmerId, {
              id: farmerId,
              name: item.farmer?.name || 'غير معروف',
              totalPieces: 0,
              totalFee: 0,
              shipmentsCount: 0,
              agents: [],
              receivedBy: s.user?.username || 'غير معروف',
            });
          }
          const farmer = farmerMap.get(farmerId)!;
          farmer.totalPieces += item.totalPieces || 0;
          farmer.totalFee += item.totalFee || 0;
          farmer.shipmentsCount += 1;
          if (item.agent?.name && !farmer.agents.includes(item.agent.name)) {
            farmer.agents.push(item.agent.name);
          }
        });
      });
      setTodayFarmers(Array.from(farmerMap.values()).sort((a, b) => b.totalPieces - a.totalPieces));

      // الأنشطة
      const activities: Activity[] = [];
      todayShipments.slice(0, 10).forEach((s: { id: string; date: string; items: { farmer: { name: string }; agent: { name: string }; totalPieces: number }[]; status: string; user: { username: string } }) => {
        activities.push({
          id: s.id,
          type: s.status === 'DELIVERED' ? 'SHIPMENT_DELIVERED' : 'SHIPMENT_CREATED',
          description: `شحنة من ${s.items?.[0]?.farmer?.name || 'غير معروف'} إلى ${s.items?.[0]?.agent?.name || 'غير معروف'}`,
          userName: s.user?.username || 'غير معروف',
          date: s.date,
          details: `${s.items?.reduce((sum: number, i: { totalPieces: number }) => sum + (i.totalPieces || 0), 0) || 0} حبة`,
        });
      });

      todayExpenses.slice(0, 5).forEach((e: { id: string; description: string; amount: number; date: string }) => {
        activities.push({
          id: e.id,
          type: 'EXPENSE',
          description: `مصروف: ${e.description}`,
          userName: 'النظام',
          date: e.date,
          details: `${e.amount} ريال`,
        });
      });

      setRecentActivities(activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20));

      // التنبيهات
      const alertsList: { type: 'warning' | 'error' | 'info'; message: string; action?: string }[] = [];

      const oldPending = pending.filter((p: PendingShipment) => p.hoursAgo > 6);
      if (oldPending.length > 0) {
        alertsList.push({
          type: 'warning',
          message: `${oldPending.length} شحنات معلقة لأكثر من 6 ساعات`,
          action: '/dashboard/shipments',
        });
      }

      const highDebtAgents = agents.filter((a: { balance: number }) => a.balance > 50000);
      if (highDebtAgents.length > 0) {
        alertsList.push({
          type: 'error',
          message: `${highDebtAgents.length} وكلاء بديون تتجاوز 50,000 ريال`,
          action: '/dashboard/accounts',
        });
      }

      if (totalExpenses > totalFee * 0.5 && totalFee > 0) {
        alertsList.push({
          type: 'warning',
          message: `المصاريف اليوم تمثل أكثر من 50% من الأجور`,
        });
      }

      setAlerts(alertsList);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'SHIPMENT_CREATED':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'SHIPMENT_DELIVERED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PAYMENT':
        return <DollarSign className="h-4 w-4 text-purple-600" />;
      case 'EXPENSE':
        return <DollarSign className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4" />;
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
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">لوحة مراقبة المدير</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                مراقبة شاملة لجميع العمليات في الوقت الفعلي
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

        {/* التنبيهات */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <Card key={index} className={`border-r-4 ${
                alert.type === 'error' ? 'border-r-red-500 bg-red-50 dark:bg-red-950' :
                alert.type === 'warning' ? 'border-r-amber-500 bg-amber-50 dark:bg-amber-950' :
                'border-r-blue-500 bg-blue-50 dark:bg-blue-950'
              }`}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${
                      alert.type === 'error' ? 'text-red-600' :
                      alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                    }`} />
                    <span className="text-sm font-medium">{alert.message}</span>
                  </div>
                  {alert.action && (
                    <Link href={alert.action} className="text-xs text-emerald-600 hover:underline">
                      عرض
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* إحصائيات اليوم */}
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              ملخص اليوم - {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold">{todayStats.shipmentsCreated}</p>
                <p className="text-xs sm:text-sm opacity-80">شحنة جديدة</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-green-200">{todayStats.shipmentsDelivered}</p>
                <p className="text-xs sm:text-sm opacity-80">تم التسليم</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold">{todayStats.totalPieces.toLocaleString('ar-YE')}</p>
                <p className="text-xs sm:text-sm opacity-80">حبة</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-green-200">{formatCurrency(todayStats.totalFee)}</p>
                <p className="text-xs sm:text-sm opacity-80">أجور</p>
              </div>
              <div className="text-center col-span-2 sm:col-span-1">
                <p className="text-2xl sm:text-3xl font-bold text-red-200">{formatCurrency(todayStats.totalExpenses)}</p>
                <p className="text-xs sm:text-sm opacity-80">مصاريف</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* المحتوى الرئيسي */}
        <Tabs defaultValue="farmers" className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-1">
            <TabsTrigger value="farmers" className="text-xs sm:text-sm">المزارعين اليوم</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">الشحنات المعلقة</TabsTrigger>
            <TabsTrigger value="activities" className="text-xs sm:text-sm">سجل النشاطات</TabsTrigger>
          </TabsList>

          {/* المزارعين الذين أرسلوا اليوم */}
          <TabsContent value="farmers" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="h-5 w-5 text-emerald-600" />
                  المزارعين الذين أرسلوا اليوم ({todayFarmers.length})
                </CardTitle>
                <CardDescription>تفاصيل كل مزارع وكم أرسل ومن استلم منه القات والمستخدم المسؤول</CardDescription>
              </CardHeader>
              <CardContent>
                {todayFarmers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد شحنات اليوم</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {todayFarmers.map((farmer, index) => (
                      <div
                        key={farmer.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors gap-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index < 3 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-muted'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{farmer.name}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{farmer.shipmentsCount} شحنة</span>
                              <span>•</span>
                              <span>إلى: {farmer.agents.slice(0, 2).join('، ')}{farmer.agents.length > 2 && '...'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-blue-600" />
                            <span className="font-bold">{farmer.totalPieces.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">حبة</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-amber-600" />
                            <span className="font-bold text-amber-600">{formatCurrency(farmer.totalFee)}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            <User className="h-3 w-3 ml-1" />
                            أدخل: {farmer.receivedBy}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* الشحنات المعلقة */}
          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                  الشحنات المعلقة ({pendingShipments.length})
                </CardTitle>
                <CardDescription>الشحنات التي لم يتم تأكيد تسليمها بعد - مرتبة حسب الوقت</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingShipments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>جميع الشحنات تم تسليمها ✅</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {pendingShipments.map((shipment) => (
                      <div
                        key={shipment.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg gap-2 ${
                          shipment.hoursAgo > 6 ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800' :
                          shipment.hoursAgo > 3 ? 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800' :
                          'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            shipment.hoursAgo > 6 ? 'bg-red-100 text-red-600' :
                            shipment.hoursAgo > 3 ? 'bg-amber-100 text-amber-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            <Clock className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {shipment.farmerName} → {shipment.agentName}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{shipment.totalPieces} حبة</span>
                              <span>•</span>
                              <span>{formatTime(shipment.date)}</span>
                              <span>•</span>
                              <span className={shipment.hoursAgo > 6 ? 'text-red-600 font-medium' : ''}>
                                قبل {shipment.hoursAgo} ساعة
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-600 text-sm">{formatCurrency(shipment.totalFee)}</span>
                          <Link href="/dashboard/shipments">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8">
                              تأكيد
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* سجل النشاطات */}
          <TabsContent value="activities" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                  آخر النشاطات
                </CardTitle>
                <CardDescription>سجل جميع العمليات التي تمت اليوم مع المستخدم المسؤول</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد نشاطات اليوم</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {recentActivities.map((activity) => (
                      <div
                        key={`${activity.id}-${activity.date}`}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{activity.description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{activity.details}</span>
                              <span>•</span>
                              <span>بواسطة: {activity.userName}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(activity.date)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* اختصارات سريعة */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <Link href="/dashboard/shipments">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300">
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">الشحنات</p>
                  <p className="text-xs text-muted-foreground">إدارة وتتبع</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/reports">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-emerald-300">
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">التقارير</p>
                  <p className="text-xs text-muted-foreground">تقارير شاملة</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/accounts">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-purple-300">
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">الحسابات</p>
                  <p className="text-xs text-muted-foreground">إدارة الديون</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/profits">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-amber-300">
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">الأرباح</p>
                  <p className="text-xs text-muted-foreground">تحليل مالي</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
