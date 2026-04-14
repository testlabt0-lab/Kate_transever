'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart,
  Printer,
  FileDown,
  Download,
  RefreshCw,
  Filter,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';

interface User {
  id: string;
  username: string;
  role: string;
}

interface Shipment {
  id: string;
  date: string;
  items: {
    farmer: { name: string };
    agent: { name: string };
    totalPieces: number;
    totalFee: number;
    khatDetails: { pieces: number; totalFee: number; khatType: { name: string } }[];
  }[];
  status: string;
}

interface ProfitStats {
  totalProfits: number;
  totalExpenses: number;
  netProfit: number;
  totalPieces: number;
  shipmentsCount: number;
  deliveredCount: number;
  pendingCount: number;
  averagePerShipment: number;
  profitMargin: number;
  growthRate: number;
  monthlyData: { month: string; profits: number; expenses: number; net: number; shipments: number }[];
  weeklyData: { week: string; profits: number; expenses: number; net: number }[];
  categoryData: { name: string; value: number; color: string }[];
  profitByAgent: { name: string; profit: number; shipments: number; percentage: number }[];
  profitByFarmer: { name: string; profit: number; shipments: number; percentage: number }[];
  profitByShipment: { id: string; date: string; profit: number; farmer: string; agent: string; pieces: number }[];
  comparisonData: {
    currentPeriod: { profits: number; expenses: number; net: number; shipments: number };
    previousPeriod: { profits: number; expenses: number; net: number; shipments: number };
    changes: { profits: number; expenses: number; net: number; shipments: number };
  };
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function ProfitsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [compareWith, setCompareWith] = useState<'previous' | 'year'>('previous');
  const [stats, setStats] = useState<ProfitStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'shipments' | 'agents' | 'farmers' | 'comparison'>('overview');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');

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

  // تحميل البيانات
  const loadData = useCallback(async () => {
    try {
      const [shipmentsRes, expensesRes] = await Promise.all([
        fetch('/api/shipments'),
        fetch('/api/expenses'),
      ]);

      const shipmentsData = await shipmentsRes.json();
      const expensesData = await expensesRes.json();

      const shipments: Shipment[] = shipmentsData.shipments || [];
      const expenses = expensesData.expenses || [];

      // حساب الفترة الزمنية
      const now = new Date();
      let startDate: Date;
      let previousStartDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        case 'quarter':
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterMonth, 1);
          previousStartDate = new Date(now.getFullYear(), quarterMonth - 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
          break;
      }

      // حساب الإجماليات
      let totalPieces = 0;
      let totalCommission = 0;

      shipments.forEach(s => {
        s.items?.forEach(item => {
          totalPieces += item.totalPieces || 0;
          totalCommission += item.totalFee || 0;
          item.khatDetails?.forEach(kd => {
            if (!item.totalPieces) totalPieces += kd.pieces;
            if (!item.totalFee) totalCommission += kd.totalFee;
          });
        });
      });

      const totalExpensesAmount = expenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);
      const netProfit = totalCommission - totalExpensesAmount;

      // عدد الشحنات حسب الحالة
      const deliveredCount = shipments.filter(s => s.status === 'DELIVERED').length;
      const pendingCount = shipments.filter(s => s.status === 'PENDING').length;

      // بيانات الأشهر (6 أشهر الماضية)
      const currentMonth = new Date().getMonth();
      const monthlyData = [];

      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const yearOffset = currentMonth - i < 0 ? -1 : 0;
        const year = new Date().getFullYear() + yearOffset;

        const monthShipments = shipments.filter(s => {
          const date = new Date(s.date);
          return date.getMonth() === monthIndex && date.getFullYear() === year;
        });

        let monthProfit = 0;
        let shipmentCount = 0;

        monthShipments.forEach(s => {
          shipmentCount++;
          s.items?.forEach(item => {
            monthProfit += item.totalFee || 0;
            item.khatDetails?.forEach(kd => {
              if (!item.totalFee) monthProfit += kd.totalFee;
            });
          });
        });

        const monthExpense = expenses
          .filter((e: { date: string }) => {
            const date = new Date(e.date);
            return date.getMonth() === monthIndex && date.getFullYear() === year;
          })
          .reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);

