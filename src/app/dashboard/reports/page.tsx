'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Loader2,
  Download,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Calendar,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Truck,
  Leaf,
  Printer,
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
  FileSpreadsheet,
  File,
  BarChart3,
  PieChart,
  RefreshCw,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { ShipmentsChart } from '@/components/charts/shipments-chart';

// Types
interface User {
  id: string;
  username: string;
  role: string;
}

interface KhatDetailItem {
  khatType: string;
  pieces: number;
  feePerPiece: number;
  totalFee: number;
}

interface ShipmentItemDetail {
  farmerName: string;
  farmerAlias: string;
  agentName: string;
  khatDetails: KhatDetailItem[];
  totalPieces: number;
  totalFee: number;
}

interface ShipmentDetail {
  id: string;
  date: string;
  status: string;
  userName: string;
  items: ShipmentItemDetail[];
  totalPieces: number;
  totalFee: number;
}

interface FarmerDetail {
  id: string;
  name: string;
  pieces: number;
  fees: number;
  debt: number;
  shipments: number;
  agents: { name: string; pieces: number; fees: number }[];
  khatTypes: { name: string; pieces: number; fees: number }[];
}

interface AgentDetail {
  id: string;
  name: string;
  pieces: number;
  fees: number;
  balance: number;
  shipments: number;
  farmers: { name: string; pieces: number; fees: number }[];
  khatTypes: { name: string; pieces: number; fees: number }[];
}

interface KhatTypeDetail {
  name: string;
  pieces: number;
  fees: number;
  percentage: number;
  avgFeePerPiece: number;
  farmers: { name: string; pieces: number; fees: number }[];
  agents: { name: string; pieces: number; fees: number }[];
}

interface FullReport {
  success: boolean;
  reportType: string;
  period: string;
  dateRange: { from?: string; to?: string };
  summary: {
    totalShipments: number;
    totalPieces: number;
    totalFees: number;
    totalExpenses: number;
    netProfit: number;
    totalAgentDebts: number;
    farmerDebts: number;
  };
  shipments: ShipmentDetail[];
  farmers: FarmerDetail[];
  agents: AgentDetail[];
  khatTypes: KhatTypeDetail[];
  dailyStats: { date: string; pieces: number; fees: number; shipments: number }[];
  expenses: {
    total: number;
    byCategory: { name: string; value: number }[];
    list: { id: string; description: string; amount: number; category: string; date: string }[];
  };
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const chartConfig = {
  pieces: { label: 'الحبات', color: '#10b981' },
  fees: { label: 'الأجرة', color: '#3b82f6' },
  shipments: { label: 'الشحنات', color: '#8b5cf6' },
} satisfies ChartConfig;

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<FullReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [period, setPeriod] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [farmerFilter, setFarmerFilter] = useState<string>('');
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [transporterFilter, setTransporterFilter] = useState<string>('');
  const [deliveryPersonFilter, setDeliveryPersonFilter] = useState<string>('');

