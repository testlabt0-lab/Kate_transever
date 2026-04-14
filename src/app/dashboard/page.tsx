'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Truck,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ChevronLeft,
  UserX,
  CheckCircle,
  XCircle,
  Wallet,
  Leaf,
  Timer,
  Bell,
} from 'lucide-react';
import Link from 'next/link';
import { TimersWidget } from '@/components/timers-widget';
import { RemindersWidget } from '@/components/reminders-widget';

// أنواع البيانات
interface User {
  id: string;
  username: string;
  role: string;
}

interface TodayStats {
  shipmentsCount: number;
  totalPieces: number;
  totalFee: number;
  expenses: number;
  netProfit: number;
  deliveredCount: number;
}

interface Farmer {
  id: string;
  name: string;
  fullName: string | null;
  phone: string | null;
}

interface PendingShipment {
  id: string;
  date: string;
  createdAt: string;
  notes: string | null;
  items: {
    id: string;
    farmerName: string;
    agentName: string;
    totalPieces: number;
    totalFee: number;
    khatTypes: { name: string; pieces: number }[];
  }[];
  createdBy: string | null;
}

interface RecentShipment {
  id: string;
  date: string;
  status: string;
  createdAt: string;
  notes: string | null;
  items: {
    id: string;
    farmerName: string;
    agentName: string;
    totalPieces: number;
    totalFee: number;
    deliveryStatus: string;
  }[];
  createdBy: string | null;
}

interface Agent {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  shipmentsCount: number;
}

interface GeneralStats {
  totalFarmers: number;
  totalAgents: number;
  totalTransporters: number;
  totalShipments: number;
  totalExpenses: number;
  totalAgentDebts: number;
  pendingShipmentsCount: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // البيانات
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [farmersWhoDidNotSendToday, setFarmersWhoDidNotSendToday] = useState<Farmer[]>([]);
  const [pendingShipments, setPendingShipments] = useState<PendingShipment[]>([]);
  const [recentShipments, setRecentShipments] = useState<RecentShipment[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null);

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

  // تحميل البيانات
  const loadData = useCallback(async () => {
    try {
      const token = localStorage.getItem('session_token');

      const response = await fetch('/api/dashboard/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();

      setTodayStats(data.todayStats);
      setFarmersWhoDidNotSendToday(data.farmersWhoDidNotSendToday || []);
      setPendingShipments(data.pendingShipments || []);
      setRecentShipments(data.recentShipments || []);
      setAgents(data.agents || []);
      setGeneralStats(data.generalStats);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // تنسيق العملة
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-YE').format(amount) + ' ريال';
  };

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      month: 'short',
      day: 'numeric',
    });
  };

