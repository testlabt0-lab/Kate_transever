'use client';

import { useMemo } from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Calendar } from 'lucide-react';

// أنواع البيانات
interface DailyStat {
  date: string;
  pieces: number;
  fees: number;
  shipments: number;
}

interface RevenueChartProps {
  data: DailyStat[];
  expenses?: number;
  title?: string;
  description?: string;
  showComparison?: boolean;
  previousPeriodData?: DailyStat[];
  period?: 'day' | 'week' | 'month' | 'year' | 'all';
}

// ألوان الرسوم البيانية
const COLORS = {
  revenue: '#10b981', // emerald
  expenses: '#ef4444', // red
  profit: '#3b82f6', // blue
  previous: '#94a3b8', // slate
};

// إعدادات الرسم البياني
const chartConfig = {
  fees: {
    label: 'الإيرادات',
    color: COLORS.revenue,
  },
  expenses: {
    label: 'المصاريف',
    color: COLORS.expenses,
  },
  profit: {
    label: 'صافي الربح',
    color: COLORS.profit,
  },
  previousFees: {
    label: 'الفترة السابقة',
    color: COLORS.previous,
  },
} satisfies ChartConfig;

// تنسيق الأرقام
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ar-YE', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
};

const formatFullDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

// مكون البطاقة الإحصائية
function StatCard({
  title,
  value,
  trend,
  trendValue,
  icon,
  color = 'emerald'
}: {
  title: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: 'emerald' | 'red' | 'blue' | 'purple';
}) {
  const colorClasses = {
    emerald: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700',
    red: 'from-red-50 to-red-100 border-red-200 text-red-700',
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-700',
  };

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[color]} border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs opacity-80 mb-1">{title}</p>
          <p className="text-lg font-bold">{value}</p>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${
              trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> :
               trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
              {trendValue}
            </div>
          )}
        </div>
        {icon && <div className="opacity-50">{icon}</div>}
      </div>
    </div>
  );
}

export function RevenueChart({
  data,
  expenses = 0,
  title = 'الإيرادات',
  description = 'تطور الإيرادات عبر الفترة المحددة',
  showComparison = false,
  previousPeriodData = [],
  period = 'month',
}: RevenueChartProps) {
  // تحضير البيانات للرسم البياني
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const daysCount = data.length;
    const avgExpensesPerDay = daysCount > 0 ? expenses / daysCount : 0;

    return data.map((stat, index) => ({
      ...stat,
      date: formatDate(stat.date),
      fullDate: formatFullDate(stat.date),
      profit: stat.fees - avgExpensesPerDay,
      expenses: avgExpensesPerDay,
      previousFees: previousPeriodData[index]?.fees || 0,
    }));
  }, [data, expenses, previousPeriodData]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const totalRevenue = data.reduce((sum, d) => sum + d.fees, 0);
    const totalProfit = totalRevenue - expenses;
    const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0;
    const previousRevenue = previousPeriodData.reduce((sum, d) => sum + d.fees, 0);

    const revenueTrend = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    return {
      totalRevenue,
      totalProfit,
      avgRevenue,
      revenueTrend,
    };
  }, [data, expenses, previousPeriodData]);

  // أعلى أيام الإيرادات
  const topDays = useMemo(() => {
    return [...data]
      .sort((a, b) => b.fees - a.fees)
      .slice(0, 5)
      .map(d => ({
        date: formatFullDate(d.date),
        fees: d.fees,
      }));
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد بيانات كافية لعرض الرسم البياني</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="إجمالي الإيرادات"
          value={formatCurrency(stats.totalRevenue) + ' ريال'}
          trend={stats.revenueTrend > 0 ? 'up' : stats.revenueTrend < 0 ? 'down' : 'neutral'}
          trendValue={`${Math.abs(stats.revenueTrend).toFixed(1)}%`}
          icon={<DollarSign className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title="صافي الربح"
          value={formatCurrency(stats.totalProfit) + ' ريال'}
          icon={stats.totalProfit >= 0 ?
            <TrendingUp className="h-5 w-5" /> :
            <TrendingDown className="h-5 w-5" />
          }
          color={stats.totalProfit >= 0 ? 'blue' : 'red'}
        />
        <StatCard
          title="متوسط يومي"
          value={formatCurrency(stats.avgRevenue) + ' ريال'}
          icon={<Calendar className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          title="إجمالي المصاريف"
          value={formatCurrency(expenses) + ' ريال'}
          icon={<TrendingDown className="h-5 w-5" />}
          color="red"
        />
      </div>

      {/* الرسوم البيانية */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="area" className="space-y-4">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="area">مساحي</TabsTrigger>
              <TabsTrigger value="bar">أعمدة</TabsTrigger>
              <TabsTrigger value="comparison">مقارنة</TabsTrigger>
            </TabsList>

            {/* الرسم المساحي */}
            <TabsContent value="area">
              <ChartContainer config={chartConfig} className="h-80 w-full">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.revenue} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.revenue} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.profit} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.profit} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatCurrency}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(value, payload) => {
                      const data = payload?.[0]?.payload;
                      return data?.fullDate || value;
                    }}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="fees"
                    name="الإيرادات"
                    stroke={COLORS.revenue}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFees)"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="صافي الربح"
                    stroke={COLORS.profit}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                  />
                </AreaChart>
              </ChartContainer>
            </TabsContent>

            {/* رسم الأعمدة */}
            <TabsContent value="bar">
              <ChartContainer config={chartConfig} className="h-80 w-full">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatCurrency}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(value, payload) => {
                      const data = payload?.[0]?.payload;
                      return data?.fullDate || value;
                    }}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="fees"
                    name="الإيرادات"
                    fill={COLORS.revenue}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="المصاريف"
                    fill={COLORS.expenses}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </TabsContent>

            {/* مقارنة الفترات */}
            <TabsContent value="comparison">
              {showComparison && previousPeriodData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-80 w-full">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 11 }}
                      tickFormatter={formatCurrency}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      labelFormatter={(value, payload) => {
                        const data = payload?.[0]?.payload;
                        return data?.fullDate || value;
                      }}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="fees"
                      name="الفترة الحالية"
                      fill={COLORS.revenue}
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="previousFees"
                      name="الفترة السابقة"
                      stroke={COLORS.previous}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: COLORS.previous, r: 3 }}
                    />
                  </ComposedChart>
                </ChartContainer>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <p>لا توجد بيانات للمقارنة</p>
                  <p className="text-xs mt-2">اختر فترة مختلفة للمقارنة</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* أعلى أيام الإيرادات */}
      {topDays.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              أعلى أيام الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topDays.map((day, index) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600">#{index + 1}</span>
                    <span className="text-sm">{day.date}</span>
                  </div>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(day.fees)} ريال
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RevenueChart;