        monthlyData.push({
          month: ARABIC_MONTHS[monthIndex],
          profits: monthProfit,
          expenses: monthExpense,
          net: monthProfit - monthExpense,
          shipments: shipmentCount,
        });
      }

      // بيانات الأسابيع (4 أسابيع)
      const weeklyData = [];
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

        const weekShipments = shipments.filter(s => {
          const date = new Date(s.date);
          return date >= weekStart && date < weekEnd;
        });

        let weekProfit = 0;
        weekShipments.forEach(s => {
          s.items?.forEach(item => {
            weekProfit += item.totalFee || 0;
            item.khatDetails?.forEach(kd => {
              if (!item.totalFee) weekProfit += kd.totalFee;
            });
          });
        });

        const weekExpense = expenses
          .filter((e: { date: string }) => {
            const date = new Date(e.date);
            return date >= weekStart && date < weekEnd;
          })
          .reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);

        weeklyData.push({
          week: `الأسبوع ${4 - i}`,
          profits: weekProfit,
          expenses: weekExpense,
          net: weekProfit - weekExpense,
        });
      }

      // بيانات الفئات
      const categoryData = [
        { name: 'أجور التوصيل', value: totalCommission, color: '#10b981' },
        { name: 'المصاريف', value: totalExpensesAmount, color: '#ef4444' },
      ];

      // الأرباح حسب الوكيل
      const profitByAgentMap = new Map<string, { profit: number; shipments: number }>();
      shipments.forEach(s => {
        s.items?.forEach(item => {
          const agentName = item.agent?.name || 'غير معروف';
          const current = profitByAgentMap.get(agentName) || { profit: 0, shipments: 0 };
          let itemProfit = item.totalFee || 0;
          if (!item.totalFee) {
            item.khatDetails?.forEach(kd => {
              itemProfit += kd.totalFee;
            });
          }
          profitByAgentMap.set(agentName, {
            profit: current.profit + itemProfit,
            shipments: current.shipments + 1,
          });
        });
      });

      const profitByAgent = Array.from(profitByAgentMap.entries())
        .map(([name, data]) => ({
          name,
          profit: data.profit,
          shipments: data.shipments,
          percentage: totalCommission > 0 ? Math.round((data.profit / totalCommission) * 100) : 0
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10);

      // الأرباح حسب المزارع
      const profitByFarmerMap = new Map<string, { profit: number; shipments: number }>();
      shipments.forEach(s => {
        s.items?.forEach(item => {
          const farmerName = item.farmer?.name || 'غير معروف';
          const current = profitByFarmerMap.get(farmerName) || { profit: 0, shipments: 0 };
          let itemProfit = item.totalFee || 0;
          if (!item.totalFee) {
            item.khatDetails?.forEach(kd => {
              itemProfit += kd.totalFee;
            });
          }
          profitByFarmerMap.set(farmerName, {
            profit: current.profit + itemProfit,
            shipments: current.shipments + 1,
          });
        });
      });

      const profitByFarmer = Array.from(profitByFarmerMap.entries())
        .map(([name, data]) => ({
          name,
          profit: data.profit,
          shipments: data.shipments,
          percentage: totalCommission > 0 ? Math.round((data.profit / totalCommission) * 100) : 0
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10);

      // الأرباح حسب الشحنة
      const profitByShipment = shipments
        .slice(0, 20)
        .map(s => {
          let profit = 0;
          let pieces = 0;
          let farmerNames: string[] = [];
          let agentNames: string[] = [];

          s.items?.forEach(item => {
            profit += item.totalFee || 0;
            pieces += item.totalPieces || 0;
            if (item.farmer?.name) farmerNames.push(item.farmer.name);
            if (item.agent?.name) agentNames.push(item.agent.name);
            item.khatDetails?.forEach(kd => {
              if (!item.totalFee) profit += kd.totalFee;
              if (!item.totalPieces) pieces += kd.pieces;
            });
          });

          return {
            id: s.id.slice(0, 8),
            date: new Date(s.date).toLocaleDateString('ar-SA'),
            profit,
            farmer: [...new Set(farmerNames)].join('، ') || 'غير معروف',
            agent: [...new Set(agentNames)].join('، ') || 'غير معروف',
            pieces,
          };
        });

      // بيانات المقارنة
      const currentPeriodShipments = shipments.filter(s => new Date(s.date) >= startDate);
      const previousPeriodShipments = shipments.filter(s => {
        const date = new Date(s.date);
        return date >= previousStartDate && date < startDate;
      });

      const currentProfits = currentPeriodShipments.reduce((sum, s) => {
        return sum + s.items.reduce((itemSum, item) => {
          let fee = item.totalFee || 0;
          if (!item.totalFee) {
            item.khatDetails?.forEach(kd => fee += kd.totalFee);
          }
          return itemSum + fee;
        }, 0);
      }, 0);

      const previousProfits = previousPeriodShipments.reduce((sum, s) => {
        return sum + s.items.reduce((itemSum, item) => {
          let fee = item.totalFee || 0;
          if (!item.totalFee) {
            item.khatDetails?.forEach(kd => fee += kd.totalFee);
          }
          return itemSum + fee;
        }, 0);
      }, 0);

      const currentExpenses = expenses
        .filter((e: { date: string }) => new Date(e.date) >= startDate)
        .reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);

      const previousExpenses = expenses
        .filter((e: { date: string }) => {
          const date = new Date(e.date);
          return date >= previousStartDate && date < startDate;
        })
        .reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);

      const comparisonData = {
        currentPeriod: {
          profits: currentProfits,
          expenses: currentExpenses,
          net: currentProfits - currentExpenses,
          shipments: currentPeriodShipments.length,
        },
        previousPeriod: {
          profits: previousProfits,
          expenses: previousExpenses,
          net: previousProfits - previousExpenses,
          shipments: previousPeriodShipments.length,
        },
        changes: {
          profits: previousProfits > 0 ? Math.round(((currentProfits - previousProfits) / previousProfits) * 100) : 0,
          expenses: previousExpenses > 0 ? Math.round(((currentExpenses - previousExpenses) / previousExpenses) * 100) : 0,
          net: previousProfits - previousExpenses !== 0 ? Math.round((((currentProfits - currentExpenses) - (previousProfits - previousExpenses)) / Math.abs(previousProfits - previousExpenses)) * 100) : 0,
          shipments: previousPeriodShipments.length > 0 ? Math.round(((currentPeriodShipments.length - previousPeriodShipments.length) / previousPeriodShipments.length) * 100) : 0,
        },
      };

      // حساب معدل النمو
      const growthRate = monthlyData.length >= 2
        ? Math.round(((monthlyData[monthlyData.length - 1].net - monthlyData[monthlyData.length - 2].net) / Math.abs(monthlyData[monthlyData.length - 2].net || 1)) * 100)
        : 0;

      setStats({
        totalProfits: totalCommission,
        totalExpenses: totalExpensesAmount,
        netProfit,
        totalPieces,
        shipmentsCount: shipments.length,
        deliveredCount,
        pendingCount,
        averagePerShipment: shipments.length > 0 ? totalCommission / shipments.length : 0,
        profitMargin: totalCommission > 0 ? Math.round((netProfit / totalCommission) * 100) : 0,
        growthRate,
        monthlyData,
        weeklyData,
        categoryData,
        profitByAgent,
        profitByFarmer,
        profitByShipment,
        comparisonData,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

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

  // تنسيق العملة
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-YE').format(amount) + ' ريال';
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

  // طباعة التقرير
  const handlePrint = () => {
    window.print();
  };

  // تصدير التقرير
  const handleExport = () => {
    if (!stats) return;

    const reportContent = `
تقرير الأرباح والتحليلات
========================
تاريخ التقرير: ${formatDateTime(new Date().toISOString())}

ملخص الأداء المالي
-----------------
صافي الربح: ${formatCurrency(stats.netProfit)}
إجمالي الأجور: ${formatCurrency(stats.totalProfits)}
إجمالي المصاريف: ${formatCurrency(stats.totalExpenses)}
هامش الربح: ${stats.profitMargin}%
معدل النمو: ${stats.growthRate}%

إحصائيات الشحنات
----------------
إجمالي الشحنات: ${stats.shipmentsCount}
شحنات مُسلّمة: ${stats.deliveredCount}
شحنات قيد التوصيل: ${stats.pendingCount}
إجمالي الحبات: ${stats.totalPieces?.toLocaleString('ar-YE') || 0}
متوسط الأجرة/شحنة: ${formatCurrency(stats.averagePerShipment)}

أعلى الوكلاء ربحية
------------------
${stats.profitByAgent.slice(0, 5).map((a, i) => `${i + 1}. ${a.name}: ${formatCurrency(a.profit)} (${a.percentage}%)`).join('\n')}

أعلى المزارعين ربحية
--------------------
${stats.profitByFarmer.slice(0, 5).map((f, i) => `${i + 1}. ${f.name}: ${formatCurrency(f.profit)} (${f.percentage}%)`).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_الأرباح_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <DashboardLayout
        userRole={user.role as 'ADMIN' | 'WORKER'}
        username={user.username}
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </DashboardLayout>
    );
  }

  const renderChart = (data: typeof stats.monthlyData, dataKey: string, name: string, color: string) => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="month" tick={{ fill: 'currentColor', fontSize: 12 }} />
            <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [formatCurrency(value), '']}
            />
            <Legend />
            <Line type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={3} dot={{ fill: color, strokeWidth: 2 }} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="month" tick={{ fill: 'currentColor', fontSize: 12 }} />
            <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [formatCurrency(value), '']}
            />
            <Legend />
            <Area type="monotone" dataKey={dataKey} name={name} stroke={color} fill={color} fillOpacity={0.3} />
          </AreaChart>
        );
      default:
        return (
          <RechartsBarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="month" tick={{ fill: 'currentColor', fontSize: 12 }} />
            <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [formatCurrency(value), '']}
            />
            <Legend />
            <Bar dataKey={dataKey} name={name} fill={color} radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        );
    }
  };

  return (
    <DashboardLayout
      userRole={user.role as 'ADMIN' | 'WORKER'}
      username={user.username}
      onLogout={handleLogout}
    >
      <div className="space-y-4 sm:space-y-6" id="print-content">
        {/* العنوان */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">الأرباح والتحليلات</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              نظرة شاملة على الأداء المالي وتحليل الأرباح
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger className="w-full sm:w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">هذا الأسبوع</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
                <SelectItem value="quarter">هذا الربع</SelectItem>
                <SelectItem value="year">هذا العام</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadData} title="تحديث">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExport} title="تصدير">
              <FileDown className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handlePrint} title="طباعة">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* تبويبات التنقل */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-print">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap ${activeTab === 'overview' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          >
            <BarChart className="h-4 w-4 ml-2" />
            نظرة عامة
          </Button>
          <Button
            variant={activeTab === 'comparison' ? 'default' : 'outline'}
            onClick={() => setActiveTab('comparison')}
            className={`whitespace-nowrap ${activeTab === 'comparison' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          >
            <TrendingUp className="h-4 w-4 ml-2" />
            مقارنة الفترات
          </Button>
          <Button
            variant={activeTab === 'shipments' ? 'default' : 'outline'}
            onClick={() => setActiveTab('shipments')}
            className={`whitespace-nowrap ${activeTab === 'shipments' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          >
            <Package className="h-4 w-4 ml-2" />
            حسب الشحنات
          </Button>
          <Button
            variant={activeTab === 'agents' ? 'default' : 'outline'}
            onClick={() => setActiveTab('agents')}
            className={`whitespace-nowrap ${activeTab === 'agents' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          >
            <Users className="h-4 w-4 ml-2" />
            حسب الوكلاء
          </Button>
          <Button
            variant={activeTab === 'farmers' ? 'default' : 'outline'}
            onClick={() => setActiveTab('farmers')}
            className={`whitespace-nowrap ${activeTab === 'farmers' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          >
            <TrendingUp className="h-4 w-4 ml-2" />
            حسب المزارع
          </Button>
        </div>

        {/* البطاقات الإحصائية */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">صافي الربح</p>
                  <p className={`text-lg sm:text-2xl font-bold mt-1 ${stats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(stats.netProfit))}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {stats.growthRate >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-600" />
                    )}
                    <span className={`text-xs ${stats.growthRate >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {Math.abs(stats.growthRate)}%
                    </span>
                  </div>
                </div>
                <div className={`p-2 sm:p-3 rounded-full ${stats.netProfit >= 0 ? 'bg-emerald-200 dark:bg-emerald-800' : 'bg-red-200 dark:bg-red-800'}`}>
                  {stats.netProfit >= 0 ? (
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">إجمالي الأجور</p>
                  <p className="text-lg sm:text-2xl font-bold mt-1 text-green-700">
                    {formatCurrency(stats.totalProfits)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    من {stats.shipmentsCount} شحنة
                  </p>
                </div>
                <div className="p-2 sm:p-3 rounded-full bg-green-200 dark:bg-green-800">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">إجمالي المصاريف</p>
                  <p className="text-lg sm:text-2xl font-bold mt-1 text-red-700">
                    {formatCurrency(stats.totalExpenses)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    مصاريف تشغيلية
                  </p>
                </div>
                <div className="p-2 sm:p-3 rounded-full bg-red-200 dark:bg-red-800">
                  <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">إجمالي الحبات</p>
                  <p className="text-lg sm:text-2xl font-bold mt-1 text-blue-700">
                    {stats.totalPieces?.toLocaleString('ar-YE') || 0}
                  </p>
                  <div className="flex gap-2 text-xs mt-1">
                    <span className="text-green-600">{stats.deliveredCount} مُسلّمة</span>
                    <span className="text-amber-600">{stats.pendingCount} قيد التوصيل</span>
                  </div>
                </div>
                <div className="p-2 sm:p-3 rounded-full bg-blue-200 dark:bg-blue-800">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* محتوى التبويبات */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* أزرار نوع الرسم البياني */}
            <div className="flex gap-2 no-print">
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
                className={chartType === 'bar' ? 'bg-emerald-600' : ''}
              >
                <BarChart className="h-4 w-4 ml-1" />
                أعمدة
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
                className={chartType === 'line' ? 'bg-emerald-600' : ''}
              >
                <TrendingUp className="h-4 w-4 ml-1" />
                خطي
              </Button>
              <Button
                variant={chartType === 'area' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('area')}
                className={chartType === 'area' ? 'bg-emerald-600' : ''}
              >
                <TrendingUp className="h-4 w-4 ml-1" />
                مساحة
              </Button>
            </div>

            {/* الرسوم البيانية */}
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
              {/* رسم بياني للأرباح والمصاريف */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-emerald-600" />
                    مقارنة الأرباح والمصاريف
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={stats.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="month" tick={{ fill: 'currentColor', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [formatCurrency(value), '']}
                        />
                        <Legend />
                        <Bar dataKey="profits" name="الأرباح" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" name="المصاريف" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* رسم بياني دائري */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    توزيع الإيرادات والمصروفات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stats.categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* رسم بياني خطي للصافي */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  تطور صافي الربح
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={stats.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" tick={{ fill: 'currentColor', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [formatCurrency(value), '']}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="profits" name="الأرباح" fill="#10b981" fillOpacity={0.1} stroke="none" />
                      <Area type="monotone" dataKey="expenses" name="المصاريف" fill="#ef4444" fillOpacity={0.1} stroke="none" />
                      <Line type="monotone" dataKey="net" name="صافي الربح" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ملخص الأداء */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">ملخص الأداء المالي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">نسبة الربح</p>
                      <p className="text-lg font-bold text-green-600">
                        {stats.totalExpenses > 0
                          ? ((stats.netProfit / stats.totalExpenses) * 100).toFixed(1)
                          : '100'}
                        %
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">متوسط الأجرة/شحنة</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(stats.averagePerShipment)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                      <BarChart className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">هامش الربح</p>
                      <p className="text-lg font-bold text-purple-600">
                        {stats.profitMargin}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-full">
                      <Package className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">نسبة التسليم</p>
                      <p className="text-lg font-bold text-amber-600">
                        {stats.shipmentsCount > 0
                          ? ((stats.deliveredCount / stats.shipmentsCount) * 100).toFixed(1)
                          : '0'}
                        %
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'comparison' && (
          <div className="space-y-4 sm:space-y-6">
            {/* مقارنة الفترات */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* الفترة الحالية */}
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-emerald-600" />
                    الفترة الحالية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">الأرباح</span>
                    <span className="font-bold text-lg">{formatCurrency(stats.comparisonData.currentPeriod.profits)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">المصاريف</span>
                    <span className="font-bold text-lg">{formatCurrency(stats.comparisonData.currentPeriod.expenses)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-bold">صافي الربح</span>
                    <span className="font-bold text-lg text-emerald-600">{formatCurrency(stats.comparisonData.currentPeriod.net)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">عدد الشحنات</span>
                    <Badge className="bg-emerald-200 text-emerald-700">{stats.comparisonData.currentPeriod.shipments}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* الفترة السابقة */}
              <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    الفترة السابقة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">الأرباح</span>
                    <span className="font-bold text-lg">{formatCurrency(stats.comparisonData.previousPeriod.profits)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">المصاريف</span>
                    <span className="font-bold text-lg">{formatCurrency(stats.comparisonData.previousPeriod.expenses)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-bold">صافي الربح</span>
                    <span className="font-bold text-lg">{formatCurrency(stats.comparisonData.previousPeriod.net)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">عدد الشحنات</span>
                    <Badge variant="outline">{stats.comparisonData.previousPeriod.shipments}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* نسب التغير */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">نسب التغير</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <div className={`p-2 rounded-full ${stats.comparisonData.changes.profits >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                      {stats.comparisonData.changes.profits >= 0 ? (
                        <ArrowUpRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">تغير الأرباح</p>
                      <p className={`text-lg font-bold ${stats.comparisonData.changes.profits >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.comparisonData.changes.profits >= 0 ? '+' : ''}{stats.comparisonData.changes.profits}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <div className={`p-2 rounded-full ${stats.comparisonData.changes.expenses <= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                      {stats.comparisonData.changes.expenses <= 0 ? (
                        <ArrowDownRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">تغير المصاريف</p>
                      <p className={`text-lg font-bold ${stats.comparisonData.changes.expenses <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.comparisonData.changes.expenses >= 0 ? '+' : ''}{stats.comparisonData.changes.expenses}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <div className={`p-2 rounded-full ${stats.comparisonData.changes.net >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                      {stats.comparisonData.changes.net >= 0 ? (
                        <ArrowUpRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">تغير صافي الربح</p>
                      <p className={`text-lg font-bold ${stats.comparisonData.changes.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.comparisonData.changes.net >= 0 ? '+' : ''}{stats.comparisonData.changes.net}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <div className={`p-2 rounded-full ${stats.comparisonData.changes.shipments >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                      {stats.comparisonData.changes.shipments >= 0 ? (
                        <ArrowUpRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">تغير الشحنات</p>
                      <p className={`text-lg font-bold ${stats.comparisonData.changes.shipments >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.comparisonData.changes.shipments >= 0 ? '+' : ''}{stats.comparisonData.changes.shipments}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* رسم بياني للمقارنة */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">مقارنة الأداء الشهري</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={stats.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" tick={{ fill: 'currentColor', fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fill: 'currentColor', fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'currentColor', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string) => [
                          name === 'shipments' ? value : formatCurrency(value),
                          name === 'shipments' ? 'شحنة' : name
                        ]}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="profits" name="الأرباح" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="expenses" name="المصاريف" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="shipments" name="الشحنات" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'shipments' && (
          <div className="space-y-4">
            {/* أعلى الشحنات ربحية */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-emerald-600" />
                  أعلى الشحنات ربحية
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.profitByShipment.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد شحنات</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pe-1">
                    {stats.profitByShipment.map((shipment, index) => (
                      <div
                        key={shipment.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index < 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-muted'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">شحنة #{shipment.id}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{shipment.date}</span>
                              <span>•</span>
                              <span>{shipment.pieces} حبة</span>
                              <span>•</span>
                              <span>{shipment.farmer}</span>
                              <span>→</span>
                              <span>{shipment.agent}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-green-600">{formatCurrency(shipment.profit)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="space-y-4">
            {/* رسم بياني للوكلاء */}
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-600" />
                    الأرباح حسب الوكيل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={stats.profitByAgent.slice(0, 6)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" tick={{ fill: 'currentColor', fontSize: 12 }} width={80} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [formatCurrency(value), '']}
                        />
                        <Bar dataKey="profit" name="الربح" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-emerald-600" />
                    عدد الشحنات حسب الوكيل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={stats.profitByAgent.slice(0, 6)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" tick={{ fill: 'currentColor', fontSize: 12 }} width={80} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="shipments" name="الشحنات" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* جدول الوكلاء */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">تفاصيل أرباح الوكلاء</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.profitByAgent.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد بيانات وكلاء</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pe-1">
                    {stats.profitByAgent.map((agent, index) => (
                      <div
                        key={agent.name}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index < 3 ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 'bg-muted'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{agent.name}</p>
                            <p className="text-xs text-muted-foreground">{agent.shipments} شحنة</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-green-600">{formatCurrency(agent.profit)}</p>
                          <p className="text-xs text-muted-foreground">
                            {agent.percentage}% من الإجمالي
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'farmers' && (
          <div className="space-y-4">
            {/* رسم بياني للمزارعين */}
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    الأرباح حسب المزارع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={stats.profitByFarmer.slice(0, 6)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" tick={{ fill: 'currentColor', fontSize: 12 }} width={80} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [formatCurrency(value), '']}
                        />
                        <Bar dataKey="profit" name="الربح" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-emerald-600" />
                    عدد الشحنات حسب المزارع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={stats.profitByFarmer.slice(0, 6)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" tick={{ fill: 'currentColor', fontSize: 12 }} width={80} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="shipments" name="الشحنات" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* جدول المزارعين */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">تفاصيل أرباح المزارعين</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.profitByFarmer.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد بيانات مزارعين</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pe-1">
                    {stats.profitByFarmer.map((farmer, index) => (
                      <div
                        key={farmer.name}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index < 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-muted'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{farmer.name}</p>
                            <p className="text-xs text-muted-foreground">{farmer.shipments} شحنة</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-green-600">{formatCurrency(farmer.profit)}</p>
                          <p className="text-xs text-muted-foreground">
                            {farmer.percentage}% من الإجمالي
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* أنماط الطباعة */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