  // تنسيق الوقت
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
        {/* الترحيب والتحديث */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">لوحة الإشراف</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
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

        {/* === قسم 1: بطاقات إحصائية === */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* شحنات اليوم */}
          <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">شحنات اليوم</p>
                  <p className="text-2xl font-bold text-emerald-600">{todayStats?.shipmentsCount || 0}</p>
                </div>
                <div className="p-2 rounded-full bg-emerald-200 dark:bg-emerald-800">
                  <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* حبات اليوم */}
          <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 dark:text-green-300">حبات اليوم</p>
                  <p className="text-2xl font-bold text-green-600">{todayStats?.totalPieces.toLocaleString('ar-YE') || 0}</p>
                </div>
                <div className="p-2 rounded-full bg-green-200 dark:bg-green-800">
                  <Leaf className="h-5 w-5 text-green-600 dark:text-green-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* أجرة اليوم */}
          <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900 border-teal-200 dark:border-teal-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal-700 dark:text-teal-300">أجرة اليوم</p>
                  <p className="text-lg font-bold text-teal-600">{formatCurrency(todayStats?.totalFee || 0)}</p>
                </div>
                <div className="p-2 rounded-full bg-teal-200 dark:bg-teal-800">
                  <DollarSign className="h-5 w-5 text-teal-600 dark:text-teal-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* مصاريف اليوم */}
          <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 dark:text-red-300">مصاريف اليوم</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(todayStats?.expenses || 0)}</p>
                </div>
                <div className="p-2 rounded-full bg-red-200 dark:bg-red-800">
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* صافي الربح */}
          <Card className={`hover:shadow-md transition-shadow ${(todayStats?.netProfit || 0) >= 0 ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800' : 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800'}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${(todayStats?.netProfit || 0) >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                    صافي الربح
                  </p>
                  <p className={`text-lg font-bold ${(todayStats?.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(todayStats?.netProfit || 0))}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${(todayStats?.netProfit || 0) >= 0 ? 'bg-emerald-200 dark:bg-emerald-800' : 'bg-red-200 dark:bg-red-800'}`}>
                  {(todayStats?.netProfit || 0) >= 0 ? (
                    <ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-300" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* شحنات معلقة */}
          <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-300">شحنات معلقة</p>
                  <p className="text-2xl font-bold text-amber-600">{generalStats?.pendingShipmentsCount || 0}</p>
                </div>
                <div className="p-2 rounded-full bg-amber-200 dark:bg-amber-800">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* === قسم 1.5: المؤقتات والتذكيرات والإشعارات === */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <TimersWidget />
          </div>
          <div>
            <RemindersWidget />
          </div>
        </div>

        {/* === قسم 2: المزارعين الذين لم يرسلوا اليوم === */}
        {farmersWhoDidNotSendToday.length > 0 && (
          <Card className="border-r-4 border-r-amber-500 bg-amber-50 dark:bg-amber-950/50">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-amber-200 dark:bg-amber-800">
                    <UserX className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-amber-800 dark:text-amber-200">
                      مزارعين لم يرسلوا اليوم
                    </CardTitle>
                    <CardDescription className="text-amber-600 dark:text-amber-400">
                      {farmersWhoDidNotSendToday.length} مزارع لم يسجلوا شحنات اليوم
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="destructive" className="bg-amber-500">
                  تنبيه
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex flex-wrap gap-2">
                {farmersWhoDidNotSendToday.slice(0, 10).map((farmer) => (
                  <Badge
                    key={farmer.id}
                    variant="outline"
                    className="bg-white dark:bg-gray-800 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 px-3 py-1"
                  >
                    {farmer.name}
                    {farmer.phone && (
                      <span className="text-xs text-muted-foreground mr-1">({farmer.phone})</span>
                    )}
                  </Badge>
                ))}
                {farmersWhoDidNotSendToday.length > 10 && (
                  <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900 border-amber-300 text-amber-700">
                    +{farmersWhoDidNotSendToday.length - 10} آخرين
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* === قسم 3: الشحنات المعلقة وآخر الشحنات === */}
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {/* الشحنات المعلقة */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">الشحنات المعلقة</CardTitle>
                    <CardDescription>بانتظار التسليم</CardDescription>
                  </div>
                </div>
                <Link href="/dashboard/shipments" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                  عرض الكل
                  <ChevronLeft className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {pendingShipments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-500 opacity-50" />
                  <p className="text-sm">لا توجد شحنات معلقة</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {pendingShipments.map((shipment) => {
                    const totalPieces = shipment.items.reduce((sum, item) => sum + item.totalPieces, 0);
                    const totalFee = shipment.items.reduce((sum, item) => sum + item.totalFee, 0);
                    const farmers = [...new Set(shipment.items.map(item => item.farmerName))];
                    const agents = [...new Set(shipment.items.map(item => item.agentName))];

                    return (
                      <div key={shipment.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border-r-2 border-r-amber-500">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{farmers.slice(0, 2).join('، ')}{farmers.length > 2 && '...'}</span>
                              <span className="text-xs text-muted-foreground">→</span>
                              <span className="text-sm">{agents.slice(0, 2).join('، ')}{agents.length > 2 && '...'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{formatDate(shipment.date)}</span>
                              <span>•</span>
                              <span>{totalPieces} حبة</span>
                              <span>•</span>
                              <span className="text-emerald-600 font-medium">{formatCurrency(totalFee)}</span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                            معلقة
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* آخر الشحنات المضافة */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900">
                    <Package className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">آخر الشحنات</CardTitle>
                    <CardDescription>آخر 5 شحنات مضافة</CardDescription>
                  </div>
                </div>
                <Link href="/dashboard/shipments" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                  عرض الكل
                  <ChevronLeft className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {recentShipments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد شحنات</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentShipments.map((shipment) => {
                    const totalPieces = shipment.items.reduce((sum, item) => sum + item.totalPieces, 0);
                    const totalFee = shipment.items.reduce((sum, item) => sum + item.totalFee, 0);
                    const farmers = [...new Set(shipment.items.map(item => item.farmerName))];
                    const agents = [...new Set(shipment.items.map(item => item.agentName))];

                    return (
                      <div key={shipment.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{farmers.slice(0, 2).join('، ')}{farmers.length > 2 && '...'}</span>
                              <span className="text-xs text-muted-foreground">→</span>
                              <span className="text-sm">{agents.slice(0, 2).join('، ')}{agents.length > 2 && '...'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{formatDate(shipment.date)}</span>
                              <span>•</span>
                              <span>{totalPieces} حبة</span>
                              <span>•</span>
                              <span>{formatTime(shipment.createdAt)}</span>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-emerald-600 text-sm">{formatCurrency(totalFee)}</p>
                            <Badge variant={shipment.status === 'DELIVERED' ? 'default' : 'secondary'}
                              className={`text-xs ${shipment.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {shipment.status === 'DELIVERED' ? 'تم التسليم' : 'معلقة'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* === قسم 4: الوكلاء وأرصدتهم === */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">الوكلاء وأرصدتهم</CardTitle>
                  <CardDescription>قائمة الوكلاء مرتبة حسب الرصيد</CardDescription>
                </div>
              </div>
              <Link href="/dashboard/agents" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                إدارة الوكلاء
                <ChevronLeft className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {agents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا يوجد وكلاء</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {agents.slice(0, 9).map((agent) => (
                  <div key={agent.id} className={`p-3 rounded-lg border ${agent.balance > 0 ? 'border-red-200 bg-red-50 dark:bg-red-950/30' : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-full ${agent.balance > 0 ? 'bg-red-100 dark:bg-red-900' : 'bg-emerald-100 dark:bg-emerald-900'}`}>
                          <Wallet className={`h-4 w-4 ${agent.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">{agent.shipmentsCount} شحنة</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`font-bold text-sm ${agent.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {formatCurrency(Math.abs(agent.balance))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {agent.balance > 0 ? 'عليه' : 'له'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {agents.length > 9 && (
                  <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <Link href="/dashboard/agents" className="text-sm text-muted-foreground hover:text-emerald-600">
                      +{agents.length - 9} وكلاء آخرين
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* === قسم 5: إحصائيات عامة === */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900">
                <Users className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">المزارعين</p>
                <p className="text-xl font-bold">{generalStats?.totalFarmers || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الوكلاء</p>
                <p className="text-xl font-bold">{generalStats?.totalAgents || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                <Truck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الناقلين</p>
                <p className="text-xl font-bold">{generalStats?.totalTransporters || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                <Package className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الشحنات</p>
                <p className="text-xl font-bold">{generalStats?.totalShipments || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* === قسم 6: اختصارات سريعة === */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/dashboard/shipment/new">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-emerald-300 h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">شحنة جديدة</p>
                  <p className="text-xs text-muted-foreground">إضافة شحنة</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/expenses">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-red-300 h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 text-red-600">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">مصروف جديد</p>
                  <p className="text-xs text-muted-foreground">إضافة مصروف</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/reports">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-teal-300 h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">التقارير</p>
                  <p className="text-xs text-muted-foreground">عرض التقارير</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/profits">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-green-300 h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">الأرباح</p>
                  <p className="text-xs text-muted-foreground">تحليل الأرباح</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