  // Filter options
  const [farmers, setFarmers] = useState<{ id: string; name: string }[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [transporters, setTransporters] = useState<{ id: string; name: string }[]>([]);
  const [deliveryPersons, setDeliveryPersons] = useState<{ id: string; name: string }[]>([]);

  // Expanded states
  const [expandedFarmer, setExpandedFarmer] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [expandedKhatType, setExpandedKhatType] = useState<string | null>(null);

  // Export dialog
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('excel');
  const [exportType, setExportType] = useState<'general' | 'shipments' | 'farmers' | 'agents' | 'khat-types'>('general');

  // Check auth
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');

    if (userData && token) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/';
    }
  }, []);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [farmersRes, agentsRes, transportersRes, deliveryPersonsRes] = await Promise.all([
          fetch('/api/farmers'),
          fetch('/api/agents'),
          fetch('/api/transporters'),
          fetch('/api/delivery-persons'),
        ]);

        if (farmersRes.ok) {
          const farmersData = await farmersRes.json();
          setFarmers(farmersData.map((f: { id: string; name: string }) => ({ id: f.id, name: f.name })));
        }
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          setAgents(agentsData.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })));
        }
        if (transportersRes.ok) {
          const transportersData = await transportersRes.json();
          setTransporters(transportersData.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })));
        }
        if (deliveryPersonsRes.ok) {
          const deliveryPersonsData = await deliveryPersonsRes.json();
          setDeliveryPersons(deliveryPersonsData.map((d: { id: string; name: string }) => ({ id: d.id, name: d.name })));
        }
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    };

    if (user) {
      loadFilterOptions();
    }
  }, [user]);

  // Load data
  const loadData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('type', 'general');
      params.append('period', period);
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);

      const res = await fetch(`/api/reports/full?${params.toString()}`);

      if (!res.ok) throw new Error('فشل في تحميل التقارير');

      const reportData = await res.json();
      setData(reportData);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError('فشل في تحميل التقارير');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, dateFrom, dateTo]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-YE', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ريال';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Reset filters
  const resetFilters = () => {
    setPeriod('all');
    setDateFrom('');
    setDateTo('');
    setFarmerFilter('');
    setAgentFilter('');
    setTransporterFilter('');
    setDeliveryPersonFilter('');
  };

  // Quick period buttons
  const quickPeriods = [
    { key: 'day', label: 'اليوم' },
    { key: 'week', label: 'هذا الأسبوع' },
    { key: 'month', label: 'هذا الشهر' },
    { key: 'year', label: 'هذه السنة' },
    { key: 'all', label: 'الكل' },
  ];

  // Export function
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('format', exportFormat);
      params.append('type', exportType);
      params.append('period', period);
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);
      if (farmerFilter) params.append('farmerId', farmerFilter);
      if (agentFilter) params.append('agentId', agentFilter);
      if (transporterFilter) params.append('transporterId', transporterFilter);
      if (deliveryPersonFilter) params.append('deliveryPersonId', deliveryPersonFilter);

      const response = await fetch(`/api/export?${params.toString()}`);

      if (!response.ok) throw new Error('فشل في التصدير');

      if (exportFormat === 'pdf') {
        // PDF is returned as HTML for printing
        const html = await response.text();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
        }
      } else {
        // Download file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'تقرير';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }

      setShowExportDialog(false);
    } catch (err) {
      console.error('Export error:', err);
      alert('فشل في تصدير البيانات');
    }
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (!data?.dailyStats) return [];
    return data.dailyStats.map(stat => ({
      ...stat,
      date: formatShortDate(stat.date),
    }));
  };

  const prepareKhatTypesPieData = () => {
    if (!data?.khatTypes) return [];
    return data.khatTypes.slice(0, 8).map((kt, index) => ({
      name: kt.name,
      value: kt.pieces,
      fill: COLORS[index % COLORS.length],
    }));
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">التقارير والتصدير</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                تقارير شاملة مع إمكانية التصدير والطباعة
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-2 no-print">
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Button onClick={() => setShowExportDialog(true)} size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 no-print">
              <Download className="h-4 w-4" />
              تصدير
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="no-print">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">الفلاتر</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-xs">
                <RotateCcw className="h-3 w-3" />
                إعادة تعيين
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Period */}
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">الفترة:</span>
              <div className="flex flex-wrap gap-2">
                {quickPeriods.map(p => (
                  <Button
                    key={p.key}
                    variant={period === p.key ? 'default' : 'outline'}
                    size="sm"
                    className={period === p.key ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                    onClick={() => { setPeriod(p.key); setDateFrom(''); setDateTo(''); }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">من:</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPeriod('all'); }}
                  className="w-36"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="dateTo" className="text-xs text-muted-foreground">إلى:</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPeriod('all'); }}
                  className="w-36"
                />
              </div>
            </div>

            {/* Entity Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">المزارع</Label>
                <Select value={farmerFilter} onValueChange={setFarmerFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="جميع المزارعين" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع المزارعين</SelectItem>
                    {farmers.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">الوكيل</Label>
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="جميع الوكلاء" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع الوكلاء</SelectItem>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">الناقل</Label>
                <Select value={transporterFilter} onValueChange={setTransporterFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="جميع الناقلين" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع الناقلين</SelectItem>
                    {transporters.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">الموصل</Label>
                <Select value={deliveryPersonFilter} onValueChange={setDeliveryPersonFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="جميع الموصلين" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع الموصلين</SelectItem>
                    {deliveryPersons.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading/Error */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950">
            <CardContent className="py-8 text-center text-red-600">
              {error}
            </CardContent>
          </Card>
        )}

        {!loading && !error && data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">الشحنات</p>
                      <p className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-300">
                        {data.summary.totalShipments}
                      </p>
                    </div>
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400">إجمالي الحبات</p>
                      <p className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-300">
                        {data.summary.totalPieces?.toLocaleString('ar-YE') || 0}
                      </p>
                    </div>
                    <Leaf className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-600 dark:text-green-400">إجمالي الأجور</p>
                      <p className="text-lg sm:text-xl font-bold text-green-700 dark:text-green-300">
                        {formatCurrency(data.summary.totalFees)}
                      </p>
                    </div>
                    <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className={`bg-gradient-to-br ${data.summary.netProfit >= 0 ? 'from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900 border-teal-200 dark:border-teal-800' : 'from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800'}`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs ${data.summary.netProfit >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        صافي الربح
                      </p>
                      <p className={`text-lg sm:text-xl font-bold ${data.summary.netProfit >= 0 ? 'text-teal-700 dark:text-teal-300' : 'text-orange-700 dark:text-orange-300'}`}>
                        {formatCurrency(data.summary.netProfit)}
                      </p>
                    </div>
                    {data.summary.netProfit >= 0 ? (
                      <ArrowUpRight className="h-6 w-6 sm:h-8 sm:w-8 text-teal-500 opacity-50" />
                    ) : (
                      <ArrowDownRight className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 opacity-50" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full max-w-lg grid-cols-4">
                <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                <TabsTrigger value="shipments">الشحنات</TabsTrigger>
                <TabsTrigger value="revenue">الإيرادات</TabsTrigger>
                <TabsTrigger value="details">التفاصيل</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid lg:grid-cols-2 gap-4">
                  {/* Daily Stats Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-emerald-600" />
                        <CardTitle className="text-base">الإحصائيات اليومية</CardTitle>
                      </div>
                      <CardDescription>تطور الشحنات والحبات عبر الفترة</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-72 w-full">
                        <AreaChart data={prepareChartData()}>
                          <defs>
                            <linearGradient id="colorPieces" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
                          <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Area type="monotone" dataKey="pieces" name="الحبات" stroke="#10b981" fillOpacity={1} fill="url(#colorPieces)" />
                        </AreaChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Khat Types Pie Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-purple-600" />
                        <CardTitle className="text-base">توزيع أنواع القات</CardTitle>
                      </div>
                      <CardDescription>نسبة كل نوع من إجمالي الحبات</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-72 w-full">
                        <RechartsPieChart>
                          <Pie
                            data={prepareKhatTypesPieData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {prepareKhatTypesPieData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </RechartsPieChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-red-600 dark:text-red-400">المصاريف</p>
                          <p className="text-xl font-bold text-red-700 dark:text-red-300">
                            {formatCurrency(data.summary.totalExpenses)}
                          </p>
                        </div>
                        <TrendingDown className="h-8 w-8 text-red-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-purple-600 dark:text-purple-400">ديون الوكلاء</p>
                          <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                            {formatCurrency(data.summary.totalAgentDebts)}
                          </p>
                        </div>
                        <Users className="h-8 w-8 text-purple-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-amber-600 dark:text-amber-400">ديون المزارعين</p>
                          <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                            {formatCurrency(data.summary.farmerDebts)}
                          </p>
                        </div>
                        <Wallet className="h-8 w-8 text-amber-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Shipments Tab */}
              <TabsContent value="shipments">
                <ShipmentsChart
                  data={data.dailyStats || []}
                  khatTypes={data.khatTypes?.map(kt => ({
                    name: kt.name,
                    pieces: kt.pieces,
                    fees: kt.fees,
                    percentage: kt.percentage
                  })) || []}
                  agents={data.agents?.map(a => ({
                    id: a.id,
                    name: a.name,
                    pieces: a.pieces,
                    fees: a.fees,
                    shipments: a.shipments
                  })) || []}
                  title="تحليل الشحنات"
                  description="إحصائيات تفصيلية للشحنات والحبات"
                />
              </TabsContent>

              {/* Revenue Tab */}
              <TabsContent value="revenue">
                <RevenueChart
                  data={data.dailyStats || []}
                  expenses={data.summary.totalExpenses}
                  title="تحليل الإيرادات"
                  description="تطور الإيرادات والأرباح عبر الفترة"
                  period={period as 'day' | 'week' | 'month' | 'year' | 'all'}
                />
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4">
                {/* Farmers Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-5 w-5 text-green-600" />
                      تقرير المزارعين ({data.farmers?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background">
                          <tr className="border-b">
                            <th className="p-2 text-right font-medium">#</th>
                            <th className="p-2 text-right font-medium">المزارع</th>
                            <th className="p-2 text-center font-medium">الشحنات</th>
                            <th className="p-2 text-center font-medium">الحبات</th>
                            <th className="p-2 text-center font-medium">الأجور</th>
                            <th className="p-2 text-center font-medium">الديون</th>
                            <th className="p-2 text-center font-medium">التفاصيل</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.farmers?.map((farmer, index) => (
                            <>
                              <tr key={farmer.id} className="border-b hover:bg-muted/50">
                                <td className="p-2">{index + 1}</td>
                                <td className="p-2 font-medium">{farmer.name}</td>
                                <td className="p-2 text-center">{farmer.shipments}</td>
                                <td className="p-2 text-center">{farmer.pieces.toLocaleString('ar-YE')}</td>
                                <td className="p-2 text-center text-emerald-600 font-medium">{formatCurrency(farmer.fees)}</td>
                                <td className="p-2 text-center text-amber-600">{formatCurrency(farmer.debt)}</td>
                                <td className="p-2 text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpandedFarmer(expandedFarmer === farmer.id ? null : farmer.id)}
                                  >
                                    {expandedFarmer === farmer.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </Button>
                                </td>
                              </tr>
                              {expandedFarmer === farmer.id && (
                                <tr className="bg-muted/30">
                                  <td colSpan={7} className="p-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <p className="font-medium text-sm mb-2">الوكلاء:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {farmer.agents?.map((a, i) => (
                                            <Badge key={i} variant="outline" className="text-xs">
                                              {a.name}: {a.pieces} حبة
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm mb-2">أنواع القات:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {farmer.khatTypes?.map((kt, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">
                                              {kt.name}: {kt.pieces} حبة
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Agents Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-5 w-5 text-purple-600" />
                      تقرير الوكلاء ({data.agents?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background">
                          <tr className="border-b">
                            <th className="p-2 text-right font-medium">#</th>
                            <th className="p-2 text-right font-medium">الوكيل</th>
                            <th className="p-2 text-center font-medium">الشحنات</th>
                            <th className="p-2 text-center font-medium">الحبات</th>
                            <th className="p-2 text-center font-medium">الأجور</th>
                            <th className="p-2 text-center font-medium">الرصيد</th>
                            <th className="p-2 text-center font-medium">التفاصيل</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.agents?.map((agent, index) => (
                            <>
                              <tr key={agent.id} className="border-b hover:bg-muted/50">
                                <td className="p-2">{index + 1}</td>
                                <td className="p-2 font-medium">{agent.name}</td>
                                <td className="p-2 text-center">{agent.shipments}</td>
                                <td className="p-2 text-center">{agent.pieces.toLocaleString('ar-YE')}</td>
                                <td className="p-2 text-center text-emerald-600 font-medium">{formatCurrency(agent.fees)}</td>
                                <td className="p-2 text-center">
                                  <span className={agent.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                                    {formatCurrency(agent.balance)}
                                  </span>
                                </td>
                                <td className="p-2 text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
                                  >
                                    {expandedAgent === agent.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </Button>
                                </td>
                              </tr>
                              {expandedAgent === agent.id && (
                                <tr className="bg-muted/30">
                                  <td colSpan={7} className="p-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <p className="font-medium text-sm mb-2">المزارعين:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {agent.farmers?.map((f, i) => (
                                            <Badge key={i} variant="outline" className="text-xs">
                                              {f.name}: {f.pieces} حبة
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm mb-2">أنواع القات:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {agent.khatTypes?.map((kt, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">
                                              {kt.name}: {kt.pieces} حبة
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Khat Types Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-emerald-600" />
                      تقرير أنواع القات ({data.khatTypes?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background">
                          <tr className="border-b">
                            <th className="p-2 text-right font-medium">#</th>
                            <th className="p-2 text-right font-medium">النوع</th>
                            <th className="p-2 text-center font-medium">الحبات</th>
                            <th className="p-2 text-center font-medium">النسبة</th>
                            <th className="p-2 text-center font-medium">الأجور</th>
                            <th className="p-2 text-center font-medium">متوسط الأجرة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.khatTypes?.map((kt, index) => (
                            <tr key={kt.name} className="border-b hover:bg-muted/50">
                              <td className="p-2">{index + 1}</td>
                              <td className="p-2 font-medium">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  />
                                  {kt.name}
                                </div>
                              </td>
                              <td className="p-2 text-center">{kt.pieces.toLocaleString('ar-YE')}</td>
                              <td className="p-2 text-center">
                                <Badge variant="outline">{kt.percentage.toFixed(1)}%</Badge>
                              </td>
                              <td className="p-2 text-center text-emerald-600 font-medium">{formatCurrency(kt.fees)}</td>
                              <td className="p-2 text-center">{kt.avgFeePerPiece.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-emerald-600" />
                تصدير التقرير
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>صيغة التصدير</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={exportFormat === 'csv' ? 'default' : 'outline'}
                    className={exportFormat === 'csv' ? 'bg-emerald-600' : ''}
                    onClick={() => setExportFormat('csv')}
                  >
                    <File className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant={exportFormat === 'excel' ? 'default' : 'outline'}
                    className={exportFormat === 'excel' ? 'bg-emerald-600' : ''}
                    onClick={() => setExportFormat('excel')}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button
                    variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                    className={exportFormat === 'pdf' ? 'bg-emerald-600' : ''}
                    onClick={() => setExportFormat('pdf')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>نوع التقرير</Label>
                <Select value={exportType} onValueChange={(v) => setExportType(v as typeof exportType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">تقرير عام شامل</SelectItem>
                    <SelectItem value="shipments">تقرير الشحنات</SelectItem>
                    <SelectItem value="farmers">تقرير المزارعين</SelectItem>
                    <SelectItem value="agents">تقرير الوكلاء</SelectItem>
                    <SelectItem value="khat-types">تقرير أنواع القات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700">
                <Download className="h-4 w-4 mr-2" />
                تصدير
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
