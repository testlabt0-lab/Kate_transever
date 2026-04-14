'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Users,
  Leaf,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  FileText,
  Loader2,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  User,
} from 'lucide-react';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { ShipmentsChart } from '@/components/charts/shipments-chart';

// Types
interface User {
  id: string;
  username: string;
  role: string;
}

interface DailyStat {
  date: string;
  pieces: number;
  fees: number;
  shipments: number;
}

interface KhatTypeStat {
  name: string;
  pieces: number;
  fees: number;
  percentage: string | number;
}

interface AgentStat {
  id: string;
  name: string;
  pieces: number;
  fees: number;
  balance: number;
  shipments?: number;
}

interface Summary {
  totalShipments: number;
  totalPieces: number;
  totalFees: number;
  totalExpenses: number;
  netProfit: number;
  totalAgentDebts: number;
  farmerDebts: number;
}

interface AnalyticsData {
  summary: Summary;
  dailyStats: DailyStat[];
  khatTypes: KhatTypeStat[];
  agents: AgentStat[];
  expenses: {
    total: number;
    byCategory: { name: string; value: number }[];
  };
}

// Format helpers
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-YE').format(amount) + ' ريال';
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('ar-YE').format(num);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
};

// Performance Card Component
function PerformanceCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'emerald',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
  color?: 'emerald' | 'blue' | 'purple' | 'amber' | 'red' | 'teal';
}) {
  const colorClasses = {
    emerald: 'from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800',
    blue: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800',
    purple: 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800',
    amber: 'from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800',
    red: 'from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800',
    teal: 'from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900 border-teal-200 dark:border-teal-800',
  };

  const iconBgClasses = {
    emerald: 'bg-emerald-200 dark:bg-emerald-800',
    blue: 'bg-blue-200 dark:bg-blue-800',
    purple: 'bg-purple-200 dark:bg-purple-800',
    amber: 'bg-amber-200 dark:bg-amber-800',
    red: 'bg-red-200 dark:bg-red-800',
    teal: 'bg-teal-200 dark:bg-teal-800',
  };

  const textClasses = {
    emerald: 'text-emerald-600 dark:text-emerald-300',
    blue: 'text-blue-600 dark:text-blue-300',
    purple: 'text-purple-600 dark:text-purple-300',
    amber: 'text-amber-600 dark:text-amber-300',
    red: 'text-red-600 dark:text-red-300',
    teal: 'text-teal-600 dark:text-teal-300',
  };

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color]} border`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-xs ${textClasses[color]} mb-1`}>{title}</p>
            <p className="text-xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend && trendValue && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trendValue}
              </div>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${iconBgClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Comparison Card Component
function ComparisonCard({
  title,
  currentValue,
  previousValue,
  format = 'number',
  icon,
}: {
  title: string;
  currentValue: number;
  previousValue: number;
  format?: 'number' | 'currency';
  icon?: React.ReactNode;
}) {
  const diff = currentValue - previousValue;
  const percentChange = previousValue > 0 ? ((diff / previousValue) * 100).toFixed(1) : 0;
  const isPositive = diff >= 0;

  const formatValue = (val: number) => {
    if (format === 'currency') return formatCurrency(val);
    return formatNumber(val);
  };

  return (
    <div className="p-4 rounded-lg bg-muted/50 border">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold">{formatValue(currentValue)}</p>
          <p className="text-xs text-muted-foreground">الفترة الحالية</p>
        </div>
        <div className="text-left">
          <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span className="font-bold">{Math.abs(Number(percentChange))}%</span>
          </div>
          <p className="text-xs text-muted-foreground">الفترة السابقة: {formatValue(previousValue)}</p>
        </div>
      </div>
      <Progress
        value={previousValue > 0 ? Math.min((currentValue / previousValue) * 100, 100) : 100}
        className="mt-3 h-2"
      />
    </div>
  );
}

// Agent Performance Component
function AgentPerformanceCard({ agent, rank }: { agent: AgentStat; rank: number }) {
  const medalColors = ['bg-amber-500', 'bg-gray-400', 'bg-amber-700'];
  const medalBg = ['bg-amber-50 border-amber-200', 'bg-gray-50 border-gray-200', 'bg-amber-50 border-amber-200'];

  return (
    <div className={`p-3 rounded-lg border ${rank <= 3 ? medalBg[rank - 1] : 'bg-muted/30'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${rank <= 3 ? medalColors[rank - 1] : 'bg-gray-300'}`}>
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{agent.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatNumber(agent.pieces)} حبة</span>
            <span>•</span>
            <span>{agent.shipments || 0} شحنة</span>
          </div>
        </div>
        <div className="text-left">
          <p className="font-bold text-emerald-600">{formatCurrency(agent.fees)}</p>
          <p className={`text-xs ${agent.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {agent.balance > 0 ? 'عليه ' + formatCurrency(agent.balance) : 'له ' + formatCurrency(Math.abs(agent.balance))}
          </p>
        </div>
      </div>
    </div>
  );
}

// Insights Component
function InsightsSection({ data }: { data: AnalyticsData }) {
  const insights = [];

  // Calculate insights
  const avgPiecesPerShipment = data.summary.totalShipments > 0
    ? data.summary.totalPieces / data.summary.totalShipments
    : 0;

  const avgFeePerPiece = data.summary.totalPieces > 0
    ? data.summary.totalFees / data.summary.totalPieces
    : 0;

  const profitMargin = data.summary.totalFees > 0
    ? ((data.summary.netProfit / data.summary.totalFees) * 100).toFixed(1)
    : 0;

  // Top performing day
  const topDay = data.dailyStats.reduce(
    (max, d) => d.fees > max.fees ? d : max,
    { fees: 0, date: '', pieces: 0, shipments: 0 }
  );

  // Generate insights
  if (data.summary.netProfit > 0) {
    insights.push({
      type: 'success',
      icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
      title: 'ربح إيجابي',
      description: `صافي الربح ${formatCurrency(data.summary.netProfit)} بنسبة هامش ${profitMargin}%`,
    });
  } else {
    insights.push({
      type: 'warning',
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      title: 'انتبه للمصاريف',
      description: `المصاريف تتجاوز الإيرادات بـ ${formatCurrency(Math.abs(data.summary.netProfit))}`,
    });
  }

  if (data.summary.totalAgentDebts > 0) {
    insights.push({
      type: 'info',
      icon: <Users className="h-4 w-4 text-blue-500" />,
      title: 'ديون الوكلاء',
      description: `إجمالي ديون الوكلاء ${formatCurrency(data.summary.totalAgentDebts)}`,
    });
  }

  if (topDay.date) {
    insights.push({
      type: 'success',
      icon: <Zap className="h-4 w-4 text-amber-500" />,
      title: 'أفضل يوم',
      description: `${formatDate(topDay.date)} بإيرادات ${formatCurrency(topDay.fees)}`,
    });
  }

  insights.push({
    type: 'info',
    icon: <Target className="h-4 w-4 text-purple-500" />,
    title: 'متوسط الأداء',
    description: `${formatNumber(Math.round(avgPiecesPerShipment))} حبة/شحنة • ${avgFeePerPiece.toFixed(2)} ريال/حبة`,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          رؤى وتوصيات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div key={index} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
              <div className="mt-0.5">{insight.icon}</div>
              <div>
                <p className="font-medium text-sm">{insight.title}</p>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('month');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [comparisonData, setComparisonData] = useState<AnalyticsData | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Auth check
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

  // Load analytics data
  const loadData = useCallback(async () => {
    try {
      const token = localStorage.getItem('session_token');

      const response = await fetch(`/api/reports/detailed?period=${period}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch data');

      const result = await response.json();
      setData(result);

      // Load comparison data (previous period)
      let prevPeriod = 'all';
      if (period === 'day') prevPeriod = 'day';
      else if (period === 'week') prevPeriod = 'month';
      else if (period === 'month') prevPeriod = 'year';
      else prevPeriod = 'all';

      const compareResponse = await fetch(`/api/reports/detailed?period=${prevPeriod}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (compareResponse.ok) {
        const compareResult = await compareResponse.json();
        setComparisonData(compareResult);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      loadData();
    }
  }, [user, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!reportRef.current || !data) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير التحليلات - نظام محاسبة القات</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; padding: 20px; background: white; color: #333; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #10b981; }
          .header h1 { color: #10b981; font-size: 24px; margin-bottom: 10px; }
          .header p { color: #666; font-size: 14px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
          .summary-card h3 { color: #64748b; font-size: 12px; margin-bottom: 8px; }
          .summary-card p { color: #10b981; font-size: 20px; font-weight: bold; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #1e293b; font-size: 18px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th, td { padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; }
          th { background: #f8fafc; color: #64748b; font-weight: 600; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>تقرير التحليلات</h1>
          <p>نظام محاسبة القات - ${new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <h3>إجمالي الشحنات</h3>
            <p>${formatNumber(data.summary.totalShipments)}</p>
          </div>
          <div class="summary-card">
            <h3>إجمالي الحبات</h3>
            <p>${formatNumber(data.summary.totalPieces)}</p>
          </div>
          <div class="summary-card">
            <h3>إجمالي الإيرادات</h3>
            <p>${formatCurrency(data.summary.totalFees)}</p>
          </div>
          <div class="summary-card">
            <h3>صافي الربح</h3>
            <p>${formatCurrency(data.summary.netProfit)}</p>
          </div>
        </div>

        <div class="section">
          <h2>أنواع القات</h2>
          <table>
            <thead>
              <tr>
                <th>النوع</th>
                <th>الحبات</th>
                <th>الإيرادات</th>
                <th>النسبة</th>
              </tr>
            </thead>
            <tbody>
              ${data.khatTypes.map(kt => `
                <tr>
                  <td>${kt.name}</td>
                  <td>${formatNumber(kt.pieces)}</td>
                  <td>${formatCurrency(kt.fees)}</td>
                  <td>${kt.percentage}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>الوكلاء</h2>
          <table>
            <thead>
              <tr>
                <th>الوكيل</th>
                <th>الحبات</th>
                <th>الإيرادات</th>
                <th>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              ${data.agents.slice(0, 10).map(a => `
                <tr>
                  <td>${a.name}</td>
                  <td>${formatNumber(a.pieces)}</td>
                  <td>${formatCurrency(a.fees)}</td>
                  <td style="color: ${a.balance > 0 ? '#ef4444' : '#10b981'}">${formatCurrency(Math.abs(a.balance))} ${a.balance > 0 ? 'عليه' : 'له'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>تم إنشاء هذا التقرير تلقائياً بواسطة نظام محاسبة القات</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
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
      <div className="space-y-4 sm:space-y-6" ref={reportRef}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
              التحليلات والرؤى
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="الفترة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">اليوم</SelectItem>
                <SelectItem value="week">هذا الأسبوع</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
                <SelectItem value="year">هذه السنة</SelectItem>
                <SelectItem value="all">كل الفترات</SelectItem>
              </SelectContent>
            </Select>
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
              variant="default"
              size="sm"
              onClick={handleExportPDF}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              تصدير PDF
            </Button>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <PerformanceCard
            title="إجمالي الشحنات"
            value={formatNumber(data?.summary.totalShipments || 0)}
            icon={<Package className="h-5 w-5 text-emerald-600" />}
            color="emerald"
          />
          <PerformanceCard
            title="إجمالي الحبات"
            value={formatNumber(data?.summary.totalPieces || 0)}
            icon={<Leaf className="h-5 w-5 text-green-600" />}
            color="teal"
          />
          <PerformanceCard
            title="إجمالي الإيرادات"
            value={formatCurrency(data?.summary.totalFees || 0)}
            icon={<DollarSign className="h-5 w-5 text-blue-600" />}
            color="blue"
          />
          <PerformanceCard
            title="إجمالي المصاريف"
            value={formatCurrency(data?.summary.totalExpenses || 0)}
            icon={<TrendingDown className="h-5 w-5 text-red-600" />}
            color="red"
          />
          <PerformanceCard
            title="صافي الربح"
            value={formatCurrency(data?.summary.netProfit || 0)}
            icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
            color={data?.summary.netProfit && data.summary.netProfit >= 0 ? 'emerald' : 'red'}
          />
          <PerformanceCard
            title="ديون الوكلاء"
            value={formatCurrency(data?.summary.totalAgentDebts || 0)}
            icon={<Users className="h-5 w-5 text-purple-600" />}
            color="purple"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="shipments">الشحنات</TabsTrigger>
            <TabsTrigger value="revenue">الإيرادات</TabsTrigger>
            <TabsTrigger value="agents">الوكلاء</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Period Comparison */}
            {comparisonData && (
              <Card>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">مقارنة الفترات</CardTitle>
                  </div>
                  <CardDescription>مقارنة الأداء مع الفترة السابقة</CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ComparisonCard
                      title="الشحنات"
                      currentValue={data?.summary.totalShipments || 0}
                      previousValue={comparisonData.summary.totalShipments}
                      format="number"
                      icon={<Package className="h-4 w-4 text-emerald-600" />}
                    />
                    <ComparisonCard
                      title="الحبات"
                      currentValue={data?.summary.totalPieces || 0}
                      previousValue={comparisonData.summary.totalPieces}
                      format="number"
                      icon={<Leaf className="h-4 w-4 text-teal-600" />}
                    />
                    <ComparisonCard
                      title="الإيرادات"
                      currentValue={data?.summary.totalFees || 0}
                      previousValue={comparisonData.summary.totalFees}
                      format="currency"
                      icon={<DollarSign className="h-4 w-4 text-blue-600" />}
                    />
                    <ComparisonCard
                      title="صافي الربح"
                      currentValue={data?.summary.netProfit || 0}
                      previousValue={comparisonData.summary.netProfit}
                      format="currency"
                      icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid lg:grid-cols-3 gap-4">
              {/* Insights */}
              <div className="lg:col-span-1">
                {data && <InsightsSection data={data} />}
              </div>

              {/* Top Agents */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        أفضل الوكلاء أداءً
                      </CardTitle>
                      <Badge variant="outline">{data?.agents?.length || 0} وكيل</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {data?.agents?.slice(0, 10).map((agent, index) => (
                          <AgentPerformanceCard key={agent.id} agent={agent} rank={index + 1} />
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Shipments Tab */}
          <TabsContent value="shipments">
            <ShipmentsChart
              data={data?.dailyStats || []}
              khatTypes={data?.khatTypes || []}
              agents={data?.agents || []}
              title="تحليل الشحنات"
              description="إحصائيات تفصيلية للشحنات والحبات عبر الفترة المحددة"
            />
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue">
            <RevenueChart
              data={data?.dailyStats || []}
              expenses={data?.summary.totalExpenses || 0}
              title="تحليل الإيرادات"
              description="تطور الإيرادات والأرباح عبر الفترة المحددة"
              showComparison={!!comparisonData}
              previousPeriodData={comparisonData?.dailyStats || []}
              period={period}
            />
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-4">
            {/* Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-200">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-emerald-600">وكلاء برصيد صفر</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {data?.agents?.filter(a => a.balance === 0).length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-200">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-red-600">وكلاء عليهم ديون</p>
                      <p className="text-2xl font-bold text-red-700">
                        {data?.agents?.filter(a => a.balance > 0).length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-200">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-green-600">وكلاء لهم رصيد</p>
                      <p className="text-2xl font-bold text-green-700">
                        {data?.agents?.filter(a => a.balance < 0).length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Agents List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-5 w-5 text-purple-600" />
                  قائمة الوكلاء التفصيلية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {data?.agents?.map((agent, index) => (
                      <AgentPerformanceCard key={agent.id} agent={agent} rank={index + 1} />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>آخر تحديث: {new Date().toLocaleString('ar-SA')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>الفترة: {period === 'all' ? 'كل الفترات' : period === 'day' ? 'اليوم' : period === 'week' ? 'هذا الأسبوع' : period === 'month' ? 'هذا الشهر' : 'هذه السنة'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
